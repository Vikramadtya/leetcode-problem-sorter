import { useState } from 'react';
import styles from './Filters.module.css';

export default function Filters({ 
  companies, 
  selectedCompany, 
  setSelectedCompany, 
  selectedPeriod, 
  setSelectedPeriod,
  difficultyFilter,
  setDifficultyFilter,
  searchQuery,
  setSearchQuery,
  hideSolved,
  setHideSolved,
  visibleColumns,
  toggleColumn,
  starredOnly,
  setStarredOnly
}) {
  const [showColMenu, setShowColMenu] = useState(false);
  const allColumns = ['ID', 'Title', 'Difficulty', 'Attempts', 'Time', 'Acceptance %', 'Frequency %', 'DateSolved'];
  return (
    <div className={styles.filtersCard}>
      <h2 className={styles.title}>Select Questions Source</h2>
      <div className={styles.grid}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Search</label>
          <input 
            type="text" 
            className={styles.searchInput}
            placeholder="Search problems..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label className={styles.label}>Company</label>
          <div className={styles.selectWrapper}>
            <select 
              className={styles.select} 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              {companies.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Companies' : c}</option>
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
      {setHideSolved && (
        <div className={styles.filterRow} style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label className={styles.filterCheckbox}>
            <input 
              type="checkbox" 
              checked={hideSolved} 
              onChange={(e) => setHideSolved(e.target.checked)} 
            />
            Hide Solved
          </label>
          
          {setStarredOnly && (
            <label className={styles.filterCheckbox}>
              <input 
                type="checkbox" 
                checked={starredOnly} 
                onChange={(e) => setStarredOnly(e.target.checked)} 
              />
              Starred
            </label>
          )}

          {visibleColumns && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowColMenu(!showColMenu)}
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              >
                Columns ⚙️
              </button>
              {showColMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', zIndex: 100, display: 'grid', gap: '0.5rem', boxShadow: 'var(--shadow-md)', minWidth: '150px' }}>
                  {allColumns.map(col => (
                    <label key={col} className={styles.filterCheckbox} style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.includes(col)}
                        onChange={() => toggleColumn(col)}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
