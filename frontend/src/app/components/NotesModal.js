'use client';

/**
 * NotesModal — Markdown-enabled notes editor for a single question.
 *
 * Props:
 *   question  QuestionWithProgress
 *   onClose   () => void
 *   onSave    (questionId: string, notes: string) => void
 *
 * Uses its own CSS module (NotesModal.module.css) — does NOT depend on page.module.css.
 */
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './NotesModal.module.css';

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
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Notes for ${question.title}`}
    >
      <div className={styles.modal}>
        {/* ── Header: title + Edit/Preview tabs ── */}
        <div className={styles.header}>
          <h3>Notes &amp; Approach: {question.title}</h3>
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={!isEditing}
              className={`${styles.tabBtn} ${!isEditing ? styles.tabActive : ''}`}
              onClick={() => setIsEditing(false)}
            >
              Preview
            </button>
            <button
              role="tab"
              aria-selected={isEditing}
              className={`${styles.tabBtn} ${isEditing ? styles.tabActive : ''}`}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          </div>
        </div>

        {/* ── Body: editor or markdown preview ── */}
        <div className={styles.body}>
          {isEditing ? (
            <textarea
              className={styles.textarea}
              rows={15}
              placeholder="Write your approach, time complexity, or paste your solution using Markdown…"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              autoFocus
              aria-label="Notes editor"
            />
          ) : (
            <div className={styles.preview}>
              {notesDraft ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                        />
                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {notesDraft}
                </ReactMarkdown>
              ) : (
                <p className={styles.emptyPreview}>No notes yet. Click Edit to add some.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Close
          </button>
          {isEditing && (
            <button type="button" onClick={handleSave} className={styles.saveBtn}>
              Save Notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
