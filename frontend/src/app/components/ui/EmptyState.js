'use client';

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
  return (
    <div className={styles.emptyState} role="status" aria-live="polite">
      <p className={styles.message}>
        {icon} {message}
      </p>
      {subtext && <p className={styles.subtext}>{subtext}</p>}
      {actionLabel && onAction && (
        <button className={styles.actionBtn} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
