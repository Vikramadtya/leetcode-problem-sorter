'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import styles from './error.module.css';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App caught an error:', error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorCard}>
        <div className={styles.iconWrapper}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        
        <h2 className={styles.title}>Something went wrong</h2>
        
        <p className={styles.message}>
          We're sorry, but the application encountered an unexpected error. 
          Our team has been notified and is looking into the issue.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className={styles.errorMessage}>
            {error.message || 'Unknown error occurred'}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            onClick={() => window.history.back()}
            className={styles.secondaryBtn}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Go Back
          </button>
          
          <button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className={styles.primaryBtn}
            aria-label="Try again"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className={styles.secondaryBtn}
            aria-label="Go home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
