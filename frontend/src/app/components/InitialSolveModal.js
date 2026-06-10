import { useState } from 'react';
import styles from './ReflectionModal.module.css'; // Reuse styles

export default function InitialSolveModal({ question, patterns = [], onClose, onSave }) {
  const [solutionLink, setSolutionLink] = useState('');
  const [notes, setNotes] = useState('');
  // B-6 FIX: pattern is on progress, not the question root
  const [pattern, setPattern] = useState(question.progress?.pattern || '');
  const [memoryStrength, setMemoryStrength] = useState(3);

  const strengths = [
    { level: 1, label: 'Low', days: '1 day' },
    { level: 2, label: 'Medium', days: '3 days' },
    { level: 3, label: 'High', days: '7 days' },
    { level: 4, label: 'Mastered', days: '14+ days' },
  ];

  const handleSave = () => {
    onSave(question.id, { solutionLink, notes, pattern, memoryStrength });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Mark Solved: {question.title}</h3>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label>Solution Link (Optional)</label>
            <input 
              type="url"
              className={styles.input}
              placeholder="e.g., https://leetcode.com/problems/..."
              value={solutionLink}
              onChange={e => setSolutionLink(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Notes / Key Insights (Optional)</label>
            <textarea 
              className={styles.textarea}
              placeholder="Any specific tricks or gotchas for this problem?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Pattern</label>
            <select 
              className={styles.select}
              value={pattern}
              onChange={e => setPattern(e.target.value)}
            >
              <option value="">+ Select Pattern</option>
              {patterns.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Confidence Level</label>
            <div className={styles.strengthGrid}>
              {strengths.map(s => (
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
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Mark as Solved</button>
        </div>
      </div>
    </div>
  );
}
