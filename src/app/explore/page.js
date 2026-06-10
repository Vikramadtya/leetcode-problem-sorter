'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Header from '../components/Header';
import Filters from '../components/Filters';
import StatsBar from '../components/StatsBar';
import Table from '../components/Table';
import InitialSolveModal from '../components/InitialSolveModal';
import ReflectionModal from '../components/ReflectionModal';
import styles from '../page.module.css';

export default function Explore() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState(['all']);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [authEnabled, setAuthEnabled] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ title: '', link: '', difficulty: 'Medium', platform: 'Codeforces' });
  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const allColumns = ['ID', 'Title', 'Difficulty', 'Attempts', 'Time', 'Acceptance %', 'Frequency %', 'DateSolved'];
  const [visibleColumns, setVisibleColumns] = useState(allColumns);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setAuthEnabled(data.authEnabled);
        setIsMockMode(data.isMockMode);
      });

    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data.companies) {
          setCompanies(['all', ...data.companies]);
        }
      });
      
    fetch('/api/patterns')
      .then(res => res.json())
      .then(data => {
        if (data.patterns) setPatterns(data.patterns);
      });
      
    fetch('/api/progress')
      .then(res => res.json())
      .then(data => {
        if (data.progress) setProgress(data.progress);
      });

    const savedCols = localStorage.getItem('exploreVisibleColumns');
    if (savedCols) {
      try { setVisibleColumns(JSON.parse(savedCols)); } catch(e) {}
    }
  }, []);

  const toggleColumn = (col) => {
    setVisibleColumns(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col];
      localStorage.setItem('exploreVisibleColumns', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (selectedCompany) {
      if (selectedCompany === 'Custom Questions') {
        if (!session) {
          setQuestions([]);
        } else {
          fetch('/api/custom-questions')
            .then(res => res.json())
            .then(data => {
              if (data.questions) setQuestions(data.questions);
            });
        }
      } else {
        fetch(`/api/questions?company=${selectedCompany}&period=${selectedPeriod}`)
          .then(res => res.json())
          .then(data => {
            if (data.questions) setQuestions(data.questions);
          });
      }
    }
  }, [selectedCompany, selectedPeriod, session]);

  const handleStatusChange = (id, newStatus) => {
    if (!session) {
      if (isMockMode) signIn('credentials');
      else signIn('google');
      return;
    }

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
      let confidenceLevel = progress[id]?.confidenceLevel || 3;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 5);
      let nextRevisionDate = progress[id]?.nextRevisionDate || nextDate.toISOString();

      updates = { 
        status: 'Solved',
        solved: true, 
        dateSolved: new Date().toISOString(),
        confidenceLevel,
        nextRevisionDate
      };
    }
    
    // Optimistic update
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

  const handleSaveInitialSolve = (id, { solutionLink, notes, pattern, memoryStrength }) => {
    if (!session) return;
    
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 };
    const days = intervals[memoryStrength] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const currentAttempts = progress[id]?.attempts || 0;
    
    const combinedNotes = solutionLink ? (notes ? `**Solution Link:** ${solutionLink}\n\n${notes}` : `**Solution Link:** ${solutionLink}`) : notes;

    const updates = {
      status: 'Solved',
      solved: true,
      confidenceLevel: memoryStrength,
      dateSolved: new Date().toISOString(),
      nextRevisionDate: nextDate.toISOString(),
      revise: false,
      attempts: currentAttempts + 1,
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

  const handleSaveReflection = (id, { insight, pattern, memoryStrength }) => {
    if (!session) return;
    
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 }; 
    const days = intervals[memoryStrength] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const updates = { 
      solved: true, 
      dateSolved: new Date().toISOString(), 
      confidenceLevel: memoryStrength, 
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

  const handleSetConfidence = (id, level) => {
    if (!session) return;
    const intervals = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 14 };
    const days = intervals[level] || 5;
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const updates = { 
      confidenceLevel: level, 
      nextRevisionDate: nextDate.toISOString() 
    };
    
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

  const handleOpenNotes = (q) => {
    setActiveNotesQ(q);
    setNotesDraft(progress[q.ID]?.notes || '');
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
    setActiveNotesQ(null);
  };

  const handleToggleRevise = (id) => {
    if (!session) {
      if (isMockMode) signIn('credentials');
      else signIn('google');
      return;
    }

    const isRevise = progress[id]?.revise;
    const updates = { revise: !isRevise };
    
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

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedQuestions = questions.filter(q => {
    if (difficultyFilter !== 'all' && (q.Difficulty || q[' Difficulty'])?.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
    
    const prog = progress[q.ID] || {};
    const status = prog.status || (prog.solved ? 'Solved' : 'Unsolved');
    const isSolved = status === 'Solved';
    
    if (hideSolved && isSolved) return false;
    if (starredOnly && !prog.important) return false;
    
    if (searchQuery) {
      const qTitle = (q.Title || q[' Title'] || '').toLowerCase();
      const qID = q.ID?.toString() || '';
      if (!qTitle.includes(searchQuery.toLowerCase()) && !qID.includes(searchQuery)) return false;
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
    } else if (sortConfig.key === 'ID') {
      aVal = parseInt(a.ID, 10) || 0;
      bVal = parseInt(b.ID, 10) || 0;
    } else if (sortConfig.key === 'Title') {
      aVal = (a.Title || '').toLowerCase();
      bVal = (b.Title || '').toLowerCase();
    } else if (sortConfig.key === 'Status') {
      aVal = progress[a.ID]?.solved ? 1 : 0;
      bVal = progress[b.ID]?.solved ? 1 : 0;
    } else if (sortConfig.key === 'Revise') {
      aVal = progress[a.ID]?.revise ? 1 : 0;
      bVal = progress[b.ID]?.revise ? 1 : 0;
    } else if (sortConfig.key === 'Attempts') {
      aVal = progress[a.ID]?.attempts || 0;
      bVal = progress[b.ID]?.attempts || 0;
    } else if (sortConfig.key === 'Time') {
      aVal = progress[a.ID]?.timeSpent || 0;
      bVal = progress[b.ID]?.timeSpent || 0;
    } else if (sortConfig.key === 'DateSolved') {
      aVal = progress[a.ID]?.dateSolved ? new Date(progress[a.ID].dateSolved).getTime() : 0;
      bVal = progress[b.ID]?.dateSolved ? new Date(progress[b.ID].dateSolved).getTime() : 0;
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const stats = { solved: 0, attempted: 0, unsolved: 0, easy: 0, medium: 0, hard: 0 };

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
    
    if (!prog || (!prog.solved && prog.status !== 'Solved' && prog.status !== 'Attempted')) {
      stats.unsolved++;
    }
  });

  const handleAddCustomQuestion = (e) => {
    e.preventDefault();
    if (!session) return;

    fetch('/api/custom-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.question) {
          setQuestions(prev => [...prev, data.question]);
          setShowCustomModal(false);
          setCustomForm({ title: '', link: '', difficulty: 'Medium', platform: 'Codeforces' });
        }
      });
  };

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} isMockMode={isMockMode} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <Filters 
            companies={companies}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={setDifficultyFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hideSolved={hideSolved}
            setHideSolved={setHideSolved}
            starredOnly={starredOnly}
            setStarredOnly={setStarredOnly}
            visibleColumns={visibleColumns}
            toggleColumn={toggleColumn}
          />
        </div>
        <StatsBar 
          stats={stats} 
          total={questions.length} 
          title="Explore Questions"
          secondLabel="UNSOLVED"
          secondValue={questions.length - stats.solved}
        />
        <Table 
          questions={processedQuestions}
          progress={progress}
          onStatusChange={handleStatusChange}
          onOpenInitialSolve={setActiveInitialSolveQ}
          onOpenReflection={setActiveReflectionQ}
          onToggleImportant={handleToggleImportant}
          sortConfig={sortConfig}
          requestSort={requestSort}
          authEnabled={authEnabled}
          visibleColumns={visibleColumns}
          patterns={patterns}
        />
        
        {activeInitialSolveQ && (
          <InitialSolveModal 
            question={activeInitialSolveQ}
            patterns={patterns}
            onClose={() => setActiveInitialSolveQ(null)}
            onSave={handleSaveInitialSolve}
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

        {showCustomModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>Add Custom Question</h3>
              <form onSubmit={handleAddCustomQuestion} className={styles.customForm}>
                <input 
                  required
                  type="text" 
                  placeholder="Question Title" 
                  value={customForm.title}
                  onChange={e => setCustomForm({...customForm, title: e.target.value})}
                  className={styles.modalInput}
                />
                <input 
                  type="url" 
                  placeholder="Link URL (Optional)" 
                  value={customForm.link}
                  onChange={e => setCustomForm({...customForm, link: e.target.value})}
                  className={styles.modalInput}
                />
                <select 
                  value={customForm.difficulty}
                  onChange={e => setCustomForm({...customForm, difficulty: e.target.value})}
                  className={styles.modalSelect}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <select 
                  value={customForm.platform}
                  onChange={e => setCustomForm({...customForm, platform: e.target.value})}
                  className={styles.modalSelect}
                >
                  <option value="Codeforces">Codeforces</option>
                  <option value="HackerRank">HackerRank</option>
                  <option value="GeeksforGeeks">GeeksforGeeks</option>
                  <option value="CodeChef">CodeChef</option>
                  <option value="Custom">Custom</option>
                </select>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setShowCustomModal(false)} className={styles.modalCancelBtn}>Cancel</button>
                  <button type="submit" className={styles.modalSubmitBtn}>Add Question</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeNotesQ && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
              <h3>Notes & Approach: {activeNotesQ.Title}</h3>
              <textarea 
                className={styles.modalTextarea} 
                rows={10} 
                placeholder="Write your approach, time complexity, or paste your solution code here..."
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setActiveNotesQ(null)} className={styles.modalCancelBtn}>Cancel</button>
                <button type="button" onClick={handleSaveNotes} className={styles.modalSubmitBtn}>Save Notes</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className={styles.footer}>
        Made with <span className={styles.heart}>❤️</span> for the community. • Contact Us
      </footer>
    </div>
  );
}
