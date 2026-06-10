'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import InitialSolveModal from '../components/InitialSolveModal';
import ReflectionModal from '../components/ReflectionModal';
import styles from '../page.module.css';

const ProgressContext = createContext({});

export function ProgressProvider({ children }) {
  const { data: session } = useSession();
  const [progress, setProgress] = useState({});
  const [patterns, setPatterns] = useState([]);
  
  const [activeInitialSolveQ, setActiveInitialSolveQ] = useState(null);
  const [activeReflectionQ, setActiveReflectionQ] = useState(null);
  const [activeNotesQ, setActiveNotesQ] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    fetch('/api/progress')
      .then(res => res.json())
      .then(data => {
        if (data.progress) setProgress(data.progress);
      });
      
    fetch('/api/patterns')
      .then(res => res.json())
      .then(data => {
        if (data.patterns) setPatterns(data.patterns);
      });
  }, []);

  const updateProgress = (id, updates) => {
    setProgress(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));

    if (session) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
    }
  };

  const handleStatusChange = (id, newStatus) => {
    if (!session) return;
    
    if (newStatus === 'Unsolved') {
      // Complete wipe for un-solve
      updateProgress(id, {
        status: 'Unsolved',
        solved: false,
        dateSolved: null,
        confidenceLevel: null,
        nextRevisionDate: null,
        attempts: 1,
        notes: null,
        pattern: null,
        timeSpent: 0,
        revise: false
      });
    } else if (newStatus === 'Attempted') {
      updateProgress(id, { 
        status: 'Attempted',
        solved: false
      });
    } else if (newStatus === 'Solved') {
      updateProgress(id, { 
        status: 'Solved',
        solved: true, 
        dateSolved: new Date().toISOString() 
      });
    }
  };

  const handleSaveInitialSolve = (id, { solutionLink, notes, pattern, memoryStrength }) => {
    if (!session) return;
    const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 };
    const days = intervals[memoryStrength] || 7;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    const combinedNotes = solutionLink ? (notes ? `**Solution Link:** ${solutionLink}\n\n${notes}` : `**Solution Link:** ${solutionLink}`) : notes;

    updateProgress(id, {
      status: 'Solved',
      solved: true,
      dateSolved: new Date().toISOString(),
      confidenceLevel: memoryStrength,
      nextRevisionDate: nextDate.toISOString(),
      attempts: 1,
      notes: combinedNotes,
      pattern: pattern || progress[id]?.pattern
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
      status: 'Solved',
      solved: true,
      confidenceLevel: memoryStrength,
      nextRevisionDate: nextDate.toISOString(),
      attempts: (progress[id]?.attempts || 0) + 1,
      notes: insight ? (progress[id]?.notes ? progress[id].notes + '\n\n**Reflection:**\n' + insight : '**Reflection:**\n' + insight) : progress[id]?.notes,
      pattern: pattern || progress[id]?.pattern
    };

    updateProgress(id, updates);
    setActiveReflectionQ(null);
  };

  const handleSetConfidence = (id, level) => {
    if (!session) return;
    const intervals = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 14 };
    const days = intervals[level] || 5;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    updateProgress(id, { confidenceLevel: level, nextRevisionDate: nextDate.toISOString() });
  };

  const handleSetTags = (id, tagsString) => {
    updateProgress(id, { tags: tagsString });
  };

  const handleSetPattern = (id, patternString) => {
    updateProgress(id, { pattern: patternString });
  };

  const handleToggleRevise = (id) => {
    if (!session) return;
    const isRevise = progress[id]?.revise;
    updateProgress(id, { revise: !isRevise });
  };

  const handleOpenNotes = (q) => {
    setActiveNotesQ(q);
    setNotesDraft(progress[q.ID]?.notes || '');
  };

  const handleSaveNotes = () => {
    if (!session || !activeNotesQ) return;
    updateProgress(activeNotesQ.ID, { notes: notesDraft });
    setActiveNotesQ(null);
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      handleStatusChange,
      handleSetConfidence,
      handleSetTags,
      handleSetPattern,
      handleToggleRevise,
      handleOpenNotes,
      setActiveInitialSolveQ,
      setActiveReflectionQ,
    }}>
      {children}

      {/* Global Modals */}
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

      {activeNotesQ && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '800px', minHeight: '400px' }}>
            <div className={styles.modalHeader}>
              <h3>Notes & Approach: {activeNotesQ.Title}</h3>
            </div>
            <div className={styles.modalBody}>
              <textarea 
                className={styles.modalTextarea} 
                rows={15} 
                placeholder="Write your approach, time complexity, or paste your solution code here... (Markdown supported)"
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                style={{ width: '100%', padding: '1rem', borderRadius: '0.5rem', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'vertical' }}
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setActiveNotesQ(null)} className={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={handleSaveNotes} className={styles.saveBtn}>Save Notes</button>
            </div>
          </div>
        </div>
      )}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
