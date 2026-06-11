'use client';

import React, { useState, useEffect } from 'react';
import styles from './ActiveAttemptModal.module.css';

export default function ActiveAttemptModal({ question, onClose, onFailed, onSolved }) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Prevent scrolling on the body while the full-screen modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFailed = () => {
    onFailed(question.id, seconds);
  };

  const handleSolved = () => {
    onSolved(question.id, seconds);
  };

  const handleStop = () => {
    onClose();
  };

  const diffClass = question.difficulty ? styles[question.difficulty.toLowerCase()] : '';

  return (
    <div className={styles.fullscreenOverlay}>
      <div className={styles.timerContainer}>
        <h2 className={styles.questionTitle}>Focusing on: {question.title}</h2>
        <span className={`${styles.pill} ${diffClass}`}>
          {question.difficulty}
        </span>
        
        <div className={styles.timeDisplay}>
          {formatTime(seconds)}
        </div>
        
        <div className={styles.controlsRow}>
          <button className={styles.controlBtn} onClick={() => setIsActive(!isActive)} title={isActive ? "Pause" : "Resume"}>
            {isActive ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <button className={styles.controlBtn} onClick={handleStop} title="Stop & Forget">
            ⏹️ Stop
          </button>
        </div>

        <div className={styles.actionRow}>
          <button className={`${styles.actionBtn} ${styles.failBtn}`} onClick={handleFailed}>
            I Failed
          </button>
          <button className={`${styles.actionBtn} ${styles.successBtn}`} onClick={handleSolved}>
            I Solved It
          </button>
        </div>
      </div>
    </div>
  );
}
