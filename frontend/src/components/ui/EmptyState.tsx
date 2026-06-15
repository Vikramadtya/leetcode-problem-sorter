import styles from './EmptyState.module.css';

/**
 * EmptyState — Shared empty / error / loading fallback for Tracker and Explore.
 *
 * Renders one of three states based on props:
 *  - error   → shows the error message with a Retry button
 *  - empty   → "No questions match…" with a Clear filters button
 *  - custom  → passes `message` and `action` directly
 *
 * @param {object}   props
 * @param {string}  [props.message]         Primary message text
 * @param {string}  [props.subtext]         Secondary hint text (e.g. "run make dev")
 * @param {string}  [props.actionLabel]     Button label
 * @param {Function}[props.onAction]        Button click handler
 * @param {string}  [props.icon]            Emoji icon prefix (default '⚠️')
 */
export default function EmptyState({
  message = 'Something went wrong.',
  subtext,
  actionLabel,
  onAction,
  icon = '⚠️',
}) {
  const isError = icon.includes('⚠️') || message.toLowerCase().includes('error');

  return (
    <div className={styles.emptyStateContainer} role="status" aria-live="polite">
      <div className={`${styles.emptyStateCard} ${isError ? styles.errorCard : ''}`}>
        <div className={`${styles.iconWrapper} ${isError ? styles.errorIcon : ''}`}>
          {isError ? (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : (
            icon
          )}
        </div>

        <h3 className={styles.message}>{message}</h3>

        {subtext && <p className={styles.subtext}>{subtext}</p>}

        {actionLabel && onAction && (
          <div className={styles.buttonGroup}>
            <button className={styles.actionBtn} onClick={onAction}>
              {isError && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              )}
              {!isError && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              )}
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
