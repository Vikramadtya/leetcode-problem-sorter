import SEO from '../components/SEO';

/**
 * Tracker page — /
 *
 * Shows only the user's engaged questions (attempted, solved, or flagged for revision).
 * All rendering and state management is delegated to TrackerPageShell.
 *
 * Architecture:
 *   - trackerMode = true  → API returns only questions with progress entries
 *   - Shows status tabs (All / Solved / Unsolved)
 *   - Shows streak panel, heatmap, and Quick Recall flashcard button
 *   - Auth-gated: unauthenticated users see the Landing page
 */

import { useSession } from '../contexts/AuthContext';
import Header from '../components/Header';
import LandingPage from '../components/LandingPage';
import TrackerPageShell from '../components/TrackerPageShell';
import config from '../config.json';

import styles from './Tracker.module.css';

export default function Home() {
  const { data: session, status: authStatus } = useSession();
  const authEnabled = config.features.authEnabled;

  // ── Auth guard: show a header-only shell while session is resolving ────────
  if (authEnabled && authStatus === 'loading') {
    return (
      <div className={styles.authShell}>
        <Header authEnabled={authEnabled} />
      </div>
    );
  }

  // ── Unauthenticated: show landing page ────────────────────────────────────
  if (authEnabled && !session) {
    return (
      <>
        <SEO title="Tacker | Problem Tracker" />
        <div className={styles.authShell}>
          <Header authEnabled={authEnabled} />
          <LandingPage />
        </div>
      </>
    );
  }

  // ── Authenticated: full tracker view ──────────────────────────────────────
  return (
    <>
      <SEO title="Tacker | Problem Tracker" />
      <TrackerPageShell
        mode="tracker"
        title="Your Tracker"
        navLabel="Explore all →"
        navHref="/explore"
        showTabs
        showStreaks
        authEnabled={authEnabled}
      />
    </>
  );
}
