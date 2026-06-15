import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';

import SEO from '../components/SEO';
import { useSession } from '../contexts/AuthContext';
import Header from '../components/Header';
import { apiClient } from '../lib/api/apiClient';
import { useAppStore } from '../store/useAppStore';

import styles from './Add.module.css';

const AddFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  link: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  difficulty: z.string().optional(),
  platform: z.string().optional(),
  pattern: z.string().optional(),
  confidenceLevel: z.string().optional(),
  timeTaken: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export default function AddProblem() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const settings = useAppStore((state) => state.settings);
  const fetchSettings = useAppStore((state) => state.fetchSettings);

  const [utilities, setUtilities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformDesc, setNewPlatformDesc] = useState('');
  const [isSubmittingPlatform, setIsSubmittingPlatform] = useState(false);
  const [customTag, setCustomTag] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AddFormSchema),
    defaultValues: {
      id: '',
      title: '',
      link: '',
      difficulty: settings?.defaultDifficulty || 'Medium',
      platform: settings?.defaultPlatform || '',
      pattern: '',
      confidenceLevel: '',
      timeTaken: '',
      tags: [],
    },
  });

  const watchTags = watch('tags');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setValue('difficulty', settings?.defaultDifficulty || 'Medium');
    setValue('platform', settings?.defaultPlatform || '');
  }, [settings, setValue]);

  useEffect(() => {
    apiClient
      .getUtilities()
      .then((data) => {
        setUtilities(data);
        if (
          !watch('platform') &&
          !settings?.defaultPlatform &&
          data.platforms &&
          data.platforms.length > 0
        ) {
          setValue('platform', data.platforms[0].name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line

  const onSubmit = (data: z.infer<typeof AddFormSchema>) => {
    if (!session) {
      toast.error('You must be signed in to add a problem.');
      return;
    }

    apiClient
      .createCustomQuestion({
        platformId: data.id || null,
        title: data.title,
        link: data.link,
        difficulty: data.difficulty,
        platform: data.platform,
        pattern: data.pattern,
        confidenceLevel: data.confidenceLevel ? parseInt(data.confidenceLevel, 10) : null,
        timeTaken: data.timeTaken ? parseInt(data.timeTaken, 10) : null,
        tags: data.tags,
      })
      .then((res) => {
        if (res?.success || res?.question) {
          toast.success('Problem added to your tracker!');
          navigate('/');
        }
      })
      .catch(() => {});
  };

  const toggleTag = (tagName: string) => {
    const currentTags = watch('tags');
    if (currentTags.includes(tagName)) {
      setValue(
        'tags',
        currentTags.filter((t) => t !== tagName)
      );
    } else {
      setValue('tags', [...currentTags, tagName]);
    }
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
    <>
      <SEO title="Add Custom Problem | Tacker" />
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.headerArea}>
            <h1 className={styles.title}>Add Problem</h1>
            <p className={styles.subtitle}>Track a new custom problem.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.formCard}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>ID (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  {...register('id')}
                  placeholder="e.g. 1"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Title *</label>
                <input
                  type="text"
                  className={clsx(styles.input, errors.title && styles.errorInput)}
                  {...register('title')}
                  placeholder="e.g. Two Sum"
                />
                {errors.title && <p className={styles.errorText}>{errors.title.message}</p>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Link</label>
                <input
                  type="url"
                  className={clsx(styles.input, errors.link && styles.errorInput)}
                  {...register('link')}
                  placeholder="https://..."
                />
                {errors.link && <p className={styles.errorText}>{errors.link.message}</p>}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Difficulty</label>
                <select className={styles.select} {...register('difficulty')}>
                  {utilities.difficulties.map((d: any) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Platform</label>
                <select
                  className={styles.select}
                  {...register('platform')}
                  onChange={(e) => {
                    if (e.target.value === '___NEW___') {
                      setShowPlatformModal(true);
                      setValue('platform', utilities.platforms[0]?.name || 'Custom'); // reset temp
                    } else {
                      setValue('platform', e.target.value);
                    }
                  }}
                >
                  {utilities.platforms.length === 0 && <option value="Custom">Custom</option>}
                  {utilities.platforms.map((p: any) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  <option value="___NEW___">+ Add New Platform</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Pattern</label>
                <select className={styles.select} {...register('pattern')}>
                  <option value="">None / Unknown</option>
                  {utilities.patterns.map((p: any) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Confidence Level</label>
                <select className={styles.select} {...register('confidenceLevel')}>
                  <option value="">Not Solved Yet</option>
                  <option value="1">1 - Weak Memory (1d)</option>
                  <option value="2">2 - Medium Recall (3d)</option>
                  <option value="3">3 - Strong Recall (7d)</option>
                  <option value="4">4 - Mastered (14d+)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Time Taken (minutes)</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  {...register('timeTaken')}
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tags</label>
              {utilities.tags.length === 0 && watchTags.length === 0 ? (
                <p className={styles.emptyHint}>No tags defined. Type below to add custom tags.</p>
              ) : (
                <div className={styles.tagGrid}>
                  {Array.from(new Set([...utilities.tags.map((t: any) => t.name), ...watchTags])).map(
                    (tagName) => (
                      <button
                        key={tagName}
                        type="button"
                        onClick={() => toggleTag(tagName)}
                        className={clsx(styles.tagBtn, watchTags.includes(tagName) && styles.tagActive)}
                      >
                        {tagName}
                      </button>
                    )
                  )}
                </div>
              )}
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Type a custom tag and press Enter"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customTag.trim()) {
                        const newTag = customTag.trim();
                        if (!watchTags.includes(newTag)) {
                          setValue('tags', [...watchTags, newTag]);
                        }
                        setCustomTag('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTag.trim()) {
                      const newTag = customTag.trim();
                      if (!watchTags.includes(newTag)) {
                        setValue('tags', [...watchTags, newTag]);
                      }
                      setCustomTag('');
                    }
                  }}
                  className={styles.submitBtn}
                  style={{ padding: '0 16px', minWidth: '80px' }}
                >
                  Add
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={() => navigate('/')} className={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Add Problem
              </button>
            </div>
          </form>

          {showPlatformModal && (
            <div className={styles.modalOverlay} onClick={() => setShowPlatformModal(false)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>
                  Add New Platform
                </h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    placeholder="e.g. Codeforces"
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.label}>Description (Optional)</label>
                  <textarea
                    className={styles.textarea}
                    value={newPlatformDesc}
                    onChange={(e) => setNewPlatformDesc(e.target.value)}
                    placeholder="Competitive programming platform..."
                    rows={3}
                  />
                </div>
                <div className={styles.actions} style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowPlatformModal(false);
                      setNewPlatformName('');
                      setNewPlatformDesc('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={!newPlatformName.trim() || isSubmittingPlatform}
                    onClick={async () => {
                      if (!newPlatformName.trim()) return;
                      setIsSubmittingPlatform(true);
                      try {
                        const res = await apiClient.createMetadata('platforms', {
                          name: newPlatformName.trim(),
                          description: newPlatformDesc.trim(),
                        });
                        if (res && res.name) {
                          setUtilities((prev: any) => ({
                            ...prev,
                            platforms: [...prev.platforms, res],
                          }));
                          setValue('platform', res.name);
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
                    }}
                  >
                    {isSubmittingPlatform ? 'Adding...' : 'Add Platform'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
