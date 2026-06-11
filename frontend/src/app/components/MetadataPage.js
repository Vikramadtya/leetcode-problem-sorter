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
  standalone = true,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDesc(item.description || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleEditSave = async (item) => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const payload = { name: editName.trim() };
      if (showDescription) payload.description = editDesc.trim();
      const updated = await apiClient.updateMetadata(type, item.id, payload);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setEditingId(null);
    } catch {
      // Error toasts handled by apiClient
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await apiClient.deleteMetadata(type, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      // Error toasts handled by apiClient
    }
  };

  const content = (
    <main className={styles.main} style={!standalone ? { padding: 0 } : {}}>
      {standalone && (
        <div className={styles.headerArea}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      )}


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
                {editingId === item.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className={styles.input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: '0.4rem' }}
                      autoFocus
                    />
                    {showDescription && (
                      <input
                        type="text"
                        className={styles.input}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button className={styles.submitBtn} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditSave(item)} disabled={savingEdit}>
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button className={styles.submitBtn} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={handleEditCancel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.tagItemHeader}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {type === 'tags' && <img src="/icons/tag.svg" alt="Tag" width={16} height={16} />} {item.name}
                        </strong>
                        {item.description && (
                          <span className={styles.tagItemDesc}>{item.description}</span>
                        )}
                      </div>
                      <div className={styles.tagItemActions}>
                        <button className={styles.iconBtn} onClick={() => handleEditStart(item)} aria-label="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(item)} aria-label="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
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
  );

  if (!standalone) return content;

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      {content}
    </div>
  );
}
