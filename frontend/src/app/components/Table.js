'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import styles from './Table.module.css';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// ─── Utilities ────────────────────────────────────────────────────────────

const getDifficultyClass = (diff) => {
  switch ((diff || '').toLowerCase()) {
    case 'easy':   return styles.diffEasy;
    case 'medium': return styles.diffMedium;
    case 'hard':   return styles.diffHard;
    default:       return '';
  }
};

const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
};

/** Capitalize first letter of each word (for company slug display) */
const capitalizeSlug = (slug) =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── Custom hook: per-question timer ─────────────────────────────────────
// Timer refs live outside React state so they survive re-renders.

function useTimers() {
  // Map<questionId, startTimestampMs> — a ref so mutations don't cause re-renders
  const activeTimers = useRef({});
  // Forces a re-render when timer state changes (so the time display updates)
  const [tick, setTick] = useState(0);
  const tickRef = useRef(null);

  const startTimer = useCallback((id) => {
    if (activeTimers.current[id]) return; // already running
    activeTimers.current[id] = Date.now();
    // Tick every second to update the display
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
  }, []);

  const stopTimer = useCallback((id) => {
    const startTime = activeTimers.current[id];
    if (!startTime) return 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    delete activeTimers.current[id];
    if (Object.keys(activeTimers.current).length === 0) {
      clearInterval(tickRef.current);
    }
    return elapsed;
  }, []);

  const getElapsed = useCallback((id) => {
    const start = activeTimers.current[id];
    if (!start) return 0;
    return Math.floor((Date.now() - start) / 1000);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRunning = useCallback((id) => !!activeTimers.current[id], [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => clearInterval(tickRef.current), []);

  return { startTimer, stopTimer, getElapsed, isRunning };
}

// ─── Table component ──────────────────────────────────────────────────────

function Table({
  onOpenReflection,
  onOpenInitialSolve,
  onOpenNotes,
  authEnabled,
  patterns = [],
  isCompactMode = false,
  visibleColumns = ['STATUS', 'REVISE', 'ID', 'Title', 'Difficulty', 'Companies', 'Attempts', 'Time', 'Acceptance %', 'Frequency %', 'DateSolved'],
}) {
  const { questions, filters, setFilters, updateProgress } = useAppStore(
    useShallow((state) => ({
      questions: state.questions,
      filters: state.filters,
      setFilters: state.setFilters,
      updateProgress: state.updateProgress,
    }))
  );
  const { startTimer, stopTimer, getElapsed, isRunning } = useTimers();

  const isVisible = useCallback((col) => visibleColumns.includes(col), [visibleColumns]);

  const renderSortIcon = useCallback((key) => {
    if (filters.sortBy !== key) return <span className={styles.sortIcon} aria-hidden="true">↕</span>;
    return <span className={styles.sortIcon} aria-hidden="true">{filters.sortDirection === 'asc' ? '↑' : '↓'}</span>;
  }, [filters.sortBy, filters.sortDirection]);

  const requestSort = useCallback((key) => {
    const direction = filters.sortBy === key && filters.sortDirection === 'asc' ? 'desc' : 'asc';
    setFilters({ sortBy: key, sortDirection: direction });
  }, [filters.sortBy, filters.sortDirection, setFilters]);

  const handleTagInput = useCallback((e, id) => {
    if (e.key !== 'Enter') return;
    const raw = e.target.value.trim();
    if (!raw) return;
    const tagArray = raw.split(',').map(t => t.trim()).filter(Boolean);
    updateProgress(id, { tags: tagArray });
    e.target.value = '';
  }, [updateProgress]);

  return (
    <div className={styles.tableContainer} role="region" aria-label="Questions table">
      <table className={styles.table}>
        <thead>
          <tr>
            {authEnabled && (
              <th className={`${styles.th} ${styles.thCenter}`} scope="col">STATUS</th>
            )}
            {authEnabled && (
              <th
                className={`${styles.th} ${styles.thCenter} ${styles.sortable}`}
                onClick={() => requestSort('revise')}
                scope="col"
                aria-sort={filters.sortBy === 'revise' ? (filters.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                REVISE {renderSortIcon('revise')}
              </th>
            )}
            {isVisible('ID') && (
              <th className={`${styles.th} ${styles.thLeft} ${styles.sortable}`} onClick={() => requestSort('id')} scope="col">
                ID {renderSortIcon('id')}
              </th>
            )}
            {isVisible('Title') && (
              <th className={`${styles.th} ${styles.thLeft} ${styles.sortable}`} onClick={() => requestSort('title')} scope="col">
                TITLE {renderSortIcon('title')}
              </th>
            )}
            {isVisible('Difficulty') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort('difficulty')} scope="col">
                DIFFICULTY {renderSortIcon('difficulty')}
              </th>
            )}
            {isVisible('Companies') && (
              <th className={`${styles.th} ${styles.thCenter}`} scope="col">COMPANIES</th>
            )}
            {!isCompactMode && authEnabled && isVisible('Attempts') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort('attempts')} scope="col">
                ATTEMPTS {renderSortIcon('attempts')}
              </th>
            )}
            {!isCompactMode && authEnabled && isVisible('Time') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort('timeSpent')} scope="col">
                TIME {renderSortIcon('timeSpent')}
              </th>
            )}
            {!isCompactMode && isVisible('Acceptance %') && (
              <th className={`${styles.th} ${styles.thRight} ${styles.sortable}`} onClick={() => requestSort('acceptanceRate')} scope="col">
                ACCEPTANCE {renderSortIcon('acceptanceRate')}
              </th>
            )}
            {!isCompactMode && isVisible('Frequency %') && (
              <th className={`${styles.th} ${styles.thRight} ${styles.sortable}`} onClick={() => requestSort('frequency')} scope="col">
                FREQUENCY {renderSortIcon('frequency')}
              </th>
            )}
            {!isCompactMode && authEnabled && isVisible('DateSolved') && (
              <th className={`${styles.th} ${styles.thCenter} ${styles.sortable}`} onClick={() => requestSort('dateSolved')} scope="col">
                DATE SOLVED {renderSortIcon('dateSolved')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const prog = q.progress || {};
            const isSolved = prog.status === 'Solved';
            const isAttempted = prog.status === 'Attempted' || prog.status === 'Solved';

            const isRevise = !!prog.revise;
            const isRevisionOverdue = !!prog.isDueForRevision;

            const rowClass = isSolved ? styles.rowSolved : (isAttempted ? styles.attemptedRow : styles.row);
            const attempts = prog.attempts || 0;

            const timerRunning = isRunning(q.id);
            const sessionSeconds = getElapsed(q.id);
            const totalTime = (prog.timeSpent || 0) + sessionSeconds;

            const tagArray = Array.isArray(prog.tags) ? prog.tags : [];

            return (
              <tr key={q.id} className={rowClass}>
                {/* STATUS column */}
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.statusCell}>
                      <div className={styles.checkboxRow}>
                        {/* Attempted checkbox */}
                        <button
                          className={`${styles.checkboxBtn} ${isAttempted ? styles.checkedAttempted : ''}`}
                          onClick={() => {
                            if (isAttempted) {
                              updateProgress(q.id, { status: 'Unsolved' });
                            } else {
                              updateProgress(q.id, { status: 'Attempted' });
                            }
                          }}
                          title={isAttempted ? 'Unmark Attempted' : 'Mark Attempted'}
                          aria-label={isAttempted ? 'Unmark Attempted' : 'Mark Attempted'}
                        >
                          {isAttempted && (
                            <span className={styles.attemptedLabel}>A</span>
                          )}
                        </button>

                        {/* Solved checkbox */}
                        <button
                          className={`${styles.checkboxBtn} ${isSolved ? styles.checked : ''}`}
                          onClick={() => {
                            if (isSolved) {
                              updateProgress(q.id, { status: 'Unsolved' });
                            } else {
                              if (onOpenInitialSolve) onOpenInitialSolve(q);
                            }
                          }}
                          title={isSolved ? 'Unmark Solved (clears all data)' : 'Mark Solved'}
                          aria-label={isSolved ? 'Unmark Solved' : 'Mark Solved'}
                        >
                          {isSolved && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {isSolved && prog.confidenceLevel && (
                        <div className={styles.confidenceSelector}>
                          {[1, 2, 3, 4].map(lvl => (
                            <button
                              key={lvl}
                              className={`${styles.confBtn} ${styles[`confLevel${lvl}`]} ${prog.confidenceLevel === lvl ? styles.confActive : ''}`}
                              onClick={() => updateProgress(q.id, { confidenceLevel: lvl })}
                              title={`Confidence level ${lvl}`}
                              aria-label={`Set confidence to ${lvl}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                )}

                {/* REVISE column */}
                {authEnabled && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.reviseCell}>
                      {(isSolved || isAttempted) ? (
                        <button
                          className={`${styles.checkboxBtn}
                            ${isRevise ? styles.checked : ''}
                            ${!isRevise && isRevisionOverdue ? styles.checkedOverdue : ''}
                            ${!isRevise && !isRevisionOverdue ? styles.revisionPending : ''}
                          `}
                          onClick={() => {
                            if (isRevise) {
                              updateProgress(q.id, { revise: false });
                            } else {
                              if (onOpenReflection) onOpenReflection(q);
                              else updateProgress(q.id, { revise: true });
                            }
                          }}
                          title={isRevise ? 'Unmark for revision' : 'Mark for revision'}
                          aria-label={isRevise ? 'Unmark for revision' : 'Mark for revision'}
                        >
                          {isRevise && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span className={styles.emptyCell} aria-hidden="true">-</span>
                      )}

                      {/* SRS badge */}
                      {prog.nextRevisionDate && (() => {
                        const nextDate = new Date(prog.nextRevisionDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        nextDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.round((nextDate - today) / 86400000);
                        let badgeClass = styles.srsUpcoming;
                        let text = `IN ${diffDays}d`;
                        if (diffDays < 0)  { badgeClass = styles.srsOverdue; text = `${Math.abs(diffDays)}d OVERDUE`; }
                        else if (diffDays === 0) { badgeClass = styles.srsToday; text = 'TODAY'; }
                        else if (diffDays === 1) { text = 'IN 1d'; }
                        return <span className={`${styles.srsBadge} ${badgeClass}`}>{text}</span>;
                      })()}
                    </div>
                  </td>
                )}

                {/* ID */}
                {isVisible('ID') && (
                  <td className={`${styles.td} ${styles.tdLeft} ${styles.idText}`}>{q.id}</td>
                )}

                {/* Title + Notes + Tags */}
                {isVisible('Title') && (
                  <td className={`${styles.td} ${styles.tdLeft}`}>
                    <div className={styles.titleRow}>
                      {authEnabled && (
                        <button
                          className={styles.starBtn}
                          onClick={() => updateProgress(q.id, { important: !prog.important })}
                          title={prog.important ? 'Unmark Important' : 'Mark as Important'}
                          aria-label={prog.important ? 'Remove star' : 'Star this question'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={prog.important ? '#facc15' : 'none'} stroke={prog.important ? '#facc15' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      )}
                      <span className={styles.titleText}>{q.title}</span>
                      <a href={q.url} target="_blank" rel="noreferrer" className={styles.link} title="Open on LeetCode" aria-label={`Open ${q.title} on LeetCode`}>
                        <svg className={styles.externalIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                      {prog.solutionLink && (
                        <a
                          href={prog.solutionLink}
                          target="_blank"
                          rel="noreferrer"
                          className={`${styles.link} ${styles.solutionLink}`}
                          title="My Solution"
                          aria-label={`View solution for ${q.title}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </a>
                      )}
                      {authEnabled && (
                        <button
                          className={styles.notesBtn}
                          onClick={() => onOpenNotes && onOpenNotes(q)}
                          aria-label={`${prog.notes ? 'View' : 'Add'} notes for ${q.title}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          {prog.notes ? 'Notes' : 'Add Notes'}
                        </button>
                      )}
                    </div>

                    {authEnabled && (
                      <div className={styles.addTagContainer}>
                        <input
                          type="text"
                          className={styles.tagInput}
                          placeholder="+ add tags (comma sep)"
                          onKeyDown={(e) => handleTagInput(e, q.id)}
                          aria-label="Add tags (comma separated, press Enter)"
                        />
                        <select
                          className={styles.patternSelect}
                          value={prog.pattern || ''}
                          onChange={(e) => updateProgress(q.id, { pattern: e.target.value })}
                          aria-label="Select pattern"
                        >
                          <option value="" disabled>+ select pattern</option>
                          {patterns?.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {tagArray.length > 0 ? (
                      <div className={styles.tagList}>
                        {tagArray.map(t => (
                          <span key={t} className={styles.tagPill}>{t}</span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                )}

                {/* Difficulty */}
                {isVisible('Difficulty') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.pill} ${getDifficultyClass(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                  </td>
                )}

                {/* Companies — capitalize slug display */}
                {isVisible('Companies') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    {q.companies && q.companies.length > 0 ? (
                      <div className={styles.companiesList}>
                        {q.companies.slice(0, 3).map(c => (
                          <span key={c} className={styles.companyPill} title={capitalizeSlug(c)}>
                            {capitalizeSlug(c)}
                          </span>
                        ))}
                        {q.companies.length > 3 && (
                          <span className={styles.companyPill} title={q.companies.slice(3).map(capitalizeSlug).join(', ')}>
                            +{q.companies.length - 3}
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                )}

                {/* Attempts */}
                {!isCompactMode && authEnabled && isVisible('Attempts') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    {(attempts > 0 || isAttempted) ? (
                      <div className={styles.attemptControl}>
                        <button
                          className={styles.attemptBtn}
                          onClick={() => updateProgress(q.id, { attempts: Math.max(0, attempts - 1) })}
                          aria-label="Decrease attempt count"
                        >-</button>
                        <span className={styles.attemptCount}>{attempts}</span>
                        <button
                          className={styles.attemptBtn}
                          onClick={() => updateProgress(q.id, { attempts: attempts + 1 })}
                          aria-label="Increase attempt count"
                        >+</button>
                      </div>
                    ) : '-'}
                  </td>
                )}

                {/* Timer */}
                {!isCompactMode && authEnabled && isVisible('Time') && (
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <div className={styles.timeTracker}>
                      <span className={styles.timeText}>{formatTime(totalTime)}</span>
                      <button
                        className={`${styles.timerBtn} ${timerRunning ? styles.timerActive : ''}`}
                        aria-label={timerRunning ? 'Stop timer' : 'Start timer'}
                        onClick={() => {
                          if (timerRunning) {
                            const elapsed = stopTimer(q.id);
                            updateProgress(q.id, { timeSpent: (prog.timeSpent || 0) + elapsed });
                          } else {
                            startTimer(q.id);
                          }
                        }}
                      >
                        {timerRunning ? '⏹️' : '⏱️'}
                      </button>
                    </div>
                  </td>
                )}

                {/* Acceptance */}
                {!isCompactMode && isVisible('Acceptance %') && (
                  <td className={`${styles.td} ${styles.tdRight}`}>{q.acceptanceRate || '-'}</td>
                )}

                {/* Frequency */}
                {!isCompactMode && isVisible('Frequency %') && (
                  <td className={`${styles.td} ${styles.tdRight}`}>{q.frequency || '-'}</td>
                )}

                {/* Date Solved */}
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
              <td colSpan={12} className={styles.emptyState}>
                No questions found matching your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Phase 3: wrap in React.memo — prevents re-render when parent re-renders with same props
export default memo(Table);
