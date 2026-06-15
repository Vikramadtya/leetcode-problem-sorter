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
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // KaTeX CSS
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

import styles from './NotesModal.module.css';

interface Question {
  id: string;
  title: string;
  progress?: {
    notes?: string;
  };
}

interface NotesModalProps {
  question: Question | null;
  onClose: () => void;
  onSave: (questionId: string, notes: string) => void;
}

export default function NotesModal({ question, onClose, onSave }: NotesModalProps) {
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
            <div className={styles.editorContainer}>
              <CodeMirror
                value={notesDraft}
                height="300px"
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                theme={vscodeDark}
                onChange={(val) => setNotesDraft(val)}
                className={styles.codeMirror}
              />
            </div>
          ) : (
            <div className={styles.preview}>
              {notesDraft ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                        />
                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {DOMPurify.sanitize(notesDraft)}
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
