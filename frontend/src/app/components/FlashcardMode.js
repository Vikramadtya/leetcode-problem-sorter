import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './FlashcardMode.module.css';

/**
 * FlashcardMode — Quick Recall session for due-revision questions.
 *
 * Props:
 *   questions    QuestionWithProgress[]
 *   onClose      () => void   — called when user exits without finishing
 *   onBulkSave   (updates: {id, confidenceLevel}[]) => Promise<void>
 *                — called when user finishes all cards; receives batch of updates
 *
 * Phase 4: All confidence updates are accumulated locally and sent as a
 * single POST /progress/bulk on completion — instead of individual PATCHes.
 */
export default function FlashcardMode({ questions, onClose, onBulkSave }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  // Phase 4.1: Accumulate pending updates
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modalContent}>
          <h3>No problems due for revision today!</h3>
          <p>You're all caught up. Go solve some new problems.</p>
          <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const qProgress = currentQ.progress || {};

  // Phase 4.2: Accumulate update, advance to next card
  const handleScore = (level) => {
    const update = { id: currentQ.id, confidenceLevel: level, revise: true };
    const newUpdates = [...pendingUpdates, update];
    setPendingUpdates(newUpdates);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // All cards done — trigger bulk save
      handleFinish(newUpdates);
    }
  };

  // Phase 4.2: Send bulk update when finished
  const handleFinish = async (updates) => {
    setIsSaving(true);
    try {
      if (onBulkSave) await onBulkSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modalContent}>
          <h3>Saving your progress...</h3>
          <p>Updating {pendingUpdates.length} questions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Quick Recall Session">
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3>Quick Recall Session</h3>
          <span className={styles.counter}>{currentIndex + 1} / {questions.length}</span>
        </div>

        {/* Phase 4.3: progress bar */}
        <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginBottom: '1rem' }}>
          <div style={{
            width: `${((currentIndex) / questions.length) * 100}%`,
            height: '100%',
            background: 'var(--primary)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div className={styles.flashcardContainer}>
          {!isFlipped ? (
            <div className={styles.cardFront}>
              <h2 className={styles.qTitle}>{currentQ.title}</h2>
              <div className={styles.tags}>
                <span className={`${styles.pill} ${styles[currentQ.difficulty?.toLowerCase()]}`}>
                  {currentQ.difficulty}
                </span>
                {qProgress.pattern && <span className={styles.pill}>{qProgress.pattern}</span>}
              </div>
              <p className={styles.prompt}>
                Mentally recall the <strong>optimal approach</strong> and <strong>Time/Space Complexity</strong>.
              </p>
              <button className={styles.flipBtn} onClick={() => setIsFlipped(true)}>
                Reveal Notes
              </button>
            </div>
          ) : (
            <div className={styles.cardBack}>
              <h2 className={styles.qTitle}>{currentQ.title}</h2>
              <div className={styles.notesArea}>
                {qProgress.notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{qProgress.notes}</ReactMarkdown>
                ) : (
                  <p className={styles.emptyNotes}>No notes saved for this problem.</p>
                )}
              </div>
              <div className={styles.scoreActions}>
                <p>How well did you remember?</p>
                <div className={styles.btnRow}>
                  <button className={`${styles.scoreBtn} ${styles.score1}`} onClick={() => handleScore(1)}>
                    Forgot Completely <span>(reset: 1d)</span>
                  </button>
                  <button className={`${styles.scoreBtn} ${styles.score2}`} onClick={() => handleScore(2)}>
                    Needed Hints <span>(3d)</span>
                  </button>
                  <button className={`${styles.scoreBtn} ${styles.score3}`} onClick={() => handleScore(3)}>
                    Recalled OK <span>(7d)</span>
                  </button>
                  <button className={`${styles.scoreBtn} ${styles.score4}`} onClick={() => handleScore(4)}>
                    Mastered <span>(14d)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className={styles.closeFloatBtn} onClick={onClose} aria-label="Exit flashcard session">
          Exit Session
        </button>
      </div>
    </div>
  );
}
