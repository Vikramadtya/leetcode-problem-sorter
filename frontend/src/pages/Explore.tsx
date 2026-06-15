import SEO from '../components/SEO';

/**
 * Explore page — /explore
 *
 * Shows the complete global question catalogue regardless of user progress.
 * All rendering and state management is delegated to TrackerPageShell.
 *
 * Architecture:
 *   - trackerMode = false → API returns all questions
 *   - Status tabs show All / Solved / Unsolved
 *   - No streak panel or flashcard button
 *   - No auth gate — accessible to all users (read-only progress actions
 *     will be blocked by the API if unauthenticated)
 */

import { useSession } from '../contexts/AuthContext';
import TrackerPageShell from '../components/TrackerPageShell';
import config from '../config.json';

export default function Explore() {
  // Ensure session is loaded so Header can render the correct auth state
  useSession();
  const authEnabled = config.features.authEnabled;

  return (
    <>
      <SEO title="Explore Problems | Tacker" />
      <TrackerPageShell
        mode="explore"
        title="Explore Global Questions"
        navLabel="← Back to Tracker"
        navHref="/"
        showTabs={true}
        showStreaks={false}
        authEnabled={authEnabled}
      />
    </>
  );
}
