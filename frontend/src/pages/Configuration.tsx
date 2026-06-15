import React, { useState } from 'react';

import SEO from '../components/SEO';
import Header from '../components/Header';


// Import metadata components
import MetadataPage from '../components/MetadataPage';
import useConfigurationSync from '../hooks/useConfigurationSync';

import { saveAs } from 'file-saver';
import { apiClient } from '../lib/api/apiClient';
import { toast } from 'sonner';

import styles from './Configuration.module.css';

const TABS = ['Preferences', 'Tags', 'Patterns', 'Platforms', 'Export Data'];

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('Preferences');

  const { status, form, isSaving, handleChange, handleSave } = useConfigurationSync();

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const handleExport = async () => {
    try {
      const qs = await apiClient.getQuestions({ limit: 10000 });
      const stats = await apiClient.getAnalytics();
      const settings = await apiClient.getSettings();
      const blob = new Blob([JSON.stringify({ questions: qs.data, stats, settings }, null, 2)], { type: 'application/json' });
      saveAs(blob, `tacker_backup_${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Backup downloaded successfully!');
    } catch (e) {
      toast.error('Failed to export data');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Export Data':
        return (
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">💾</span>
              <h2 className={styles.sectionTitle}>Data Portability</h2>
            </div>
            <p className={styles.hint} style={{ marginBottom: '1rem' }}>
              Download a complete JSON backup of your questions, notes, and statistics.
            </p>
            <button type="button" className={styles.saveBtn} onClick={handleExport}>
              Export All Data
            </button>
          </div>
        );
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
                <span className={styles.sectionIcon} aria-hidden="true">
                  🎯
                </span>
                <h2 className={styles.sectionTitle}>Goals & Tracking</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="dailyGoal" className={styles.label}>
                    Daily Goal
                  </label>
                  <p className={styles.hint}>Problems to solve each day.</p>
                  <input
                    id="dailyGoal"
                    name="dailyGoal"
                    type="number"
                    min="1"
                    max="50"
                    className={styles.input}
                    value={form.dailyGoal}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="weeklyGoal" className={styles.label}>
                    Weekly Goal
                  </label>
                  <p className={styles.hint}>Problems to solve each week.</p>
                  <input
                    id="weeklyGoal"
                    name="weeklyGoal"
                    type="number"
                    min="1"
                    max="200"
                    className={styles.input}
                    value={form.weeklyGoal}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="sdDailyGoal" className={styles.label}>
                    System Design Daily Goal
                  </label>
                  <p className={styles.hint}>SD problems to solve each day.</p>
                  <input
                    id="sdDailyGoal"
                    name="sdDailyGoal"
                    type="number"
                    min="1"
                    max="50"
                    className={styles.input}
                    value={form.sdDailyGoal}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="sdWeeklyGoal" className={styles.label}>
                    System Design Weekly Goal
                  </label>
                  <p className={styles.hint}>SD problems to solve each week.</p>
                  <input
                    id="sdWeeklyGoal"
                    name="sdWeeklyGoal"
                    type="number"
                    min="1"
                    max="200"
                    className={styles.input}
                    value={form.sdWeeklyGoal}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  🧠
                </span>
                <h2 className={styles.sectionTitle}>Spaced Repetition Algorithm</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel1" className={styles.label}>
                    Level 1 Interval (Days)
                  </label>
                  <input
                    id="srsLevel1"
                    name="srsLevel1"
                    type="number"
                    min="1"
                    className={styles.input}
                    value={form.srsLevel1}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel2" className={styles.label}>
                    Level 2 Interval (Days)
                  </label>
                  <input
                    id="srsLevel2"
                    name="srsLevel2"
                    type="number"
                    min="1"
                    className={styles.input}
                    value={form.srsLevel2}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel3" className={styles.label}>
                    Level 3 Interval (Days)
                  </label>
                  <input
                    id="srsLevel3"
                    name="srsLevel3"
                    type="number"
                    min="1"
                    className={styles.input}
                    value={form.srsLevel3}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="srsLevel4" className={styles.label}>
                    Level 4 Interval (Days)
                  </label>
                  <input
                    id="srsLevel4"
                    name="srsLevel4"
                    type="number"
                    min="1"
                    className={styles.input}
                    value={form.srsLevel4}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="maxFlashcards" className={styles.label}>
                    Max Flashcards per Session
                  </label>
                  <input
                    id="maxFlashcards"
                    name="maxFlashcards"
                    type="number"
                    min="5"
                    max="100"
                    className={styles.input}
                    value={form.maxFlashcards}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  📝
                </span>
                <h2 className={styles.sectionTitle}>Custom Problem Defaults</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="defaultDifficulty" className={styles.label}>
                    Default Difficulty
                  </label>
                  <select
                    id="defaultDifficulty"
                    name="defaultDifficulty"
                    className={styles.input}
                    value={form.defaultDifficulty}
                    onChange={handleChange}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="defaultPlatform" className={styles.label}>
                    Default Platform
                  </label>
                  <input
                    id="defaultPlatform"
                    name="defaultPlatform"
                    type="text"
                    className={styles.input}
                    value={form.defaultPlatform}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  🎨
                </span>
                <h2 className={styles.sectionTitle}>Appearance & Layout</h2>
              </div>
              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label htmlFor="weekStart" className={styles.label}>
                    Start of Week
                  </label>
                  <select
                    id="weekStart"
                    name="weekStart"
                    className={styles.input}
                    value={form.weekStart}
                    onChange={handleChange}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="heatmapTheme" className={styles.label}>
                    Heatmap Theme
                  </label>
                  <select
                    id="heatmapTheme"
                    name="heatmapTheme"
                    className={styles.input}
                    value={form.heatmapTheme}
                    onChange={handleChange}
                  >
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
      <SEO title="Configuration | Tacker" />
      <Header authEnabled={true} />
      <main className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Configuration</h1>
          <p className={styles.subtitle}>
            Manage your settings, tags, patterns, and platforms in one place.
          </p>
        </div>

        <div className={styles.tabsWrapper}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.contentArea}>{renderContent()}</div>
      </main>
    </>
  );
}
