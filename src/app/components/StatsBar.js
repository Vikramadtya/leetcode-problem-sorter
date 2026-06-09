import styles from './StatsBar.module.css';

export default function StatsBar({ stats, total }) {
  return (
    <div className={styles.statsCard}>
      <div className={styles.header}>
        <h3 className={styles.title}>Waitlist ({total})</h3>
        <div className={styles.actions}>
          {/* We will add search/filter inside Table or here later. 
              The mockup shows them next to the title. We can just add placeholders for UI completeness */}
        </div>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.solvedText}`}>SOLVED</span>
          <span className={styles.statValue}>{stats.solved}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.unsolvedText}`}>UNSOLVED</span>
          <span className={styles.statValue}>{stats.unsolved}</span>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.easyText}`}>EASY</span>
          <span className={styles.statValue}>{stats.easy}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.mediumText}`}>MEDIUM</span>
          <span className={styles.statValue}>{stats.medium}</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statLabel} ${styles.hardText}`}>HARD</span>
          <span className={styles.statValue}>{stats.hard}</span>
        </div>
      </div>
    </div>
  );
}
