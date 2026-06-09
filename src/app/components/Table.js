import styles from './Table.module.css';

export default function Table({ questions, progress, onToggleStatus, onToggleRevise, authEnabled, sortConfig, requestSort }) {
  const getDifficultyClass = (diff) => {
    switch(diff?.toLowerCase()) {
      case 'easy': return styles.diffEasy;
      case 'medium': return styles.diffMedium;
      case 'hard': return styles.diffHard;
      default: return '';
    }
  };

  const renderSortIcon = (key) => {
    if (sortConfig?.key !== key) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIcon}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {authEnabled && <th className={`${styles.th} ${styles.thCenter}`}>STATUS</th>}
            <th className={`${styles.th} ${styles.thLeft}`}>ID</th>
            <th className={`${styles.th} ${styles.thLeft}`}>TITLE</th>
            <th 
              className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} 
              onClick={() => requestSort('Difficulty')}
            >
              DIFFICULTY {renderSortIcon('Difficulty')}
            </th>
            <th 
              className={`${styles.th} ${styles.thRight} ${styles.sortable}`} 
              onClick={() => requestSort('Acceptance %')}
            >
              ACCEPTANCE {renderSortIcon('Acceptance %')}
            </th>
            <th 
              className={`${styles.th} ${styles.thRight} ${styles.sortable}`} 
              onClick={() => requestSort('Frequency %')}
            >
              FREQUENCY {renderSortIcon('Frequency %')}
            </th>
            {authEnabled && <th className={`${styles.th} ${styles.thCenter}`}>DATE SOLVED</th>}
            {authEnabled && <th className={`${styles.th} ${styles.thCenter}`}>REVISE</th>}
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const isSolved = progress[q.ID]?.solved;
            const isRevise = progress[q.ID]?.revise;
            const dateSolved = progress[q.ID]?.dateSolved;

            return (
              <tr key={q.ID} className={isSolved ? styles.rowSolved : styles.row}>
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <button 
                      className={`${styles.checkboxBtn} ${isSolved ? styles.checked : ''}`}
                      onClick={() => onToggleStatus(q.ID)}
                    >
                      {isSolved && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </button>
                  </td>
                )}
                <td className={`${styles.td} ${styles.tdLeft} ${styles.idText}`}>{q.ID}</td>
                <td className={`${styles.td} ${styles.tdLeft} ${styles.titleText}`}>
                  <a href={q.URL} target="_blank" rel="noreferrer" className={styles.link}>
                    {q.Title}
                    <svg className={styles.externalIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </td>
                <td className={`${styles.td} ${styles.tdCenter}`}>
                  <span className={`${styles.pill} ${getDifficultyClass(q.Difficulty)}`}>
                    {q.Difficulty}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.tdRight}`}>{q['Acceptance %']}</td>
                <td className={`${styles.td} ${styles.tdRight}`}>{q['Frequency %']}</td>
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter} ${styles.dateText}`}>
                    {dateSolved ? new Date(dateSolved).toLocaleDateString() : '-'}
                  </td>
                )}
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <button 
                      className={`${styles.reviseBtn} ${isRevise ? styles.reviseActive : ''}`}
                      onClick={() => onToggleRevise(q.ID)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill={isRevise ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          {questions.length === 0 && (
            <tr>
              <td colSpan={authEnabled ? 8 : 5} className={styles.emptyState}>No questions found. Select a company to view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
