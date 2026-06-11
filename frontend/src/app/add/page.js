'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api/apiClient';
import { useAppStore } from '../../store/useAppStore';
import styles from './page.module.css';

export default function AddProblem() {
  const { data: session } = useSession();
  const router = useRouter();
  const settings = useAppStore(state => state.settings);
  const fetchSettings = useAppStore(state => state.fetchSettings);

  const [utilities, setUtilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformDesc, setNewPlatformDesc] = useState('');
  const [isSubmittingPlatform, setIsSubmittingPlatform] = useState(false);
  const [customTag, setCustomTag] = useState('');
  
  const [form, setForm] = useState({
    id: '',
    title: '',
    link: '',
    difficulty: settings?.defaultDifficulty || 'Medium',
    platform: settings?.defaultPlatform || '',
    pattern: '',
    confidenceLevel: '',
    timeTaken: '',
    tags: []
  });

  // Fetch settings on mount just in case
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update form if settings load later and user hasn't changed it
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      difficulty: prev.difficulty || settings?.defaultDifficulty || 'Medium',
      platform: prev.platform || settings?.defaultPlatform || ''
    }));
  }, [settings]);

  useEffect(() => {
    apiClient.getUtilities()
      .then(data => {
        setUtilities(data);
        if (!form.platform && (!settings?.defaultPlatform) && data.platforms && data.platforms.length > 0) {
          setForm(prev => ({ ...prev, platform: data.platforms[0].name }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!session) {
      toast.error('You must be signed in to add a problem.');
      return;
    }

    apiClient.createCustomQuestion({
      id: form.id || null,
      title: form.title,
      link: form.link,
      difficulty: form.difficulty,
      platform: form.platform,
      pattern: form.pattern,
      confidenceLevel: form.confidenceLevel ? parseInt(form.confidenceLevel, 10) : null,
      timeTaken: form.timeTaken ? parseInt(form.timeTaken, 10) : null,
      tags: form.tags,
    })
    .then(data => {
      if (data?.success || data?.question) {
        toast.success('Problem added to your tracker!');
        router.push('/');
      }
    })
    .catch(() => {}); // Errors handled by apiClient toast
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
              <select className={styles.select} value={form.platform} onChange={e => {
                if (e.target.value === '___NEW___') {
                  setShowPlatformModal(true);
                } else {
                  setForm({...form, platform: e.target.value});
                }
              }}>
                {utilities.platforms.length === 0 && <option value="Custom">Custom</option>}
                {utilities.platforms.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="___NEW___">+ Add New Platform</option>
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
            {utilities.tags.length === 0 && form.tags.length === 0 ? (
              <p className={styles.emptyHint}>No tags defined. Type below to add custom tags.</p>
            ) : (
              <div className={styles.tagGrid}>
                {Array.from(new Set([...utilities.tags.map(t => t.name), ...form.tags])).map(tagName => (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className={`${styles.tagBtn} ${form.tags.includes(tagName) ? styles.tagActive : ''}`}
                  >
                    {tagName}
                  </button>
                ))}
              </div>
            )}
            <div style={{marginTop: '10px', display: 'flex', gap: '8px'}}>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Type a custom tag and press Enter" 
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (customTag.trim()) {
                      const newTag = customTag.trim();
                      if (!form.tags.includes(newTag)) {
                        setForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                      }
                      setCustomTag('');
                    }
                  }
                }}
              />
              <button type="button" onClick={() => {
                if (customTag.trim()) {
                  const newTag = customTag.trim();
                  if (!form.tags.includes(newTag)) {
                    setForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                  }
                  setCustomTag('');
                }
              }} className={styles.submitBtn} style={{padding: '0 16px', minWidth: '80px'}}>Add</button>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => router.push('/')} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn}>Add Problem</button>
          </div>
        </form>

        {showPlatformModal && (
          <div className={styles.modalOverlay} onClick={() => setShowPlatformModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3 style={{marginBottom: '16px', color: 'var(--text-main)'}}>Add New Platform</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={newPlatformName} 
                  onChange={e => setNewPlatformName(e.target.value)} 
                  placeholder="e.g. Codeforces" 
                  autoFocus 
                />
              </div>
              <div className={styles.formGroup} style={{marginTop: '12px'}}>
                <label className={styles.label}>Description (Optional)</label>
                <textarea 
                  className={styles.textarea} 
                  value={newPlatformDesc} 
                  onChange={e => setNewPlatformDesc(e.target.value)} 
                  placeholder="Competitive programming platform..." 
                  rows={3} 
                />
              </div>
              <div className={styles.actions} style={{marginTop: '20px'}}>
                <button type="button" className={styles.cancelBtn} onClick={() => {
                  setShowPlatformModal(false);
                  setNewPlatformName('');
                  setNewPlatformDesc('');
                  setForm(prev => ({...prev, platform: utilities.platforms[0]?.name || ''}));
                }}>Cancel</button>
                <button type="button" className={styles.submitBtn} disabled={!newPlatformName.trim() || isSubmittingPlatform} onClick={async () => {
                  if (!newPlatformName.trim()) return;
                  setIsSubmittingPlatform(true);
                  try {
                    const res = await apiClient.createMetadata('platforms', {
                      name: newPlatformName.trim(),
                      description: newPlatformDesc.trim()
                    });
                    if (res && res.name) {
                      setUtilities(prev => ({
                        ...prev,
                        platforms: [...prev.platforms, res]
                      }));
                      setForm(prev => ({...prev, platform: res.name}));
                      setShowPlatformModal(false);
                      setNewPlatformName('');
                      setNewPlatformDesc('');
                      toast.success(`Platform ${res.name} added!`);
                    }
                  } catch (err) {
                    toast.error('Failed to add platform');
                  } finally {
                    setIsSubmittingPlatform(false);
                  }
                }}>
                  {isSubmittingPlatform ? 'Adding...' : 'Add Platform'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
