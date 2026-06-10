'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../../store/useAppStore';
import styles from '../page.module.css';

/**
 * NotesModal — shared by Tracker and Explore pages.
 * 
 * Props:
 *   question  QuestionWithProgress
 *   onClose   () => void
 *   onSave    (questionId, notes: string) => void
 */
export default function NotesModal({ question, onClose, onSave }) {
  const [notesDraft, setNotesDraft] = useState(question?.progress?.notes || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = useCallback(() => {
    if (!question) return;
    onSave(question.id, notesDraft);
    setIsEditing(false);
  }, [question, notesDraft, onSave]);

  if (!question) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={`Notes for ${question.title}`}>
      <div className={styles.modalContent} style={{ maxWidth: '800px', minHeight: '400px' }}>
        <div className={styles.modalHeader}>
          <h3>Notes & Approach: {question.title}</h3>
          <div className={styles.modalTabs}>
            <button
              className={`${styles.tabBtn} ${!isEditing ? styles.tabActive : ''}`}
              onClick={() => setIsEditing(false)}
              aria-pressed={!isEditing}
            >Preview</button>
            <button
              className={`${styles.tabBtn} ${isEditing ? styles.tabActive : ''}`}
              onClick={() => setIsEditing(true)}
              aria-pressed={isEditing}
            >Edit</button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {isEditing ? (
            <textarea
              className={styles.modalTextarea}
              rows={15}
              placeholder="Write your approach, time complexity, or paste your solution using Markdown..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              autoFocus
              aria-label="Notes editor"
            />
          ) : (
            <div className={styles.markdownPreview}>
              {notesDraft ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{notesDraft}</ReactMarkdown>
              ) : (
                <p className={styles.emptyState}>No notes yet. Click Edit to add some.</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.modalCancelBtn}>Close</button>
          {isEditing && (
            <button type="button" onClick={handleSave} className={styles.modalSubmitBtn}>
              Save Notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
