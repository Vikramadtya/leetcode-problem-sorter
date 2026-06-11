'use client';

import { useRef, useEffect } from 'react';
import Timer from './Timer';
import styles from './ReflectionModal.module.css'; // Reusing styles

export default function ActiveAttemptModal({ question, onClose, onFailed, onSolved }) {
  const timerRef = useRef(null);

  const handleFailed = () => {
    const timeSpent = timerRef.current ? timerRef.current.getTime() : 0;
    onFailed(question.id, timeSpent);
  };

  const handleSolved = () => {
    const timeSpent = timerRef.current ? timerRef.current.getTime() : 0;
    onSolved(question.id, timeSpent);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Attempting: {question.title}</h2>
        <span className={`${styles.pill} ${styles[question.difficulty?.toLowerCase()]}`} style={{ marginBottom: '2rem', display: 'inline-block' }}>
          {question.difficulty}
        </span>
        
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0', transform: 'scale(1.5)' }}>
          <Timer ref={timerRef} autoStart={true} />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button 
            className={styles.cancelBtn} 
            onClick={handleFailed}
            style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          >
            I Failed
          </button>
          <button 
            className={styles.saveBtn} 
            onClick={handleSolved}
            style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', background: 'var(--success)', color: '#fff', border: 'none' }}
          >
            I Solved It
          </button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Cancel Attempt
          </button>
        </div>
      </div>
    </div>
  );
}
