import styles from './StatsBar.module.css';

export default function StatsBar({ stats, total, title = "Waitlist", secondLabel = "UNSOLVED", secondValue }) {
  const displaySecondValue = secondValue !== undefined ? secondValue : (stats.unsolved || 0);

  return (
    <div className={styles.statsCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title} ({total})</h3>
        <div className={styles.actions}>
        </div>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.solvedText}`}>SOLVED</span>
          <span className={styles.statValue}>{stats.solved || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel} style={{ color: '#f59e0b' }}>ATTEMPTED</span>
          <span className={styles.statValue} style={{ color: '#f59e0b' }}>{stats.attempted || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.warningText}`} style={{ color: secondLabel === 'DUE REVISION' ? 'var(--warning)' : 'var(--text-muted)' }}>{secondLabel}</span>
          <span className={styles.statValue}>{displaySecondValue}</span>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.easyText}`}>EASY</span>
          <span className={styles.statValue}>{stats.easy || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.mediumText}`}>MEDIUM</span>
          <span className={styles.statValue}>{stats.medium || 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.hardText}`}>HARD</span>
          <span className={styles.statValue}>{stats.hard || 0}</span>
        </div>
      </div>
    </div>
  );
}
