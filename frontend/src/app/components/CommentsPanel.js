'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './CommentsPanel.module.css';

export default function CommentsPanel({ question, onClose, apiClient }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getComments(question.id || question.uuid);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (question) {
      fetchComments();
    }
  }, [question]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    try {
      setPosting(true);
      const added = await apiClient.addComment(question.id || question.uuid, newComment);
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleEditStart = (c) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleEditSave = async (c) => {
    if (!editContent.trim()) return;
    try {
      setSavingEdit(true);
      const updated = await apiClient.updateComment(c.id, editContent);
      setComments(prev => prev.map(item => item.id === c.id ? updated : item));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await apiClient.deleteComment(c.id);
      setComments(prev => prev.filter(item => item.id !== c.id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!question) return null;

  return (
    <div className={styles.overlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Comments</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close comments">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.emptyState}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className={styles.emptyState}>No comments yet. Be the first to share your thoughts!</div>
          ) : (
            comments.map(c => (
              <div key={c.id} className={styles.commentCard}>
                <div className={styles.commentHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>You</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className={styles.commentActions}>
                    <button className={styles.iconBtn} onClick={() => handleEditStart(c)} aria-label="Edit comment">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button className={styles.iconBtn} onClick={() => handleDelete(c)} aria-label="Delete comment" style={{ color: '#ef4444' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                {editingId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <textarea
                      className={styles.textarea}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{ minHeight: '60px', padding: '0.5rem' }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className={styles.postBtn} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditSave(c)} disabled={savingEdit}>
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button className={styles.postBtn} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} onClick={handleEditCancel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.commentContent}>{c.content}</div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handlePost();
              }
            }}
          />
          <button 
            className={styles.postBtn} 
            onClick={handlePost}
            disabled={posting || !newComment.trim()}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
