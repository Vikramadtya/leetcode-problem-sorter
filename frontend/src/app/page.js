'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Heatmap from './components/Heatmap';
import Table from './components/Table';
import ReflectionModal from './components/ReflectionModal';
import NotesModal from './components/NotesModal';
import InitialSolveModal from './components/InitialSolveModal';
import FlashcardMode from './components/FlashcardMode';
import styles from './page.module.css';
import { useAppStore } from '../store/useAppStore';
import config from '../config.json';
import { apiClient } from '../lib/api/apiClient';

export default function Home() {
  const { data: session } = useSession();

  const {
    questions,
    isLoading,
    filters,
    setFilter,
    setFilters,
    updateProgress,
    companies,
    patterns,
    stats,
    fetchUtilities,
    fetchLightStats,
    resetToTrackerMode,
  } = useAppStore();

  const authEnabled = config.features.authEnabled;

  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [flashcardQuestions, setFlashcardQuestions] = useState([]);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Initialise tracker mode on mount (once)
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    resetToTrackerMode();
    fetchUtilities();
    fetchLightStats(); // B-7 FIX: use lightweight stats endpoint, not /analytics
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
      if (e.key === 'Escape') {
        setActiveNotesQ(null);
        setActiveReflectionQ(null);
        setActiveInitialSolveQ(null);
        setIsFlashcardOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // No separate debounce needed — store.setFilter debounces internally

  // ----------------------------------------------------------------
  // InitialSolveModal save — server handles ALL computation
  // We just pass the raw intent and let the PATCH endpoint do the work.
  // ----------------------------------------------------------------
  const handleSaveInitialSolve = useCallback((id, { solutionLink, notes, pattern, memoryStrength }) => {
    updateProgress(id, {
      status: 'Solved',
      confidenceLevel: memoryStrength,
      notes: notes || '',
      pattern: pattern || '',
      solutionLink: solutionLink || '',
      // dateSolved and nextRevisionDate are computed server-side
    });
    setActiveInitialSolveQ(null);
    // fetchLightStats is called automatically by store.updateProgress after Solved
  }, [updateProgress]);

  // ----------------------------------------------------------------
  // ReflectionModal save
  // ----------------------------------------------------------------
  const handleSaveReflection = useCallback((id, { insight, pattern, memoryStrength }) => {
    const q = questions.find(q => q.id === id);
    const existingNotes = q?.progress?.notes || '';
    const updatedNotes = insight
      ? (existingNotes ? `${existingNotes}\n\n**Reflection:**\n${insight}` : `**Reflection:**\n${insight}`)
      : existingNotes;

    updateProgress(id, {
      revise: true,
      confidenceLevel: memoryStrength,
      notes: updatedNotes,
      pattern: pattern || q?.progress?.pattern || '',
      // nextRevisionDate computed by server from confidenceLevel
    });
    setActiveReflectionQ(null);
  }, [questions, updateProgress]);

  const handleOpenNotes = useCallback((q) => setActiveNotesQ(q), []);

  const openFlashcards = useCallback(async () => {
    try {
      const data = await apiClient.getQuestions({
        reviseFilter: true,
        trackerMode: true,
        limit: 1000,
      });
      setFlashcardQuestions(data.data || []);
      setIsFlashcardOpen(true);
    } catch (e) {
      console.error('[Flashcards] Failed to load:', e);
    }
  }, []);

  const hasActivity = stats.solved > 0 || (stats.activityTimeline && Object.keys(stats.activityTimeline).length > 0);

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Your Tracker</h1>
            <p className={styles.subtitle}>Tracked problems & custom questions.</p>
          </div>
          {authEnabled && session && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className={styles.flashcardBtn} onClick={openFlashcards}>
                ⚡ Quick Recall ({stats.dueRevision})
              </button>
              <Link href="/explore" className={styles.exploreLink}>
                Explore Global Questions
              </Link>
            </div>
          )}
        </div>

        {!session ? (
          <div className={styles.emptyState}>
            <p>Please Sign In to view your personal problem tracker.</p>
          </div>
        ) : (
          <>
            {/* Streak + Heatmap — shown once user has solved at least 1 question */}
            {authEnabled && hasActivity && (
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
                    <span className={styles.streakLabel}>Weekly Goal</span>
                    <span className={styles.streakValue}>{stats.weeklyCount || 0}/10 🎯</span>
                  </div>
                </div>
                <div className={styles.heatmapPanel}>
                  <Heatmap data={stats.activityTimeline} />
                </div>
              </div>
            )}

            <StatsBar
              stats={stats}
              total={questions.length}
              title="Tracker Stats"
              secondLabel="DUE REVISION"
              secondValue={stats.dueRevision}
            />

            {/* Filters */}
            <div className={styles.trackerFilters}>
              <div className={styles.searchBarWrapper}>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Search by Title... (Cmd+F)"
                  defaultValue={filters.search}
                  onChange={e => setFilter('search', e.target.value)}
                  className={styles.difficultySelect}
                  style={{ width: '250px' }}
                />
                <button
                  className={styles.filterToggleBtn}
                  onClick={() => setIsFilterOpen(v => !v)}
                >
                  {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button
                  className={styles.compactToggleBtn}
                  onClick={() => setIsCompactMode(v => !v)}
                >
                  {isCompactMode ? 'Detailed View' : 'Compact View'}
                </button>
              </div>

              {isFilterOpen && (
                <div className={styles.filterDrawer}>
                  <input
                    type="text"
                    placeholder="Filter Tag..."
                    defaultValue={filters.tag}
                    onChange={e => setFilter('tag', e.target.value)}
                    className={styles.difficultySelect}
                    style={{ width: '150px' }}
                  />
                  <select
                    value={filters.pattern}
                    onChange={e => setFilter('pattern', e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Patterns</option>
                    {patterns.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={filters.difficulty}
                    onChange={e => setFilter('difficulty', e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <select
                    value={filters.company}
                    onChange={e => setFilter('company', e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Companies</option>
                    {/* B-1 FIX: companies are {name, slug, count} objects */}
                    {companies.map(c => (
                      <option key={c.slug || c} value={c.slug || c}>
                        {c.name || c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Solved">Solved</option>
                    <option value="Attempted">Attempted</option>
                    <option value="Unsolved">Unsolved</option>
                  </select>
                  <label className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={!!filters.reviseFilter}
                      onChange={e => setFilter('reviseFilter', e.target.checked)}
                    />
                    Needs Revision
                  </label>
                  <label className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={!!filters.hideSolved}
                      onChange={e => setFilter('hideSolved', e.target.checked)}
                    />
                    Hide Solved
                  </label>
                  <label className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={!!filters.starredOnly}
                      onChange={e => setFilter('starredOnly', e.target.checked)}
                    />
                    Starred Only
                  </label>
                </div>
              )}
            </div>

            {isLoading && questions.length === 0 ? (
              <div className={styles.emptyState}><p>Loading your tracker...</p></div>
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
          </>
        )}

        {/* Modals */}
        {activeInitialSolveQ && (
          <InitialSolveModal
            question={activeInitialSolveQ}
            patterns={patterns}
            onClose={() => setActiveInitialSolveQ(null)}
            onSave={(id, data) => handleSaveInitialSolve(id, data)}
          />
        )}

        {activeNotesQ && (
          <NotesModal
            question={activeNotesQ}
            onClose={() => setActiveNotesQ(null)}
            onSave={(id, notes) => updateProgress(id, { notes })}
          />
        )}

        {activeReflectionQ && (
          <ReflectionModal
            question={activeReflectionQ}
            patterns={patterns}
            onClose={() => setActiveReflectionQ(null)}
            onSave={(id, data) => handleSaveReflection(id, data)}
          />
        )}

        {isFlashcardOpen && (
          <FlashcardMode
            questions={flashcardQuestions}
            onClose={() => setIsFlashcardOpen(false)}
            onBulkSave={async (updates) => {
              if (updates && updates.length > 0) {
                await apiClient.bulkUpdateProgress(updates).catch(console.error);
                fetchLightStats();
              }
              setIsFlashcardOpen(false);
            }}
          />
        )}
      </main>
      <footer className={styles.footer}>
        Made with <span className={styles.heart}>❤️</span> for the community. • Contact Us
      </footer>
    </div>
  );
}
