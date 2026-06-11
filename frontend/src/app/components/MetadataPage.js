'use client';

/**
 * MetadataPage — Reusable page shell for Tags, Patterns, and Platforms.
 *
 * All three management pages share identical structure:
 *   - A heading + subtitle
 *   - A form to add a new item (name + optional description)
 *   - A tag-grid listing all existing items
 *
 * Props:
 *   type        'tags' | 'patterns' | 'platforms'  — API endpoint key
 *   title       string  — page heading
 *   subtitle    string  — page subheading
 *   namePlaceholder    string  — placeholder for the name input
 *   descPlaceholder    string  — placeholder for the description input (optional)
 *   addLabel    string  — submit button label
 *   showDescription  boolean  — whether to show the description field
 */
import { useState, useEffect } from 'react';
import Header from './Header';
import { apiClient } from '../../lib/api/apiClient';
import config from '../../config.json';
import styles from './MetadataPage.module.css';

export default function MetadataPage({
  type,
  title,
  subtitle,
  namePlaceholder,
  descPlaceholder,
  addLabel = 'Add',
  showDescription = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authEnabled = config.features.authEnabled;

  // Fetch existing items on mount
  useEffect(() => {
    apiClient
      .getMetadata(type)
      .then((data) => {
        setItems(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [type]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const payload = { name: newName.trim() };
      if (showDescription) payload.description = newDesc.trim();
      const created = await apiClient.createMetadata(type, payload);
      setItems((prev) => [...prev, created]);
      setNewName('');
      setNewDesc('');
    } catch {
      // Error toasts handled by apiClient
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <div className={styles.headerArea}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {/* ── Add form ── */}
        <form onSubmit={handleAdd} className={styles.formCard}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name *</label>
              <input
                type="text"
                className={styles.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={namePlaceholder}
                required
                aria-label={`${title} name`}
              />
            </div>
            {showDescription && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={descPlaceholder || 'Optional description'}
                  aria-label={`${title} description`}
                />
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Adding…' : addLabel}
            </button>
          </div>
        </form>

        {/* ── Items grid ── */}
        {loading ? (
          <p className={styles.emptyHint}>Loading {title.toLowerCase()}…</p>
        ) : (
          <div className={styles.tagGrid}>
            {items.map((item) => (
              <div key={item.id} className={styles.tagItem}>
                <strong>{item.name}</strong>
                {item.description && (
                  <span className={styles.tagItemDesc}>{item.description}</span>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <p className={styles.emptyHint}>
                No {title.toLowerCase()} defined yet. Add one above.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
