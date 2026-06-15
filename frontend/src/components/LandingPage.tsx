import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';

import { useSession } from '../contexts/AuthContext';

import { SparklesText, TextAnimate } from './magicui/Animations';
import { NeonGradientCard, Meteors } from './magicui/Effects';
import styles from './LandingPage.module.css';

// Defer loading heavy chart libraries until needed
const LandingCharts = lazy(() => import('./LandingCharts'));

const features = [
  {
    icon: '📘',
    title: 'Track Solved Problems',
    description: 'Organize and view your progress with a clean timeline of solved problems.',
  },
  {
    icon: '🚀',
    title: 'Confidence & Difficulty',
    description: 'Record how confident you felt and how tough the problem was.',
  },
  {
    icon: '🧠',
    title: 'Spaced Repetition',
    description: 'Smart revision scheduling ensures you revisit problems at the perfect time.',
  },
  {
    icon: '🔖',
    title: 'Tags & Patterns',
    description: 'Categorize problems by tags, topics, or patterns you want to master.',
  },
  {
    icon: '⚡',
    title: 'Quick Recall',
    description: 'Flashcard mode lets you quickly test yourself on problems due for revision.',
  },
  {
    icon: '📊',
    title: 'Rich Analytics',
    description: 'Dashboard with heatmaps, streaks, and per-tag breakdown charts.',
  },
];

import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const { data: session, signIn } = useSession();
  const navigate = useNavigate();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await signIn(null, null, tokenResponse.access_token);
        navigate('/dashboard');
      } catch (err) {
        console.error('Backend Login Error:', err);
        alert('Backend Login Failed: ' + (err.response?.data?.error || err.message));
      }
    },
    onError: (error) => {
      console.log('Login Failed:', error);
      alert('Google Login Failed: ' + (error?.error || error?.message || JSON.stringify(error)));
    },
  });

  return (
    <main className={styles.main}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      {/* Meteors live inside .hero which has overflow:hidden + position:relative */}
      <section className={styles.hero}>
        <div className={styles.meteorContainer} aria-hidden="true">
          <Meteors number={25} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.badge}>
            <span>🎯</span> Smart Interview Prep
          </div>

          <h1 className={styles.heroTitle}>
            <TextAnimate animation="blurInUp" by="word" once>
              Master Coding with Precision
            </TextAnimate>
          </h1>

          <p className={styles.heroSubtitle}>
            Track your solved problems, build revision habits with spaced repetition, and level up
            your problem-solving skills — all in one place.
          </p>

          <div className={styles.heroCtas}>
            {session ? (
              <Link to="/" className={styles.ctaPrimary}>
                Go to Tracker →
              </Link>
            ) : (
              <button
                onClick={() => handleGoogleLogin()}
                className={styles.ctaPrimary}
                id="landing-signin-btn"
              >
                <SparklesText
                  sparklesCount={5}
                  style={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                >
                  Start Tracking Now
                </SparklesText>
              </button>
            )}
            <Link to="/explore" className={styles.ctaSecondary}>
              Browse Questions →
            </Link>
          </div>

          <p className={styles.heroNote}>Free forever · No credit card required</p>
        </div>
      </section>

      {/* ── Features + Charts (inside NeonGradientCard) ───────────── */}
      <div className={styles.featuresWrapper}>
        <NeonGradientCard
          neonColors={{ firstColor: '#6366f1', secondColor: '#06b6d4' }}
          borderRadius={20}
        >
          <section className={styles.featuresSection}>
            <h2 className={styles.sectionTitle}>Why Developers Love It</h2>
            <div className={styles.featuresGrid}>
              {features.map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{f.icon}</div>
                  <div>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p className={styles.featureDesc}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.chartSection}>
              <h2 className={`${styles.sectionTitle} ${styles.sectionTitleChart}`}>
                Your Progress at a Glance
              </h2>
              <LandingCharts />
            </div>
          </section>
        </NeonGradientCard>
      </div>

      {/* ── CTA bottom ───────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to build your problem-solving muscle?</h2>
        <p className={styles.ctaSubtitle}>Join and start tracking today.</p>
        {session ? (
          <Link to="/" className={styles.ctaPrimary}>
            Go to Tracker →
          </Link>
        ) : (
          <button
            onClick={() => signIn('google')}
            className={styles.ctaPrimary}
            id="landing-cta-btn"
          >
            Get Started Free
          </button>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        Built for developers. © {new Date().getFullYear()} Tacker.
      </footer>
    </main>
  );
}
