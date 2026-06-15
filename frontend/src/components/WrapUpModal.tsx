import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import styles from './ReflectionModal.module.css'; // Reusing modal styles

export default function WrapUpModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWrapUp() {
      try {
        const res = await fetch('/api/v1/wrapup');
        if (!res.ok) throw new Error('Failed to fetch wrap up');
        const json = await res.json();
        setData(json);
      } catch (e) {
        toast.error('Failed to load wrap up');
        onClose();
      } finally {
        setLoading(false);
      }
    }
    fetchWrapUp();
  }, [onClose]);

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent} style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>Gathering your weekly stats...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalContent}
        style={{
          background: 'linear-gradient(135deg, var(--bg-card), var(--bg-main))',
          border: '1px solid var(--primary)',
        }}
      >
        <div className={styles.modalHeader} style={{ borderBottom: 'none', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉 Week in Review 🎉</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Here is what you accomplished in the last 7 days.
          </p>
        </div>

        <div
          className={styles.modalBody}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-hover)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {data.totalSolved}
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Problems Solved
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-hover)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              {data.totalHours}
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Hours Spent
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-hover)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
              {data.longestStreak}
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Day Streak
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-hover)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--success)',
                minHeight: '3rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {data.topPattern}
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Top Pattern
            </div>
          </div>
        </div>

        <div
          className={styles.modalActions}
          style={{ marginTop: '2rem', justifyContent: 'center' }}
        >
          <button
            className={styles.saveBtn}
            onClick={onClose}
            style={{
              padding: '0.75rem 3rem',
              fontSize: '1.1rem',
              borderRadius: 'var(--radius-full)',
            }}
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
