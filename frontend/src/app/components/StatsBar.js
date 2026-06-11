'use client';

/**
 * StatsBar — Displays a horizontal summary of solved/attempted/difficulty counts.
 *
 * Props:
 *   stats        { solved, attempted, easy, medium, hard }
 *   total        number — total questions in current view
 *   title        string — card heading (e.g. "Tracker Stats")
 *   secondLabel  string — label for the third stat (e.g. "DUE REVISION" or "SHOWING")
 *   secondValue  number — value for the third stat
 */
import styles from './StatsBar.module.css';

export default function StatsBar({
  stats,
  total,
  title = 'Stats',
  secondLabel = 'UNSOLVED',
  secondValue,
}) {
  const displaySecondValue = secondValue !== undefined ? secondValue : (stats.unsolved || 0);

  return (
    <div className={styles.statsCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title} ({total})</h3>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.solvedLabel}`}>SOLVED</span>
          <span className={`${styles.statValue} ${styles.solvedValue}`}>{stats.solved || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.attemptedLabel}`}>ATTEMPTED</span>
          <span className={`${styles.statValue} ${styles.attemptedValue}`}>{stats.attempted || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${secondLabel === 'DUE REVISION' ? styles.warningLabel : styles.mutedLabel}`}>
            {secondLabel}
          </span>
          <span className={styles.statValue}>{displaySecondValue}</span>
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.easyLabel}`}>EASY</span>
          <span className={styles.statValue}>{stats.easy || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.mediumLabel}`}>MEDIUM</span>
          <span className={styles.statValue}>{stats.medium || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.hardLabel}`}>HARD</span>
          <span className={styles.statValue}>{stats.hard || 0}</span>
        </div>
      </div>
    </div>
  );
}
