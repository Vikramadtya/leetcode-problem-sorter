import styles from './Filters.module.css';

export default function Filters({ 
  companies, 
  selectedCompany, 
  setSelectedCompany, 
  selectedPeriod, 
  setSelectedPeriod,
  difficultyFilter,
  setDifficultyFilter
}) {
  return (
    <div className={styles.filtersCard}>
      <h2 className={styles.title}>Select Questions Source</h2>
      <div className={styles.grid}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Company</label>
          <div className={styles.selectWrapper}>
            <select 
              className={styles.select} 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="" disabled>Select a company</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className={styles.chevron}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Time Period</label>
          <div className={styles.selectWrapper}>
            <select 
              className={styles.select} 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="more-than-six-months">More than six months</option>
              <option value="six-months">Six months</option>
              <option value="thirty-days">Thirty days</option>
            </select>
            <div className={styles.chevron}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Difficulty</label>
          <div className={styles.selectWrapper}>
            <select 
              className={styles.select} 
              value={difficultyFilter} 
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="all">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <div className={styles.chevron}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
