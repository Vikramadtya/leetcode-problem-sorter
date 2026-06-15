import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import SEO from '../components/SEO';
import { useSession } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import Header from '../components/Header';
import { apiClient } from '../lib/api/apiClient';


import styles from './Comments.module.css';

export default function CommentsPage() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [typeFilter, setTypeFilter] = useState('coding'); // 'all', 'coding', 'system-design'

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate('/');
    }
  }, [status, navigate]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    apiClient
      .getAllComments()
      .then((data) => setComments(data))
      .catch(() => toast.error('Failed to load comments'))
      .finally(() => setLoading(false));
  }, [status]);

  // Group comments by question ID and filter by type
  const groupedComments = useMemo(() => {
    const groups = {};
    for (const c of comments) {
      if (typeFilter !== 'all' && c.questionType !== typeFilter) {
        continue;
      }
      if (!groups[c.question_id]) {
        groups[c.question_id] = {
          questionId: c.question_id,
          questionTitle: c.questionTitle || c.question_id,
          questionDifficulty: c.questionDifficulty,
          questionType: c.questionType,
          questionUrl: c.questionUrl,
          platformId: c.platformId,
          comments: [],
        };
      }
      groups[c.question_id].comments.push(c);
    }
    return Object.values(groups);
  }, [comments, typeFilter]);

  if (status === 'loading' || status === 'unauthenticated') return null;

  const toggleGroup = (qId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const getDifficultyClass = (diff) => {
    if (!diff) return '';
    const d = diff.toLowerCase();
    if (d === 'easy') return styles.diffEasy;
    if (d === 'medium') return styles.diffMedium;
    if (d === 'hard') return styles.diffHard;
    return '';
  };

  const handleEditStart = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleEditSave = async (comment) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await apiClient.updateComment(comment.id, editContent.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, content: updated.content } : c))
      );
      setEditingId(null);
    } catch {
      // Error handled in apiClient
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await apiClient.deleteComment(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch {
      // Error handled in apiClient
    }
  };

  return (
    <>
      <SEO title="Community Comments | Tacker" />
      <Header authEnabled={true} />
      <main className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Your Comments</h1>
            <p className={styles.subtitle}>All your notes and comments across every question.</p>
          </div>
          <div className={styles.filters}>
            <div className={styles.segmentedControl}>
              <button
                className={`${styles.segmentBtn} ${typeFilter === 'coding' ? styles.activeSegment : ''}`}
                onClick={() => setTypeFilter('coding')}
              >
                Coding
              </button>
              <button
                className={`${styles.segmentBtn} ${typeFilter === 'system-design' ? styles.activeSegment : ''}`}
                onClick={() => setTypeFilter('system-design')}
              >
                System Design
              </button>
              <button
                className={`${styles.segmentBtn} ${typeFilter === 'all' ? styles.activeSegment : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading comments...</div>
        ) : groupedComments.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <p>You haven't made any comments yet.</p>
          </div>
        ) : (
          <div className={styles.contentArea}>
            {groupedComments.map((group) => {
              const isExpanded = expandedGroups[group.questionId];
              return (
                <div key={group.questionId} className={styles.questionGroup}>
                  <div className={styles.groupHeader} onClick={() => toggleGroup(group.questionId)}>
                    <div className={styles.headerLeft}>
                      <div className={styles.questionTitle}>{group.questionTitle}</div>
                      <div className={styles.questionMeta}>
                        {group.questionDifficulty && (
                          <span
                            className={`${styles.pill} ${getDifficultyClass(group.questionDifficulty)}`}
                          >
                            {group.questionDifficulty.charAt(0).toUpperCase() +
                              group.questionDifficulty.slice(1)}
                          </span>
                        )}
                        {group.platformId && <span>{group.platformId}</span>}
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <img src="/icons/comment.svg" alt="Comment" width={16} height={16} />{' '}
                          {group.comments.length} comment{group.comments.length > 1 ? 's' : ''}
                        </span>
                        {group.questionUrl && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <a
                              href={group.questionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.openLink}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open Question ↗
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.commentsList}>
                      {group.comments.map((c) => (
                        <div key={c.id} className={styles.commentCard}>
                          <div className={styles.commentHeader}>
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <img src="/icons/calendar.svg" alt="Date" width={16} height={16} />{' '}
                              {new Date(c.created_at).toLocaleDateString()} at{' '}
                              {new Date(c.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <div className={styles.commentActions}>
                              <button
                                className={styles.iconBtn}
                                onClick={() => handleEditStart(c)}
                                title="Edit comment"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className={styles.iconBtn}
                                onClick={() => handleDelete(c)}
                                title="Delete comment"
                                style={{ color: 'var(--error)' }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {editingId === c.id ? (
                            <div className={styles.editForm}>
                              <textarea
                                className={styles.editArea}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                autoFocus
                              />
                              <div className={styles.editActions}>
                                <button
                                  className={styles.cancelBtn}
                                  onClick={handleEditCancel}
                                  disabled={savingEdit}
                                >
                                  Cancel
                                </button>
                                <button
                                  className={styles.saveBtn}
                                  onClick={() => handleEditSave(c)}
                                  disabled={savingEdit}
                                >
                                  {savingEdit ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.commentContent}>
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
                                {DOMPurify.sanitize(c.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
