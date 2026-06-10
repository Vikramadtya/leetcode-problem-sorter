import { useState, useEffect } from 'react';
import styles from './FocusMode.module.css';

export default function FocusMode({ question, onClose, onSaveTime }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
        setTimeSpent(t => t + 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Play a sound or show notification here
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const handleFinish = () => {
    if (timeSpent > 0) {
      onSaveTime(question.ID, timeSpent);
    }
    onClose();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={styles.focusOverlay}>
      <div className={styles.focusContainer}>
        <div className={styles.header}>
          <h2>Focus Mode</h2>
          <button onClick={handleFinish} className={styles.closeBtn}>✕ Close</button>
        </div>
        
        <div className={styles.questionCard}>
          <h3>{question.Title}</h3>
          <div className={styles.metaRow}>
            <span className={styles.pill}>{question.Difficulty}</span>
            {question.Platform && <span className={styles.pillOutline}>{question.Platform}</span>}
          </div>
          <a href={question.URL || question['Title Link']} target="_blank" rel="noreferrer" className={styles.solveLink}>
            Open Problem ↗
          </a>
        </div>

        <div className={styles.timerSection}>
          <div className={styles.timerDisplay}>
            {formatTime(timeLeft)}
          </div>
          <div className={styles.timerControls}>
            <button onClick={toggleTimer} className={styles.playPauseBtn}>
              {isActive ? 'Pause' : 'Start Focus'}
            </button>
            <button onClick={resetTimer} className={styles.resetBtn}>Reset</button>
          </div>
        </div>
        
        <div className={styles.footer}>
          Time spent in this session will be automatically saved when you close.
        </div>
      </div>
    </div>
  );
}
