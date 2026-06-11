'use client';

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

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

import Header                from './Header';
import StatsBar              from './StatsBar';
import Heatmap               from './Heatmap';
import Table                 from './Table';
import ReflectionModal       from './ReflectionModal';
import NotesModal            from './NotesModal';
import InitialSolveModal     from './InitialSolveModal';
import FlashcardMode         from './FlashcardMode';
import MiniInsights          from './MiniInsights';
import ProblemFilterToolbar  from './ProblemFilterToolbar';
import TableSkeleton         from './TableSkeleton';
import EmptyState            from './ui/EmptyState';

import { usePageInit }       from '../../hooks/usePageInit';
import { useModalHandlers }  from '../../hooks/useModalHandlers';
import { useFilterHandlers } from '../../hooks/useFilterHandlers';
import { useAppStore }       from '../../store/useAppStore';
import { useShallow }        from 'zustand/react/shallow';

import styles from '../page.module.css';

// Tab configuration driven by mode
const TRACKER_TABS = ['All', 'Solved', 'Attempted'];
const EXPLORE_TABS = ['All', 'Solved', 'Attempted', 'Unsolved'];

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
  const [activeNotesQ,        setActiveNotesQ]        = useState(null);
  const [activeReflectionQ,   setActiveReflectionQ]   = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [isFlashcardOpen,     setIsFlashcardOpen]     = useState(false);
  const [flashcardQuestions,  setFlashcardQuestions]  = useState([]);
  const [isCompactMode,       setIsCompactMode]       = useState(false);

  // ── Close all modals (bound to Escape key via usePageInit) ─────────────────
  const closeAllModals = useCallback(() => {
    setActiveNotesQ(null);
    setActiveReflectionQ(null);
    setActiveInitialSolveQ(null);
    setIsFlashcardOpen(false);
  }, []);

  // ── Notes save — stable callback, NOT an inline arrow in JSX ──────────────
  const handleSaveNotes = useCallback(
    (id, notes) => updateProgress(id, { notes }),
    [updateProgress],
  );

  // ── Page init: fetch data + wire Escape/⌘F shortcuts ──────────────────────
  usePageInit(mode, { onEscape: closeAllModals });

  // ── Modal handlers (solve, reflection, notes-open) ─────────────────────────
  const { handleSaveInitialSolve, handleSaveReflection, handleOpenNotes } =
    useModalHandlers({ setActiveInitialSolveQ, setActiveReflectionQ, setActiveNotesQ });

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
  const tabValues = tabLabels.map(t => t.toLowerCase() === 'all' ? 'all' : t);

  const activeTab = useMemo(() => {
    const idx = tabValues.indexOf(filters.status || 'all');
    return idx >= 0 ? idx : 0;
  }, [filters.status, tabValues]);

  const handleTabChange = useCallback(
    (idx) => setFilter('status', tabValues[idx] ?? 'all'),
    [setFilter, tabValues],
  );

  // ── Flashcard mode (Tracker only) ─────────────────────────────────────────
  const handleOpenFlashcards = useCallback(async () => {
    const qs = await openFlashcards();
    setFlashcardQuestions(qs || []);
    setIsFlashcardOpen(true);
  }, [openFlashcards]);

  // ── Derived: only show analytics section when there is activity ───────────
  const hasActivity =
    stats.solved > 0 ||
    (stats.activityTimeline && Object.keys(stats.activityTimeline).length > 0);

  // ── Reset action for error state ──────────────────────────────────────────
  const handleRetry = mode === 'tracker' ? resetToTrackerMode : resetToExploreMode;

  // ── Subtitle ──────────────────────────────────────────────────────────────
  const subtitle = isLoading && questions.length === 0
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
              <button
                className={styles.flashcardBtn}
                onClick={handleOpenFlashcards}
                disabled={stats.dueRevision === 0}
                title={stats.dueRevision === 0 ? 'No questions due for revision' : 'Start quick recall session'}
                aria-disabled={stats.dueRevision === 0}
              >
                ⚡ Quick Recall{stats.dueRevision > 0 ? ` (${stats.dueRevision})` : ''}
              </button>
            )}
            <Link href={navHref} className={styles.exploreLink}>
              {navLabel}
            </Link>
          </div>
        </div>

        {/* ── Streak panel + heatmap (Tracker only, when user has activity) */}
        {showStreaks && hasActivity && (
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
            authEnabled={authEnabled}
            patterns={patterns}
            isCompactMode={isCompactMode}
          />
        )}
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {activeInitialSolveQ && (
        <InitialSolveModal
          question={activeInitialSolveQ}
          patterns={patterns}
          onClose={() => setActiveInitialSolveQ(null)}
          onSave={handleSaveInitialSolve}
        />
      )}
      {activeNotesQ && (
        <NotesModal
          question={activeNotesQ}
          onClose={() => setActiveNotesQ(null)}
          onSave={handleSaveNotes}
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

      {/* ── Footer (Tracker only) ─────────────────────────────────────────── */}
      {mode === 'tracker' && (
        <footer className={styles.footer}>
          Made with <span className={styles.heart}>❤️</span> for the community.
        </footer>
      )}
    </div>
  );
}
