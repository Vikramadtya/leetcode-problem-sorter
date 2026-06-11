'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './CommentsPanel.module.css';

export default function CommentsPanel({ question, onClose, apiClient }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  
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
                  <span>You</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div className={styles.commentContent}>{c.content}</div>
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
