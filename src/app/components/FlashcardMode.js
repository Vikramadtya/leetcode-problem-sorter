import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './FlashcardMode.module.css';

export default function FlashcardMode({ questions, progress, onClose, onSetConfidence }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

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
  const qProgress = progress[currentQ.ID];
  
  const handleScore = (level) => {
    onSetConfidence(currentQ.ID, level);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      onClose(); // Finished
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3>Quick Recall Session</h3>
          <span className={styles.counter}>{currentIndex + 1} / {questions.length}</span>
        </div>
        
        <div className={styles.flashcardContainer}>
          {!isFlipped ? (
            <div className={styles.cardFront}>
              <h2 className={styles.qTitle}>{currentQ.Title}</h2>
              <div className={styles.tags}>
                <span className={`${styles.pill} ${styles[currentQ.Difficulty?.toLowerCase()]}`}>{currentQ.Difficulty}</span>
                {currentQ.Pattern && <span className={styles.pill}>{currentQ.Pattern}</span>}
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
              <h2 className={styles.qTitle}>{currentQ.Title}</h2>
              <div className={styles.notesArea}>
                {qProgress?.notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {qProgress.notes}
                  </ReactMarkdown>
                ) : (
                  <p className={styles.emptyNotes}>No notes saved for this problem.</p>
                )}
              </div>
              <div className={styles.scoreActions}>
                <p>How well did you remember?</p>
                <div className={styles.btnRow}>
                  <button className={`${styles.scoreBtn} ${styles.score1}`} onClick={() => handleScore(1)}>Forgot Completely (1d)</button>
                  <button className={`${styles.scoreBtn} ${styles.score2}`} onClick={() => handleScore(2)}>Needed Hints (3d)</button>
                  <button className={`${styles.scoreBtn} ${styles.score3}`} onClick={() => handleScore(3)}>Recalled (7d)</button>
                  <button className={`${styles.scoreBtn} ${styles.score4}`} onClick={() => handleScore(4)}>Mastered (14d)</button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <button className={styles.closeFloatBtn} onClick={onClose}>Exit</button>
      </div>
    </div>
  );
}
