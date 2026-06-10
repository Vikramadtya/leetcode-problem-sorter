'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import styles from './page.module.css';

export default function AddProblem() {
  const { data: session } = useSession();
  const router = useRouter();
  const [utilities, setUtilities] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    id: '',
    title: '',
    link: '',
    difficulty: 'Medium',
    platform: '',
    pattern: '',
    confidenceLevel: '',
    timeTaken: '',
    tags: []
  });

  useEffect(() => {
    fetch('/api/utilities')
      .then(res => res.json())
      .then(data => {
        setUtilities(data);
        if (data.platforms && data.platforms.length > 0) {
          setForm(prev => ({ ...prev, platform: data.platforms[0].name }));
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!session) return;

    fetch('/api/custom-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id || null,
        title: form.title,
        link: form.link,
        difficulty: form.difficulty,
        platform: form.platform,
        pattern: form.pattern,
        confidenceLevel: form.confidenceLevel ? parseInt(form.confidenceLevel) : null,
        timeTaken: form.timeTaken ? parseInt(form.timeTaken) : null,
        tags: form.tags.join(',')
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success || data.question) {
          router.push('/');
        }
      });
  };

  const toggleTag = (tagName) => {
    setForm(prev => {
      if (prev.tags.includes(tagName)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagName) };
      }
      return { ...prev, tags: [...prev.tags, tagName] };
    });
  };

  if (loading || !utilities) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <p>Loading utilities...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header authEnabled={true} />
      <main className={styles.main}>
        <div className={styles.headerArea}>
          <h1 className={styles.title}>Add Problem</h1>
          <p className={styles.subtitle}>Track a new custom problem.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>ID (Optional)</label>
              <input type="text" className={styles.input} value={form.id} onChange={e => setForm({...form, id: e.target.value})} placeholder="e.g. 1" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Title *</label>
              <input required type="text" className={styles.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Two Sum" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Link</label>
              <input type="url" className={styles.input} value={form.link} onChange={e => setForm({...form, link: e.target.value})} placeholder="https://..." />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Difficulty</label>
              <select className={styles.select} value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
                {utilities.difficulties.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Platform</label>
              <select className={styles.select} value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                {utilities.platforms.length === 0 && <option value="Custom">Custom</option>}
                {utilities.platforms.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pattern</label>
              <select className={styles.select} value={form.pattern} onChange={e => setForm({...form, pattern: e.target.value})}>
                <option value="">None / Unknown</option>
                {utilities.patterns.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Confidence Level</label>
              <select className={styles.select} value={form.confidenceLevel} onChange={e => setForm({...form, confidenceLevel: e.target.value})}>
                <option value="">Not Solved Yet</option>
                <option value="1">1 - Weak Memory (1d)</option>
                <option value="2">2 - Medium Recall (3d)</option>
                <option value="3">3 - Strong Recall (7d)</option>
                <option value="4">4 - Mastered (14d+)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Time Taken (minutes)</label>
              <input type="number" min="0" className={styles.input} value={form.timeTaken} onChange={e => setForm({...form, timeTaken: e.target.value})} placeholder="e.g. 15" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tags</label>
            {utilities.tags.length === 0 ? (
              <p className={styles.emptyHint}>No tags defined. Add them in the Tags page.</p>
            ) : (
              <div className={styles.tagGrid}>
                {utilities.tags.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.name)}
                    className={`${styles.tagBtn} ${form.tags.includes(t.name) ? styles.tagActive : ''}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => router.push('/')} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn}>Add Problem</button>
          </div>
        </form>
      </main>
    </div>
  );
}
