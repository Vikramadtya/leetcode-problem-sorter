import { useState, useEffect } from 'react';

import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className={styles.banner} role="alert" aria-live="assertive">
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10.53 5.53a9 9 0 0 1 10.94 10.94M1.5 1.5l21 21M6.59 6.59A8.97 8.97 0 0 0 3 12c0 4.97 4.03 9 9 9a8.97 8.97 0 0 0 5.41-1.81" />
      </svg>
      You are currently offline. Some features may be unavailable.
    </div>
  );
}
