'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '../components/Header';
import Table from '../components/Table';
import ReflectionModal from '../components/ReflectionModal';
import InitialSolveModal from '../components/InitialSolveModal';
import StatsBar from '../components/StatsBar';
import styles from '../page.module.css';
import { useAppStore } from '../../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import config from '../../config.json';

export default function Explore() {
  const { data: session } = useSession();

  const {
    questions,
    isLoading,
    filters,
    setFilter,
    updateProgress,
    companies,
    patterns,
    stats,
    fetchUtilities,
    resetToExploreMode,
  } = useAppStore();

  const authEnabled = config.features.authEnabled;

  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);

  const searchDebounce = useRef(null);

  // Initialise explore mode on mount (once)
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    resetToExploreMode();
    fetchUtilities();
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
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ----------------------------------------------------------------
  // InitialSolveModal save — server handles ALL computation
  // ----------------------------------------------------------------
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
    });
    setActiveReflectionQ(null);
  }, [questions, updateProgress]);

  const handleOpenNotes = useCallback((q) => {
    setActiveNotesQ(q);
    setNotesDraft(q.progress?.notes || '');
    setIsEditingNotes(false);
  }, []);

  const handleSaveNotes = useCallback(() => {
    if (!activeNotesQ) return;
    updateProgress(activeNotesQ.id, { notes: notesDraft });
    setIsEditingNotes(false);
  }, [activeNotesQ, notesDraft, updateProgress]);

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Explore Global Questions</h1>
            <p className={styles.subtitle}>Discover and track new LeetCode questions from top companies.</p>
          </div>
          <Link href="/" className={styles.exploreLink}>
            ← Back to Tracker
          </Link>
        </div>

        <StatsBar
          stats={stats}
          total={questions.length}
          title="Explore Stats"
          secondLabel="TOTAL SHOWN"
          secondValue={questions.length}
        />

        {/* Filters — always visible on Explore */}
        <div className={styles.trackerFilters}>
          <div className={styles.searchBarWrapper}>
            <input
              id="searchInput"
              type="text"
              placeholder="Search by Title... (Cmd+F)"
              defaultValue={filters.search}
              onChange={e => {
                clearTimeout(searchDebounce.current);
                searchDebounce.current = setTimeout(() => setFilter('search', e.target.value), 300);
              }}
              className={styles.difficultySelect}
              style={{ width: '250px' }}
            />
            <button
              className={styles.compactToggleBtn}
              onClick={() => setIsCompactMode(v => !v)}
            >
              {isCompactMode ? 'Detailed View' : 'Compact View'}
            </button>
          </div>

          <div className={styles.filterDrawer}>
            <input
              type="text"
              placeholder="Filter Tag..."
              defaultValue={filters.tag}
              onChange={e => {
                clearTimeout(searchDebounce.current);
                searchDebounce.current = setTimeout(() => setFilter('tag', e.target.value), 300);
              }}
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
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', minHeight: '400px' }}>
              <div className={styles.modalHeader}>
                <h3>Notes & Approach: {activeNotesQ.title}</h3>
                <div className={styles.modalTabs}>
                  <button
                    className={`${styles.tabBtn} ${!isEditingNotes ? styles.tabActive : ''}`}
                    onClick={() => setIsEditingNotes(false)}
                  >Preview</button>
                  <button
                    className={`${styles.tabBtn} ${isEditingNotes ? styles.tabActive : ''}`}
                    onClick={() => setIsEditingNotes(true)}
                  >Edit</button>
                </div>
              </div>
              <div className={styles.modalBody}>
                {isEditingNotes ? (
                  <textarea
                    className={styles.modalTextarea}
                    rows={15}
                    placeholder="Write your approach, time complexity, or solution in Markdown..."
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                  />
                ) : (
                  <div className={styles.markdownPreview}>
                    {notesDraft ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{notesDraft}</ReactMarkdown>
                    ) : (
                      <p className={styles.emptyState}>No notes yet. Click Edit to add some.</p>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setActiveNotesQ(null)} className={styles.modalCancelBtn}>Close</button>
                {isEditingNotes && (
                  <button type="button" onClick={handleSaveNotes} className={styles.modalSubmitBtn}>Save Notes</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
