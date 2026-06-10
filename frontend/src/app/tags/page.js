'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { apiClient } from '../../lib/api/apiClient';
import config from '../../config.json';
import styles from '../add/page.module.css';

export default function TagsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authEnabled = config.features.authEnabled;

  useEffect(() => {
    apiClient.getMetadata('tags')
      .then(data => { setItems(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiClient.createMetadata('tags', { name: newName.trim() });
      setItems(prev => [...prev, created]);
      setNewName('');
    } catch {
      // handled by apiClient
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <div className={styles.headerArea}>
          <h1 className={styles.title}>Tags</h1>
          <p className={styles.subtitle}>Manage custom tags for categorising problems.</p>
        </div>

        <form onSubmit={handleAdd} className={styles.formCard} style={{ marginBottom: '2rem' }}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tag Name *</label>
              <input
                type="text"
                className={styles.input}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Interview Favourite"
                required
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Tag'}
            </button>
          </div>
        </form>

        {loading ? (
          <p>Loading tags...</p>
        ) : (
          <div className={styles.tagGrid}>
            {items.map(item => (
              <button key={item.id} className={styles.tagBtn} style={{ cursor: 'default' }}>
                {item.name}
              </button>
            ))}
            {items.length === 0 && <p>No tags defined yet. Add one above.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
