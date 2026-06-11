'use client';

/**
 * TableSkeleton — Animated loading placeholder while questions are fetching.
 *
 * Props:
 *   rows  number — how many skeleton rows to render (default 5)
 */
import styles from './TableSkeleton.module.css';

export default function TableSkeleton({ rows = 5 }) {
  return (
    <div className={styles.tableWrapper} role="status" aria-label="Loading questions">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Status</th>
            <th>Title</th>
            <th>Difficulty</th>
            <th>Confidence</th>
            <th>Platform</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><div className={`${styles.skeleton} ${styles.icon}`} /></td>
              <td>
                {/* Title skeleton: wide bar + narrow sub-line */}
                <div className={`${styles.skeleton} ${styles.textWide}`} />
                <div className={`${styles.skeleton} ${styles.textNarrow}`} />
              </td>
              <td><div className={`${styles.skeleton} ${styles.badge}`} /></td>
              <td><div className={`${styles.skeleton} ${styles.badgeMedium}`} /></td>
              <td><div className={`${styles.skeleton} ${styles.badgeNarrow}`} /></td>
              <td>
                {/* Two action-button placeholders */}
                <div className={styles.actionGroup}>
                  <div className={`${styles.skeleton} ${styles.actionBtn}`} />
                  <div className={`${styles.skeleton} ${styles.actionBtn}`} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
