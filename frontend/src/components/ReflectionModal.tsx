import { useState } from 'react';

import styles from './ReflectionModal.module.css';

export default function ReflectionModal({ question, patterns = [], onClose, onSave }) {
  const [insight, setInsight] = useState('');
  const [pattern, setPattern] = useState(question.progress?.pattern || '');
  const [memoryStrength, setMemoryStrength] = useState(3);

  const strengths = [
    { level: 1, label: 'Weak Memory', days: '1 day' },
    { level: 2, label: 'Medium Recall', days: '3 days' },
    { level: 3, label: 'Strong Recall', days: '7 days' },
    { level: 4, label: 'Mastered', days: '14+ days' },
  ];

  const handleSave = () => {
    onSave(question.id, { insight, pattern, memoryStrength });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Review: {question.title}</h3>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label>What was the key insight or mistake?</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g., I forgot to initialize the array with Infinity... or The trick is using a monotonic stack."
              value={insight}
              onChange={(e) => setInsight(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>What pattern is this?</label>
            <select
              className={styles.select}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              <option value="">+ Select Pattern</option>
              {patterns.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Memory Strength (How well do you know this?)</label>
            <div className={styles.strengthGrid}>
              {strengths.map((s) => (
                <button
                  key={s.level}
                  className={`${styles.strengthBtn} ${memoryStrength === s.level ? styles.strengthActive : ''}`}
                  onClick={() => setMemoryStrength(s.level)}
                >
                  <span className={styles.strengthLabel}>{s.label}</span>
                  <span className={styles.strengthDays}>Next review: {s.days}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save Reflection
          </button>
        </div>
      </div>
    </div>
  );
}
