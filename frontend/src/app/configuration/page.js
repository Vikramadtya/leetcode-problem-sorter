'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../store/useAppStore';
import Header from '../components/Header';
import { toast } from 'react-hot-toast';
import styles from './page.module.css';

// Import metadata components
import MetadataPage from '../components/MetadataPage';

const TABS = ['Preferences', 'Tags', 'Patterns', 'Platforms'];

export default function ConfigurationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('Preferences');

  const settings = useAppStore(state => state.settings);
  const fetchSettings = useAppStore(state => state.fetchSettings);
  const updateSettings = useAppStore(state => state.updateSettings);

  const [form, setForm] = useState({
    dailyGoal: '2',
    weeklyGoal: '10',
    srsLevel1: '1',
    srsLevel2: '3',
    srsLevel3: '7',
    srsLevel4: '14',
    maxFlashcards: '20',
    weekStart: '0',
    defaultDifficulty: 'Medium',
    defaultPlatform: 'LeetCode',
    heatmapTheme: 'green'
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setForm({
      dailyGoal: settings.dailyGoal || '2',
      weeklyGoal: settings.weeklyGoal || '10',
      srsLevel1: settings.srsLevel1 || '1',
      srsLevel2: settings.srsLevel2 || '3',
      srsLevel3: settings.srsLevel3 || '7',
      srsLevel4: settings.srsLevel4 || '14',
      maxFlashcards: settings.maxFlashcards || '20',
      weekStart: settings.weekStart || '0',
      defaultDifficulty: settings.defaultDifficulty || 'Medium',
      defaultPlatform: settings.defaultPlatform || 'LeetCode',
      heatmapTheme: settings.heatmapTheme || 'green'
    });
  }, [settings]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(form);
      toast.success('Settings saved successfully!');
    } catch (err) {
      // Error handled in store
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Tags':
        return (
          <MetadataPage
            type="tags"
            title="Tags"
            subtitle="Manage custom tags for categorising problems."
            namePlaceholder="e.g. Interview Favourite"
            addLabel="Add Tag"
            standalone={false}
          />
        );
      case 'Patterns':
        return (
          <MetadataPage
            type="patterns"
            title="Patterns"
            subtitle="Define problem-solving patterns."
            namePlaceholder="e.g. Sliding Window"
            descPlaceholder="Optional pattern description"
            showDescription
            addLabel="Add Pattern"
            standalone={false}
          />
        );
      case 'Platforms':
        return (
          <MetadataPage
            type="platforms"
            title="Platforms"
            subtitle="Manage platforms where you solve problems."
            namePlaceholder="e.g. Codeforces"
            descPlaceholder="Optional URL or description"
            showDescription
            addLabel="Add Platform"
            standalone={false}
          />
        );
      case 'Preferences':
      default:
        return (
          <form className={styles.formContainer} onSubmit={handleSave}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🎯</span>
                <h2 className={styles.sectionTitle}>Goals & Tracking</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="dailyGoal" className={styles.label}>Daily Goal</label>
                  <p className={styles.hint}>Problems to solve each day.</p>
                  <input id="dailyGoal" name="dailyGoal" type="number" min="1" max="50" className={styles.input} value={form.dailyGoal} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="weeklyGoal" className={styles.label}>Weekly Goal</label>
                  <p className={styles.hint}>Problems to solve each week.</p>
                  <input id="weeklyGoal" name="weeklyGoal" type="number" min="1" max="200" className={styles.input} value={form.weeklyGoal} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🧠</span>
                <h2 className={styles.sectionTitle}>Spaced Repetition Algorithm</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel1" className={styles.label}>Level 1 Interval (Days)</label>
                  <input id="srsLevel1" name="srsLevel1" type="number" min="1" className={styles.input} value={form.srsLevel1} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel2" className={styles.label}>Level 2 Interval (Days)</label>
                  <input id="srsLevel2" name="srsLevel2" type="number" min="1" className={styles.input} value={form.srsLevel2} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel3" className={styles.label}>Level 3 Interval (Days)</label>
                  <input id="srsLevel3" name="srsLevel3" type="number" min="1" className={styles.input} value={form.srsLevel3} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel4" className={styles.label}>Level 4 Interval (Days)</label>
                  <input id="srsLevel4" name="srsLevel4" type="number" min="1" className={styles.input} value={form.srsLevel4} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="maxFlashcards" className={styles.label}>Max Flashcards per Session</label>
                  <input id="maxFlashcards" name="maxFlashcards" type="number" min="5" max="100" className={styles.input} value={form.maxFlashcards} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">📝</span>
                <h2 className={styles.sectionTitle}>Custom Problem Defaults</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="defaultDifficulty" className={styles.label}>Default Difficulty</label>
                  <select id="defaultDifficulty" name="defaultDifficulty" className={styles.input} value={form.defaultDifficulty} onChange={handleChange}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="defaultPlatform" className={styles.label}>Default Platform</label>
                  <input id="defaultPlatform" name="defaultPlatform" type="text" className={styles.input} value={form.defaultPlatform} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🎨</span>
                <h2 className={styles.sectionTitle}>Appearance & Layout</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="weekStart" className={styles.label}>Start of Week</label>
                  <select id="weekStart" name="weekStart" className={styles.input} value={form.weekStart} onChange={handleChange}>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="heatmapTheme" className={styles.label}>Heatmap Theme</label>
                  <select id="heatmapTheme" name="heatmapTheme" className={styles.input} value={form.heatmapTheme} onChange={handleChange}>
                    <option value="green">Green (Default)</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        );
    }
  };

  return (
    <>
      <Header authEnabled={true} />
      <main className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Configuration</h1>
          <p className={styles.subtitle}>Manage your settings, tags, patterns, and platforms in one place.</p>
        </div>
        
        <div className={styles.tabsWrapper}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.contentArea}>
          {renderContent()}
        </div>
      </main>
    </>
  );
}
