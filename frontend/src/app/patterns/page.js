'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { apiClient } from '../../lib/api/apiClient';
import config from '../../config.json';
import styles from '../add/page.module.css';

export default function PatternsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authEnabled = config.features.authEnabled;

  useEffect(() => {
    apiClient.getMetadata('patterns')
      .then(data => { setItems(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiClient.createMetadata('patterns', { name: newName.trim(), description: newDesc.trim() });
      setItems(prev => [...prev, created]);
      setNewName('');
      setNewDesc('');
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
          <h1 className={styles.title}>Patterns</h1>
          <p className={styles.subtitle}>Manage algorithmic patterns used to categorise problems.</p>
        </div>

        <form onSubmit={handleAdd} className={styles.formCard} style={{ marginBottom: '2rem' }}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pattern Name *</label>
              <input
                type="text"
                className={styles.input}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Monotonic Stack"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <input
                type="text"
                className={styles.input}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Pattern'}
            </button>
          </div>
        </form>

        {loading ? (
          <p>Loading patterns...</p>
        ) : (
          <div className={styles.tagGrid}>
            {items.map(item => (
              <div key={item.id} className={styles.tagBtn} style={{ cursor: 'default' }}>
                <strong>{item.name}</strong>
                {item.description && <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.7 }}>{item.description}</span>}
              </div>
            ))}
            {items.length === 0 && <p>No patterns defined yet. Add one above.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
