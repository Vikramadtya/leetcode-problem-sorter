import React, { useState } from 'react';
import { toast } from 'sonner';

import SEO from '../components/SEO';
import Header from '../components/Header';
import { apiClient } from '../lib/api/apiClient';


import styles from './About.module.css';

export default function AboutPage() {
  const [form, setForm] = useState({ email: '', phone: '', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.note.trim()) {
      toast.error('Please enter a note');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.submitSuggestion(form);
      toast.success('Thanks for your suggestion!');
      setForm({ email: '', phone: '', note: '' });
    } catch (err) {
      // error handled by apiClient
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <SEO title="About Tacker" />
      <Header authEnabled={true} />
      <main className={styles.main}>
        <div className={styles.contentCard}>
          <h1 className={styles.title}>About Tacker </h1>
          <p className={styles.paragraph}>
            It's an advanced problem-solving tracker. It helps developers organize their competitive
            programming and interview preparation across multiple platforms.
          </p>

          <h2 className={styles.heading}>Features</h2>
          <div className={styles.featuresRow}>
            <ul className={styles.list}>
              <li>
                <strong>Cross-Platform Tracking:</strong> Track problems from LeetCode, Codeforces,
                HackerRank, and more.
              </li>
              <li>
                <strong>Pattern Recognition:</strong> Tag problems with specific algorithm patterns
                to spot your strengths.
              </li>
              <li>
                <strong>Spaced Repetition:</strong> Built-in confidence intervals flag problems that
                are due for revision.
              </li>
              <li>
                <strong>Contribution Heatmap:</strong> A beautiful GitHub-style calendar visualizes
                your daily consistency.
              </li>
              <li>
                <strong>Global Comments Hub:</strong> View and manage all your notes across every
                question in one dedicated dashboard.
              </li>
              <li>
                <strong>Favourites Filter:</strong> Instantly filter for problems you've starred as
                important.
              </li>
              <li>
                <strong>Configuration Hub:</strong> Customize tags, platforms, and patterns to fit
                your personal workflow.
              </li>
              <li>
                <strong>Custom Problem Addition:</strong> Manually add any problem that isn't
                automatically tracked by the system.
              </li>
            </ul>
            <div className={styles.avatarContainer}>
              <img src="/icons/avatar.png" alt="Tacker Avatar" className={styles.avatarImage} />
            </div>
          </div>

          <h2 className={styles.heading}>Contact Me</h2>
          <p className={styles.paragraph}>
            Got a suggestion, found a bug, or just want to say hi? Reach out via the form below!
            (Email and Phone are optional if you prefer to remain anonymous).
          </p>

          <form className={styles.formContainer} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email (optional)
              </label>
              <input
                type="email"
                id="email"
                className={styles.input}
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Phone Number (optional)
              </label>
              <input
                type="tel"
                id="phone"
                className={styles.input}
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="note" className={styles.label}>
                Your Note
              </label>
              <textarea
                id="note"
                className={styles.textarea}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="I really love the new comments page!"
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Suggestion'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
