import { useState, useEffect } from 'react';
import styles from './Table.module.css';

export default function Table({ 
  questions, 
  progress, 
  onStatusChange,
  onOpenReflection, 
  onOpenInitialSolve, 
  onSetConfidence, 
  onToggleRevise, 
  onSetTags, 
  onSetPattern, 
  onOpenNotes, 
  onSaveTime, 
  onOpenFocusMode, 
  authEnabled, 
  sortConfig, 
  requestSort, 
  patterns = [], 
  isCompactMode = false,
  visibleColumns = ['STATUS', 'REVISE', 'ID', 'Title', 'Difficulty', 'Attempts', 'Time', 'Acceptance %', 'Frequency %', 'DateSolved'],
  activeTimers = {},
  onStartTimer,
  onStopTimer,
  onToggleImportant
}) {
  const getDifficultyClass = (diff) => {
    switch((diff || '').toLowerCase()) {
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

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const handleTagInput = (e, id) => {
    if (e.key === 'Enter') {
      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
      if (onSetTags) onSetTags(id, tags);
      e.target.value = '';
    }
  };

  const isVisible = (col) => visibleColumns.includes(col);

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {authEnabled && (
              <th className={`${styles.th} ${styles.thCenter}`}>STATUS</th>
            )}
            {authEnabled && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort && requestSort('Revise')}>
                REVISE {renderSortIcon('Revise')}
              </th>
            )}
            {isVisible('ID') && (
              <th className={`${styles.th} ${styles.thLeft} ${styles.sortable}`} onClick={() => requestSort && requestSort('ID')}>
                ID {renderSortIcon('ID')}
              </th>
            )}
            {isVisible('Title') && (
              <th className={`${styles.th} ${styles.thLeft} ${styles.sortable}`} onClick={() => requestSort && requestSort('Title')}>
                TITLE {renderSortIcon('Title')}
              </th>
            )}
            {isVisible('Difficulty') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort && requestSort('Difficulty')}>
                DIFFICULTY {renderSortIcon('Difficulty')}
              </th>
            )}
            {!isCompactMode && authEnabled && isVisible('Attempts') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort && requestSort('Attempts')}>
                ATTEMPTS {renderSortIcon('Attempts')}
              </th>
            )}
            {!isCompactMode && authEnabled && isVisible('Time') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort && requestSort('Time')}>
                TIME {renderSortIcon('Time')}
              </th>
            )}
            {!isCompactMode && isVisible('Acceptance %') && (
              <th className={`${styles.th} ${styles.thRight} ${styles.sortable}`} onClick={() => requestSort && requestSort('Acceptance %')}>
                ACCEPTANCE {renderSortIcon('Acceptance %')}
              </th>
            )}
            {!isCompactMode && isVisible('Frequency %') && (
              <th className={`${styles.th} ${styles.thRight} ${styles.sortable}`} onClick={() => requestSort && requestSort('Frequency %')}>
                FREQUENCY {renderSortIcon('Frequency %')}
              </th>
            )}
            {!isCompactMode && authEnabled && isVisible('DateSolved') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort && requestSort('DateSolved')}>
                DATE SOLVED {renderSortIcon('DateSolved')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const prog = progress[q.ID] || {};
            const isSolved = prog.status === 'Solved' || prog.solved === true;
            const isAttempted = prog.status === 'Attempted';
            const isRevise = prog.revise;
            const rowClass = isSolved ? styles.rowSolved : (isAttempted ? styles.attemptedRow : styles.row);
            
            const attempts = prog.attempts || 0;
            const activeStartTime = activeTimers[q.ID];
            const currentSessionTime = activeStartTime ? Math.floor((Date.now() - activeStartTime) / 1000) : 0;
            const totalTime = (prog.timeSpent || 0) + currentSessionTime;

            return (
              <tr key={q.ID} className={rowClass}>
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.statusCell}>
                      <div className={styles.checkboxRow}>
                        {/* Attempted Checkbox */}
                        <button 
                          className={`${styles.checkboxBtn} ${isAttempted ? styles.checkedAttempted : ''}`}
                          onClick={() => {
                            if (isAttempted) {
                              if (onStatusChange) onStatusChange(q.ID, 'Unsolved');
                            } else {
                              if (onStatusChange) onStatusChange(q.ID, 'Attempted');
                            }
                          }}
                          title={isAttempted ? "Unmark Attempted" : "Mark Attempted"}
                          style={{ borderColor: isAttempted ? '#f59e0b' : 'var(--border-color)' }}
                        >
                          {isAttempted && <span style={{ color: '#000', fontSize: '10px', fontWeight: 'bold' }}>A</span>}
                        </button>

                        {/* Solved Checkbox */}
                        <button 
                          className={`${styles.checkboxBtn} ${isSolved ? styles.checked : ''}`}
                          onClick={() => {
                            if (isSolved) {
                              if (onStatusChange) onStatusChange(q.ID, 'Unsolved');
                            } else {
                              if (onOpenInitialSolve) onOpenInitialSolve(q);
                              else if (onStatusChange) onStatusChange(q.ID, 'Solved');
                            }
                          }}
                          title={isSolved ? "Unmark Solved" : "Mark Solved"}
                        >
                          {isSolved && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </button>
                      </div>
                      
                      {isSolved && prog.confidenceLevel && (
                        <div className={styles.confidenceSelector}>
                          {[1,2,3,4].map(lvl => (
                            <button 
                              key={lvl}
                              className={`${styles.confBtn} ${styles[`confLevel${lvl}`]} ${prog.confidenceLevel === lvl ? styles.confActive : ''}`}
                              onClick={() => onSetConfidence && onSetConfidence(q.ID, lvl)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                )}
                
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.reviseCell}>
                      {(isSolved || isAttempted || isRevise) ? (
                        <button 
                          className={`${styles.checkboxBtn} ${isRevise ? styles.checked : ''}`}
                          onClick={() => {
                            if (isRevise) {
                              if (onToggleRevise) onToggleRevise(q.ID);
                            } else {
                              if (onOpenReflection) onOpenReflection(q);
                              else if (onToggleRevise) onToggleRevise(q.ID);
                            }
                          }}
                          title={isRevise ? "Unmark for revision" : "Revise and reflect"}
                          style={isRevise ? {} : { borderColor: 'var(--diff-med-text)' }}
                        >
                          {isRevise && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                      
                      {prog.nextRevisionDate && !isRevise && (() => {
                        const nextDate = new Date(prog.nextRevisionDate);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        nextDate.setHours(0,0,0,0);
                        const diffDays = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));
                        
                        let badgeClass = styles.srsUpcoming;
                        let text = `IN ${diffDays} DAYS`;
                        if (diffDays < 0) { badgeClass = styles.srsOverdue; text = 'OVERDUE'; }
                        else if (diffDays === 0) { badgeClass = styles.srsToday; text = 'TODAY'; }
                        else if (diffDays === 1) { text = 'IN 1 DAY'; }
                        
                        return <span className={`${styles.srsBadge} ${badgeClass}`}>{text}</span>;
                      })()}
                    </div>
                  </td>
                )}

                {isVisible('ID') && (
                  <td className={`${styles.td} ${styles.tdLeft} ${styles.idText}`}>{q.ID}</td>
                )}

                {isVisible('Title') && (
                  <td className={`${styles.td} ${styles.tdLeft}`}>
                    <div className={styles.titleRow}>
                      {authEnabled && (
                        <button 
                          className={styles.starBtn} 
                          onClick={() => onToggleImportant && onToggleImportant(q.ID)}
                          title={prog.important ? "Unmark Important" : "Mark as Important"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={prog.important ? "#facc15" : "none"} stroke={prog.important ? "#facc15" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </button>
                      )}
                      <span className={styles.titleText}>{q.Title || q[' Title']}</span>
                      <a href={q['Leetcode Question Link'] || q.URL} target="_blank" rel="noreferrer" className={styles.link} title="Problem Link">
                        <svg className={styles.externalIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </a>
                      {prog.solutionLink && (
                        <a href={prog.solutionLink} target="_blank" rel="noreferrer" className={styles.link} title="My Solution" style={{ marginLeft: '0.25rem', color: '#10b981' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                        </a>
                      )}
                      {authEnabled && (
                        <button className={styles.notesBtn} onClick={() => onOpenNotes && onOpenNotes(q)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          Add Notes
                        </button>
                      )}
                    </div>
                    {authEnabled && (
                      <div className={styles.addTagContainer}>
                        <input 
                          type="text" 
                          className={styles.tagInput} 
                          placeholder="+ add tags (comma sep)" 
                          onKeyDown={(e) => handleTagInput(e, q.ID)}
                        />
                        <select 
                          className={styles.patternSelect}
                          value={prog.pattern || ""}
                          onChange={(e) => onSetPattern && onSetPattern(q.ID, e.target.value)}
                        >
                          <option value="" disabled>+ select pattern</option>
                          {patterns?.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    )}
                    {prog.tags && prog.tags.length > 0 && (
                      <div className={styles.tagList}>
                        {prog.tags.map(t => <span key={t} className={styles.tagPill}>{t}</span>)}
                      </div>
                    )}
                  </td>
                )}

                {isVisible('Difficulty') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.pill} ${getDifficultyClass(q.Difficulty || q[' Difficulty'])}`}>
                      {q.Difficulty || q[' Difficulty']}
                    </span>
                  </td>
                )}

                {!isCompactMode && authEnabled && isVisible('Attempts') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    {attempts > 0 ? attempts : '-'}
                  </td>
                )}

                {!isCompactMode && authEnabled && isVisible('Time') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.timeTracker}>
                      <span className={styles.timeText}>{formatTime(totalTime)}</span>
                      <button 
                        className={styles.timerBtn}
                        onClick={() => {
                          if (activeStartTime && onStopTimer) onStopTimer(q.ID);
                          else if (onStartTimer) onStartTimer(q.ID);
                        }}
                      >
                        ⏱️
                      </button>
                    </div>
                  </td>
                )}

                {!isCompactMode && isVisible('Acceptance %') && (
                  <td className={`${styles.td} ${styles.tdRight}`}>{q['Acceptance %'] || q[' Acceptance %'] || '-'}</td>
                )}

                {!isCompactMode && isVisible('Frequency %') && (
                  <td className={`${styles.td} ${styles.tdRight}`}>{q['Frequency %'] || q[' Frequency %'] || '-'}</td>
                )}

                {!isCompactMode && authEnabled && isVisible('DateSolved') && (
                  <td className={`${styles.td} ${styles.tdCenter} ${styles.dateText}`}>
                    {prog.dateSolved ? new Date(prog.dateSolved).toLocaleDateString() : '-'}
                  </td>
                )}
              </tr>
            );
          })}
          {questions.length === 0 && (
            <tr>
              <td colSpan={10} className={styles.emptyState}>No questions found matching criteria.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
