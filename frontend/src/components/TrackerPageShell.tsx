/**
 * TrackerPageShell — Shared page structure for Tracker (/) and Explore (/explore).
 *
 * Both pages are structurally identical — they differ only in:
 *   - The heading title / subtitle text
 *   - Whether to show status tabs (Tracker yes, Explore no)
 *   - Whether to show the flashcard button / streak panel (Tracker only)
 *   - The navigation link (Tracker → Explore, Explore → Tracker)
 *   - The init mode ('tracker' | 'explore')
 *   - The footer (Tracker has one, Explore omits it)
 *
 * All modal state and handlers are owned here so neither page needs to
 * duplicate them.
 *
 * Props:
 *   mode           'tracker' | 'explore'
 *   title          string
 *   navLabel       string   — label for the back/forward nav link
 *   navHref        string   — href for the nav link
 *   showTabs       boolean  — pass to ProblemFilterToolbar
 *   showStreaks     boolean  — show streak panel + flashcard button
 *   authEnabled    boolean
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { apiClient } from '../lib/api/apiClient';
import { usePageInit } from '../hooks/usePageInit';
import { useModalHandlers } from '../hooks/useModalHandlers';
import { useFilterHandlers } from '../hooks/useFilterHandlers';
import { useAppStore } from '../store/useAppStore';
import styles from '../pages/Tracker.module.css';

import Header from './Header';
import StatsBar from './StatsBar';
import Heatmap from './Heatmap';
import Table from './Table';
import ReflectionModal from './ReflectionModal';
import ActiveAttemptModal from './ActiveAttemptModal';
import WrapUpModal from './WrapUpModal';
import FlashcardMode from './FlashcardMode';
import FloatingGoalWidget from './FloatingGoalWidget';
import MiniInsights from './MiniInsights';
import ProblemFilterToolbar from './ProblemFilterToolbar';
import TableSkeleton from './TableSkeleton';
import EmptyState from './ui/EmptyState';
import CommentsPanel from './CommentsPanel';


// Tab configuration driven by mode
const TRACKER_TABS = ['All', 'Solved', 'Attempted', 'Favourites'];
const EXPLORE_TABS = ['All', 'Solved', 'Attempted', 'Unsolved', 'Added', 'Favourites'];

export default function TrackerPageShell({
  mode,
  title,
  navLabel,
  navHref,
  showTabs = true,
  showStreaks = false,
  authEnabled,
}) {
  const {
    questions,
    isLoading,
    error,
    filters,
    setFilter,
    patterns,
    stats,
    fetchLightStats,
    resetToTrackerMode,
    resetToExploreMode,
    openFlashcards,
    updateProgress,
    settings,
  } = useAppStore(
    useShallow((state) => ({
      questions: state.questions,
      isLoading: state.isLoading,
      error: state.error,
      filters: state.filters,
      setFilter: state.setFilter,
      patterns: state.patterns,
      stats: state.stats,
      fetchLightStats: state.fetchLightStats,
      resetToTrackerMode: state.resetToTrackerMode,
      resetToExploreMode: state.resetToExploreMode,
      openFlashcards: state.openFlashcards,
      updateProgress: state.updateProgress,
      settings: state.settings,
    }))
  );

  // ── Local modal state ──────────────────────────────────────────────────────
  const navigate = useNavigate();
  const [activeCommentQ, setActiveCommentQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [activeAttemptQ, setActiveAttemptQ] = useState(null);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [flashcardQuestions, setFlashcardQuestions] = useState([]);

  useEffect(() => {
    if (mode === 'tracker' && !isLoading) {
      const today = new Date();
      if (today.getDay() === 1) {
        // Monday
        const lastSeenStr = localStorage.getItem('wrapUpLastSeen');
        const todayStr = today.toISOString().split('T')[0];
        if (lastSeenStr !== todayStr) {
          setShowWrapUp(true);
        }
      }
    }
  }, [mode, isLoading]);

  const closeWrapUp = () => {
    setShowWrapUp(false);
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('wrapUpLastSeen', todayStr);
  };
  const [isCompactMode, setIsCompactMode] = useState(false);

  // ── Close all modals (bound to Escape key via usePageInit) ─────────────────
  const closeAllModals = useCallback(() => {
    setActiveReflectionQ(null);
    setActiveInitialSolveQ(null);
    setActiveAttemptQ(null);
    setIsFlashcardOpen(false);
  }, []);

  // ── Page init: fetch data + wire Escape/⌘F shortcuts ──────────────────────
  usePageInit(mode, { onEscape: closeAllModals });

  // ── Modal handlers (solve, reflection, notes-open) ─────────────────────────
  const { handleSaveInitialSolve, handleSaveReflection, handleOpenNotes } = useModalHandlers({
    setActiveInitialSolveQ,
    setActiveReflectionQ,
    navigate,
  });

  const handleAttemptFailed = useCallback(
    async (id, sessionSeconds) => {
      const q = questions.find((q) => q.id === id);
      if (!q) return;
      const oldSpent = q.progress?.timeSpent || 0;
      const oldAttempts = q.progress?.attempts || 0;
      await updateProgress(id, {
        status: 'Attempted',
        timeSpent: oldSpent + sessionSeconds,
        attempts: oldAttempts + 1,
      });
      setActiveAttemptQ(null);
    },
    [questions, updateProgress]
  );

  const handleAttemptSolved = useCallback(
    (id, sessionSeconds) => {
      const q = questions.find((q) => q.id === id);
      if (!q) return;

      // Pass the sessionSeconds to the initial solve modal state so it knows how much time was spent.
      // We add a temporary property to the question object to pass this data.
      const qWithTime = { ...q, sessionSeconds };
      setActiveAttemptQ(null);
      setActiveInitialSolveQ(qWithTime);
    },
    [questions]
  );

  // ── Filter handlers ────────────────────────────────────────────────────────
  const {
    handleFilterChange,
    handleClearFilters,
    allTags,
    allPatternNames,
    allPlatforms,
    allCompanyNames,
    toolbarFilters,
  } = useFilterHandlers();

  // ── Tab ↔ status filter (bidirectional) ────────────────────────────────────
  const tabLabels = mode === 'tracker' ? TRACKER_TABS : EXPLORE_TABS;
  // Map 'All' -> 'all', 'Solved' -> 'Solved', 'Attempted'/'Unsolved' stay as is
  const tabValues = tabLabels.map((t) => (t.toLowerCase() === 'all' ? 'all' : t));

  const activeTab = useMemo(() => {
    const idx = tabValues.indexOf(filters.status || 'all');
    return idx >= 0 ? idx : 0;
  }, [filters.status, tabValues]);

  const setFilters = useAppStore((state) => state.setFilters);

  const handleTabChange = useCallback(
    (idx) => {
      const newStatus = tabValues[idx] ?? 'all';
      if (newStatus.toLowerCase() === 'added') {
        setFilters({ status: newStatus, sortBy: 'additionTime', sortDirection: 'desc' });
      } else {
        setFilter('status', newStatus);
      }
    },
    [setFilter, setFilters, tabValues]
  );

  // ── Flashcard mode (Tracker only) ─────────────────────────────────────────
  const handleOpenFlashcards = useCallback(async () => {
    const qs = await openFlashcards();
    setFlashcardQuestions(qs || []);
    setIsFlashcardOpen(true);
  }, [openFlashcards]);

  // ── Derived: only show analytics section when there is activity ───────────
  const hasActivity =
    stats.totalSolved > 0 ||
    stats.totalAttempted > 0 ||
    (stats.activityTimeline && Object.keys(stats.activityTimeline).length > 0) ||
    true; // Always show analytics so the user sees their streaks even when starting out

  // ── Reset action for error state ──────────────────────────────────────────
  const handleRetry = mode === 'tracker' ? resetToTrackerMode : resetToExploreMode;

  // ── Subtitle ──────────────────────────────────────────────────────────────
  const subtitle =
    isLoading && questions.length === 0
      ? 'Loading…'
      : `${questions.length} question${questions.length !== 1 ? 's' : ''}${mode === 'explore' ? ' found' : ''}`;

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        {/* ── Page heading + nav link ──────────────────────────────────── */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <div className={styles.headerActions}>
            {showStreaks && (
              <>
                <button
                  className={styles.flashcardBtn}
                  onClick={() => setShowWrapUp(true)}
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    marginRight: '8px',
                  }}
                >
                  🎉 Weekly Wrap-Up
                </button>
                <button
                  className={styles.flashcardBtn}
                  onClick={handleOpenFlashcards}
                  disabled={stats.dueRevision === 0}
                  title={
                    stats.dueRevision === 0
                      ? 'No questions due for revision'
                      : 'Start quick recall session'
                  }
                  aria-disabled={stats.dueRevision === 0}
                >
                  ⚡ Quick Recall{stats.dueRevision > 0 ? ` (${stats.dueRevision})` : ''}
                </button>
              </>
            )}
            <Link to={navHref} className={styles.exploreLink}>
              {navLabel}
            </Link>
          </div>
        </div>

        {/* ── Streak panel + heatmap (Tracker only) */}
        {showStreaks && (
          <div className={styles.analyticsHub}>
            <div className={styles.streakPanel}>
              <div className={styles.streakBox}>
                <span className={styles.streakLabel}>Current Streak</span>
                <span className={styles.streakValue}>{stats.currentStreak || 0} 🔥</span>
              </div>
              <div className={styles.streakBox}>
                <span className={styles.streakLabel}>Max Streak</span>
                <span className={styles.streakValue}>{stats.maxStreak || 0} ⚡</span>
              </div>
              <div className={styles.streakBox}>
                <span className={styles.streakLabel}>This Week</span>
                <span className={styles.streakValue}>{stats.weeklyCount || 0} 🎯</span>
              </div>
            </div>
            <div className={styles.insightsContainer}>
              <div className={styles.heatmapWrapper}>
                <Heatmap data={stats.activityTimeline || {}} settings={settings} />
              </div>
              <MiniInsights questions={questions} stats={stats} />
            </div>
          </div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <StatsBar
          stats={stats}
          total={questions.length}
          title={mode === 'tracker' ? 'Tracker Stats' : 'Explore Stats'}
          secondLabel={mode === 'tracker' ? 'DUE REVISION' : 'SHOWING'}
          secondValue={mode === 'tracker' ? stats.dueRevision : questions.length}
        />

        {/* ── Filter toolbar ─────────────────────────────────────────────── */}
        <ProblemFilterToolbar
          showTabs={showTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          filters={toolbarFilters}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
          tags={allTags}
          patterns={allPatternNames}
          platforms={allPlatforms}
          companies={allCompanyNames}
          tabs={tabLabels}
        />

        {/* ── Compact / detailed view toggle ───────────────────────────── */}
        <div className={styles.viewToggleRow}>
          <button
            className={styles.compactToggleBtn}
            onClick={() => setIsCompactMode((v) => !v)}
            aria-pressed={isCompactMode}
          >
            {isCompactMode ? '⊞ Detailed View' : '⊟ Compact View'}
          </button>
        </div>

        {/* ── Table / loading / empty / error states ─────────────────────── */}
        {error ? (
          <EmptyState
            message={error}
            subtext="Is the mock server running? Try: make dev"
            actionLabel="Retry"
            onAction={handleRetry}
          />
        ) : isLoading && questions.length === 0 ? (
          <TableSkeleton rows={10} />
        ) : questions.length === 0 ? (
          <EmptyState
            icon="🔍"
            message="No questions match your filters."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        ) : (
          <Table
            onOpenReflection={setActiveReflectionQ}
            onOpenInitialSolve={setActiveInitialSolveQ}
            onOpenNotes={handleOpenNotes}
            onOpenComments={setActiveCommentQ}
            onOpenAttempt={setActiveAttemptQ}
            authEnabled={authEnabled}
            patterns={patterns}
            isCompactMode={isCompactMode}
          />
        )}
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showWrapUp && <WrapUpModal onClose={closeWrapUp} />}
      {activeAttemptQ && (
        <ActiveAttemptModal
          question={activeAttemptQ}
          onClose={() => setActiveAttemptQ(null)}
          onFailed={handleAttemptFailed}
          onSolved={handleAttemptSolved}
        />
      )}
      {activeInitialSolveQ && (
        <InitialSolveModal
          question={activeInitialSolveQ}
          patterns={patterns}
          onClose={() => setActiveInitialSolveQ(null)}
          onSave={handleSaveInitialSolve}
        />
      )}
      {activeCommentQ && (
        <CommentsPanel
          question={activeCommentQ}
          apiClient={apiClient}
          onClose={() => setActiveCommentQ(null)}
        />
      )}
      {activeReflectionQ && (
        <ReflectionModal
          question={activeReflectionQ}
          patterns={patterns}
          onClose={() => setActiveReflectionQ(null)}
          onSave={handleSaveReflection}
        />
      )}
      {isFlashcardOpen && (
        <FlashcardMode
          questions={flashcardQuestions}
          onClose={() => setIsFlashcardOpen(false)}
          onBulkSave={async (updates) => {
            if (updates?.length) {
              await useAppStore.getState().bulkUpdateProgress(updates);
              fetchLightStats();
            }
            setIsFlashcardOpen(false);
          }}
        />
      )}

      {/* ── Floating Goal Widget ────────────────────────────────────────────── */}
      {authEnabled && <FloatingGoalWidget />}
    </div>
  );
}
