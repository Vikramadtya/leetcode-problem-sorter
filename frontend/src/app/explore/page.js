'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '../components/Header';
import Table from '../components/Table';
import ReflectionModal from '../components/ReflectionModal';
import InitialSolveModal from '../components/InitialSolveModal';
import StatsBar from '../components/StatsBar';
import NotesModal from '../components/NotesModal';
import styles from '../page.module.css';
import { useAppStore } from '../../store/useAppStore';
import config from '../../config.json';

/**
 * Explore page — global question catalogue.
 *
 * Key rules:
 * - Uses resetToExploreMode() so trackerMode=false (all questions shown).
 * - Calls fetchLightStats() so StatsBar has data.
 * - Does NOT add its own debounce — the store handles debouncing internally.
 * - Shows a Retry button on fetch errors.
 */
export default function Explore() {
  const { data: session } = useSession();

  const {
    questions,
    isLoading,
    error,
    filters,
    setFilter,
    updateProgress,
    companies,
    patterns,
    stats,
    fetchUtilities,
    fetchLightStats,
    resetToExploreMode,
  } = useAppStore();

  const authEnabled = config.features.authEnabled;

  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [isCompactMode, setIsCompactMode] = useState(false);

  // Initialise explore mode on mount (once)
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    resetToExploreMode();
    fetchUtilities();
    fetchLightStats(); // StatsBar needs this
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts — close modals on Escape, focus search on Cmd+F
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('exploreSearchInput')?.focus();
      }
      if (e.key === 'Escape') {
        setActiveNotesQ(null);
        setActiveReflectionQ(null);
        setActiveInitialSolveQ(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // InitialSolveModal save — all computation server-side
  const handleSaveInitialSolve = useCallback((id, { solutionLink, notes, pattern, memoryStrength }) => {
    updateProgress(id, {
      status: 'Solved',
      confidenceLevel: memoryStrength,
      notes: notes || '',
      pattern: pattern || '',
      solutionLink: solutionLink || '',
      // dateSolved and nextRevisionDate computed by server
    });
    setActiveInitialSolveQ(null);
  }, [updateProgress]);

  // ReflectionModal save
  const handleSaveReflection = useCallback((id, { insight, pattern, memoryStrength }) => {
    const q = questions.find(q => q.id === id);
    const existingNotes = q?.progress?.notes || '';
    const updatedNotes = insight
      ? (existingNotes
          ? `${existingNotes}\n\n**Reflection:**\n${insight}`
          : `**Reflection:**\n${insight}`)
      : existingNotes;

    updateProgress(id, {
      revise: true,
      confidenceLevel: memoryStrength,
      notes: updatedNotes,
      pattern: pattern || q?.progress?.pattern || '',
    });
    setActiveReflectionQ(null);
  }, [questions, updateProgress]);

  const handleOpenNotes = useCallback((q) => setActiveNotesQ(q), []);

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Explore Global Questions</h1>
            <p className={styles.subtitle}>Discover and track LeetCode questions from top companies.</p>
          </div>
          <Link href="/" className={styles.exploreLink}>← Back to Tracker</Link>
        </div>

        <StatsBar
          stats={stats}
          total={questions.length}
          title="Explore Stats"
          secondLabel="SHOWING"
          secondValue={questions.length}
        />

        {/* Filters — always visible on Explore */}
        <div className={styles.trackerFilters}>
          <div className={styles.searchBarWrapper}>
            <input
              id="exploreSearchInput"
              type="text"
              placeholder="Search by Title... (Cmd+F)"
              defaultValue={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className={styles.difficultySelect}
              style={{ width: '250px' }}
              aria-label="Search questions by title"
            />
            <button
              className={styles.compactToggleBtn}
              onClick={() => setIsCompactMode(v => !v)}
              aria-pressed={isCompactMode}
            >
              {isCompactMode ? 'Detailed View' : 'Compact View'}
            </button>
          </div>

          <div className={styles.filterDrawer}>
            <select
              value={filters.difficulty}
              onChange={e => setFilter('difficulty', e.target.value)}
              className={styles.difficultySelect}
              aria-label="Filter by difficulty"
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
              aria-label="Filter by company"
            >
              <option value="all">All Companies</option>
              {companies.map(c => (
                <option key={c.slug || c} value={c.slug || c}>
                  {c.name || c}
                </option>
              ))}
            </select>
            <select
              value={filters.pattern}
              onChange={e => setFilter('pattern', e.target.value)}
              className={styles.difficultySelect}
              aria-label="Filter by pattern"
            >
              <option value="all">All Patterns</option>
              {patterns.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
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
        </div>

        {isLoading && questions.length === 0 ? (
          <div className={styles.emptyState}><p>Loading global questions...</p></div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p>Failed to load questions. Is the mock server running at port 4000?</p>
            <button
              className={styles.compactToggleBtn}
              onClick={() => resetToExploreMode()}
              style={{ marginTop: '0.75rem' }}
            >
              Retry
            </button>
          </div>
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

        {/* Modals */}
        {activeInitialSolveQ && (
          <InitialSolveModal
            question={activeInitialSolveQ}
            patterns={patterns}
            onClose={() => setActiveInitialSolveQ(null)}
            onSave={(id, data) => handleSaveInitialSolve(id, data)}
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
        {activeNotesQ && (
          <NotesModal
            question={activeNotesQ}
            onClose={() => setActiveNotesQ(null)}
            onSave={(id, notes) => updateProgress(id, { notes })}
          />
        )}
      </main>
    </div>
  );
}
