'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Table from './components/Table';
import Heatmap from './components/Heatmap';
import FocusMode from './components/FocusMode';
import ReflectionModal from './components/ReflectionModal';
import InitialSolveModal from './components/InitialSolveModal';
import FlashcardMode from './components/FlashcardMode';
import styles from './page.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Home() {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [patterns, setPatterns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [patternFilter, setPatternFilter] = useState('all');
  const [reviseFilter, setReviseFilter] = useState(false);
  const [hideSolved, setHideSolved] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [activeFocusQ, setActiveFocusQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setAuthEnabled(data.authEnabled);
        setIsMockMode(data.isMockMode);
      });
  }, []);

  useEffect(() => {
    if (session) {
      setLoading(true);
      Promise.all([
        fetch('/api/tracker').then(res => res.json()),
        fetch('/api/progress').then(res => res.json()),
        fetch('/api/patterns').then(res => res.json()),
        fetch('/api/analytics').then(res => res.json())
      ]).then(([trackerData, progressData, patternsData, analyticsData]) => {
        if (trackerData.questions) setQuestions(trackerData.questions);
        if (progressData.progress) setProgress(progressData.progress);
        if (patternsData.patterns) setPatterns(patternsData.patterns);
        if (analyticsData && !analyticsData.error) setAnalytics(analyticsData);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setQuestions([]);
      setAnalytics(null);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+F or Ctrl+F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
      // Cmd+D or Ctrl+D to go to dashboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        router.push('/dashboard');
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setActiveFocusQ(null);
        setActiveNotesQ(null);
        setActiveReflectionQ(null);
        setActiveInitialSolveQ(null);
        setIsFlashcardOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleStatusChange = (id, newStatus) => {
    if (!session) return;
    
    let updates = {};
    if (newStatus === 'Unsolved') {
      updates = {
        status: 'Unsolved',
        solved: false,
        dateSolved: null,
        confidenceLevel: null,
        nextRevisionDate: null,
        revise: false,
        attempts: 0,
        timeSpent: 0,
        tags: [],
        pattern: '',
        notes: ''
      };
    } else if (newStatus === 'Attempted') {
      updates = { 
        status: 'Attempted',
        solved: false
      };
    } else if (newStatus === 'Solved') {
      const confidenceLevel = progress[id]?.confidenceLevel || 3;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 5);
      const nextRevisionDate = progress[id]?.nextRevisionDate || nextDate.toISOString();
      const attempts = (progress[id]?.attempts || 0) + 1;

      updates = { 
        status: 'Solved',
        solved: true, 
        dateSolved: new Date().toISOString(),
        confidenceLevel,
        nextRevisionDate,
        attempts
      };
    }
    
    setProgress(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleSaveReflection = (id, { insight, pattern, memoryStrength }) => {
    if (!session) return;
    
    // Calculate new nextRevisionDate based on memoryStrength
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 }; // 1d, 3d, 7d, 14d
    const days = intervals[memoryStrength] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const updates = { 
      solved: true, 
      dateSolved: new Date().toISOString(), 
      confidenceLevel: memoryStrength, // Maps to 1-4
      nextRevisionDate: nextDate.toISOString(),
      attempts: (progress[id]?.attempts || 0) + 1,
      notes: insight ? (progress[id]?.notes ? progress[id].notes + '\n\n**Reflection:**\n' + insight : '**Reflection:**\n' + insight) : progress[id]?.notes,
      pattern: pattern || progress[id]?.pattern,
      revise: false
    };

    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });

    setActiveReflectionQ(null);
  };

  const handleSaveInitialSolve = (id, { solutionLink, notes, pattern, memoryStrength }) => {
    if (!session) return;
    
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 }; // 1d, 3d, 7d, 14d
    const days = intervals[memoryStrength] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const combinedNotes = solutionLink ? (notes ? `**Solution Link:** ${solutionLink}\n\n${notes}` : `**Solution Link:** ${solutionLink}`) : notes;

    const updates = { 
      solved: true, 
      dateSolved: new Date().toISOString(), 
      confidenceLevel: memoryStrength, 
      nextRevisionDate: nextDate.toISOString(),
      attempts: 1,
      notes: combinedNotes,
      pattern: pattern || progress[id]?.pattern,
      solutionLink: solutionLink || progress[id]?.solutionLink
    };

    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });

    setActiveInitialSolveQ(null);
  };

  const handleSetConfidence = (id, level) => {
    if (!session) return;
    const intervals = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 14 };
    const days = intervals[level] || 5;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const updates = { confidenceLevel: level, nextRevisionDate: nextDate.toISOString() };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleSetTags = (id, tagsString) => {
    if (!session) return;
    const updates = { tags: tagsString };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleSetPattern = (id, patternString) => {
    if (!session) return;
    const updates = { pattern: patternString };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleOpenNotes = (q) => {
    setActiveNotesQ(q);
    setNotesDraft(progress[q.ID]?.notes || '');
    setIsEditingNotes(false);
  };

  const handleSaveNotes = () => {
    if (!session || !activeNotesQ) return;
    const id = activeNotesQ.ID;
    const updates = { notes: notesDraft };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
    setIsEditingNotes(false);
  };

  const handleSaveTime = (id, timeSpentSeconds) => {
    if (!session) return;
    const existingTime = progress[id]?.timeSpent || 0;
    const updates = { timeSpent: existingTime + timeSpentSeconds };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleToggleRevise = (id) => {
    if (!session) return;
    const isRevise = progress[id]?.revise;
    const updates = { revise: !isRevise };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleToggleImportant = (id) => {
    if (!session) return;
    const isImportant = progress[id]?.important;
    const updates = { important: !isImportant };
    setProgress(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedQuestions = [...questions].filter(q => {
    const prog = progress[q.ID] || {};
    
    if (reviseFilter) {
      const isDue = prog.nextRevisionDate && new Date(prog.nextRevisionDate) <= new Date();
      if (!prog.revise && !isDue) return false;
    }
    
    const status = prog.status || (prog.solved ? 'Solved' : 'Unsolved');
    const isSolved = status === 'Solved';
    
    if (hideSolved && isSolved) {
      return false;
    }

    if (starredOnly && !prog.important) {
      return false;
    }
    
    if (difficultyFilter !== 'all' && (q.Difficulty || q[' Difficulty']) !== difficultyFilter) return false;
    
    if (searchQuery) {
      if (!q.Title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    if (tagFilter) {
      const qTags = progress[q.ID]?.tags?.toLowerCase() || '';
      if (!qTags.includes(tagFilter.toLowerCase())) return false;
    }
    if (patternFilter !== 'all') {
      const qPattern = progress[q.ID]?.pattern || q.pattern || '';
      if (qPattern !== patternFilter) return false;
    }
    return true;
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'Difficulty') {
      const order = { 'easy': 1, 'medium': 2, 'hard': 3 };
      aVal = order[aVal?.toLowerCase()] || 0;
      bVal = order[bVal?.toLowerCase()] || 0;
    } else if (sortConfig.key === 'Acceptance %' || sortConfig.key === 'Frequency %') {
      aVal = parseFloat(aVal?.replace('%', '')) || 0;
      bVal = parseFloat(bVal?.replace('%', '')) || 0;
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const dueQuestions = questions.filter(q => {
    const prog = progress[q.ID];
    if (!prog || !prog.solved) return false;
    const isDue = prog.nextRevisionDate && new Date(prog.nextRevisionDate) <= new Date();
    return isDue || prog.revise;
  });

  const stats = { solved: 0, attempted: 0, dueRevision: 0, easy: 0, medium: 0, hard: 0 };
  
  questions.forEach(q => {
    const prog = progress[q.ID];
    if (prog) {
      if (prog.status === 'Solved' || prog.solved) {
        stats.solved++;
      } else if (prog.status === 'Attempted') {
        stats.attempted++;
      }

      const diff = (q.Difficulty || q[' Difficulty'])?.toLowerCase();
      if (diff === 'easy') stats.easy++;
      else if (diff === 'medium') stats.medium++;
      else if (diff === 'hard') stats.hard++;
    }
    
    const isSolved = prog?.solved;
    const isDue = prog?.nextRevisionDate && new Date(prog.nextRevisionDate) <= new Date();
    
    if ((isSolved && isDue) || prog?.revise) {
      stats.dueRevision++;
    }
  });

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} isMockMode={isMockMode} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Your Tracker</h1>
            <p className={styles.subtitle}>Tracked problems & custom questions.</p>
          </div>
          {authEnabled && session && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                className={styles.flashcardBtn}
                onClick={() => setIsFlashcardOpen(true)}
              >
                ⚡ Quick Recall ({dueQuestions.length})
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
        ) : loading ? (
          <div className={styles.emptyState}>
            <p>Loading your tracker...</p>
          </div>
        ) : (
          <>
            {analytics && analytics.activityTimeline && (
              <div className={styles.analyticsHub}>
                <div className={styles.streakPanel}>
                  <div className={styles.streakBox}>
                    <span className={styles.streakLabel}>Current Streak</span>
                    <span className={styles.streakValue}>{analytics.currentStreak || 0} 🔥</span>
                  </div>
                  <div className={styles.streakBox}>
                    <span className={styles.streakLabel}>Max Streak</span>
                    <span className={styles.streakValue}>{analytics.maxStreak || 0} ⚡</span>
                  </div>
                  <div className={styles.streakBox}>
                    <span className={styles.streakLabel}>Weekly Goal</span>
                    <span className={styles.streakValue}>{analytics.weeklyCount || 0}/10 🎯</span>
                  </div>
                </div>
                <div className={styles.heatmapPanel}>
                  <Heatmap data={analytics.activityTimeline} />
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
            
            <div className={styles.trackerFilters}>
              <div className={styles.searchBarWrapper}>
                <input 
                  id="searchInput"
                  type="text" 
                  placeholder="Search by Title... (Cmd+F)" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={styles.difficultySelect}
                  style={{ width: '250px' }}
                />
                <button 
                  className={styles.filterToggleBtn} 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button 
                  className={styles.compactToggleBtn} 
                  onClick={() => setIsCompactMode(!isCompactMode)}
                >
                  {isCompactMode ? 'Detailed View' : 'Compact View'}
                </button>
              </div>
              
              {isFilterOpen && (
                <div className={styles.filterDrawer}>
                  <input 
                    type="text" 
                    placeholder="Filter Tag..." 
                    value={tagFilter}
                    onChange={e => setTagFilter(e.target.value)}
                    className={styles.difficultySelect}
                    style={{ width: '150px' }}
                  />
                  <select 
                    value={patternFilter} 
                    onChange={e => setPatternFilter(e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Patterns</option>
                    {patterns.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <select 
                    value={difficultyFilter} 
                    onChange={e => setDifficultyFilter(e.target.value)}
                    className={styles.difficultySelect}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                <label className={styles.filterCheckbox}>
                  <input 
                    type="checkbox" 
                    checked={reviseFilter} 
                    onChange={e => setReviseFilter(e.target.checked)} 
                  />
                  Needs Revision
                </label>
                <label className={styles.filterCheckbox}>
                  <input 
                    type="checkbox" 
                    checked={hideSolved} 
                    onChange={e => setHideSolved(e.target.checked)} 
                  />
                  Hide Solved
                </label>
                <label className={styles.filterCheckbox}>
                  <input 
                    type="checkbox" 
                    checked={starredOnly} 
                    onChange={e => setStarredOnly(e.target.checked)} 
                  />
                  Starred
                </label>
              </div>
              )}
            </div>

            <Table 
              questions={processedQuestions}
              progress={progress}
              onStatusChange={handleStatusChange}
              onOpenReflection={setActiveReflectionQ}
              onOpenInitialSolve={setActiveInitialSolveQ}
              onToggleRevise={handleToggleRevise}
              onToggleImportant={handleToggleImportant}
              onSetConfidence={handleSetConfidence}
              onSetTags={handleSetTags}
              onSetPattern={handleSetPattern}
              onOpenNotes={handleOpenNotes}
              onSaveTime={handleSaveTime}
              onOpenFocusMode={setActiveFocusQ}
              authEnabled={authEnabled}
              sortConfig={sortConfig}
              requestSort={requestSort}
              patterns={patterns}
              isCompactMode={isCompactMode}
            />
          </>
        )}

        {activeInitialSolveQ && (
        <InitialSolveModal 
          question={activeInitialSolveQ}
          patterns={patterns}
          onClose={() => setActiveInitialSolveQ(null)}
          onSave={handleSaveInitialSolve}
        />
      )}

      {activeNotesQ && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', minHeight: '400px' }}>
              <div className={styles.modalHeader}>
                <h3>Notes & Approach: {activeNotesQ.Title}</h3>
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
                    placeholder="Write your approach, time complexity, or paste your solution code here using Markdown..."
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                  />
                ) : (
                  <div className={styles.markdownPreview}>
                    {notesDraft ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {notesDraft}
                      </ReactMarkdown>
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

        {activeFocusQ && (
          <FocusMode 
            question={activeFocusQ} 
            onClose={() => setActiveFocusQ(null)} 
            onSaveTime={handleSaveTime} 
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
            questions={dueQuestions}
            progress={progress}
            onClose={() => setIsFlashcardOpen(false)}
            onSetConfidence={handleSetConfidence}
          />
        )}
      </main>
      <footer className={styles.footer}>
        Made with <span className={styles.heart}>❤️</span> for the community. • Contact Us
      </footer>
    </div>
  );
}
