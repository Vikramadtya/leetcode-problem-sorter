import { useState, useMemo, useCallback } from 'react';

import styles from './ProblemFilterToolbar.module.css';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'title_asc', label: 'Title A→Z' },
  { value: 'title_desc', label: 'Title Z→A' },
  { value: 'date_newest', label: 'Newest first' },
  { value: 'date_oldest', label: 'Oldest first' },
  { value: 'additionTime_desc', label: 'Recently Added' },
  { value: 'additionTime_asc', label: 'Oldest Added' },
  { value: 'difficulty_asc', label: 'Easy first' },
  { value: 'difficulty_desc', label: 'Hard first' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All Difficulties' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const TIME_PERIOD_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'thirty-days', label: '30 Days' },
  { value: 'three-months', label: '3 Months' },
  { value: 'six-months', label: '6 Months' },
  { value: 'more-than-six-months', label: '> 6 Months' },
];

/**
 * ProblemFilterToolbar
 *
 * Props:
 *  - activeTab      : number (0=All, 1=Solved, 2=Unsolved)
 *  - onTabChange    : (idx: number) => void
 *  - filters        : { search, fromDate, toDate, sort, difficulty, tag, pattern, platform }
 *  - onFilterChange : (key: string, value: string) => void
 *  - onClear        : () => void
 *  - tags           : string[]
 *  - patterns       : string[]
 *  - platforms      : string[]
 *  - showTabs       : boolean (default true) — hide tabs when page manages status differently
 */
export default function ProblemFilterToolbar({
  activeTab = 0,
  onTabChange,
  filters = {},
  onFilterChange,
  onClear,
  tags = [],
  patterns = [],
  platforms = [],
  companies = [],
  tabs = ['All', 'Solved', 'Unsolved'],
  showTabs = true,
}) {
  const [expanded, setExpanded] = useState(false);

  const set = useCallback(
    (key) => (e) => {
      onFilterChange?.(key, e.target.value);
    },
    [onFilterChange]
  );

  /** Count how many non-default filters are active (for badge) */
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.search) n++;
    if (filters.difficulty) n++;
    if (filters.tag) n++;
    if (filters.pattern) n++;
    if (filters.company) n++;
    if (filters.timePeriod) n++;
    if (filters.platform) n++;
    if (filters.fromDate) n++;
    if (filters.toDate) n++;
    if (filters.sort) n++;
    return n;
  }, [filters]);

  return (
    <div className={styles.toolbar}>
      {/* ── Tab row (All / Solved / Unsolved) ── */}
      {showTabs && (
        <div className={styles.tabsRow} role="tablist" aria-label="Question status filter">
          {tabs.map((tab, idx) => (
            <button
              key={tab}
              id={`filter-tab-${tab.toLowerCase()}`}
              role="tab"
              aria-selected={activeTab === idx}
              className={`${styles.tab} ${activeTab === idx ? styles.tabActive : ''}`}
              onClick={() => onTabChange?.(idx)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ── Search + expand toggle ── */}
      <div className={styles.topRow}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="filter-search"
            type="text"
            placeholder="Search problems… (⌘F)"
            value={filters.search ?? ''}
            onChange={set('search')}
            className={styles.searchInput}
            aria-label="Search problems by title"
          />
          {filters.search && (
            <button
              className={styles.clearSearch}
              onClick={() => onFilterChange?.('search', '')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <button
          className={`${styles.expandBtn} ${expanded ? styles.expandBtnActive : ''}`}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="filter-advanced"
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {activeCount > 0 && (
          <button
            className={styles.clearBtn}
            onClick={onClear}
            id="filter-clear"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Advanced filters (collapsible) ── */}
      {expanded && (
        <div id="filter-advanced" className={styles.advancedRow}>
          {/* Sort */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="filter-sort">
              Sort
            </label>
            <select
              id="filter-sort"
              className={styles.select}
              value={filters.sort ?? ''}
              onChange={set('sort')}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="filter-difficulty">
              Difficulty
            </label>
            <select
              id="filter-difficulty"
              className={styles.select}
              value={filters.difficulty ?? ''}
              onChange={set('difficulty')}
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          {tags.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="filter-tag">
                Tag
              </label>
              <select
                id="filter-tag"
                className={styles.select}
                value={filters.tag ?? ''}
                onChange={set('tag')}
              >
                <option value="">All Tags</option>
                {tags.map((t) => {
                  const val = typeof t === 'object' ? t.name : t;
                  const key = typeof t === 'object' ? t.id || t.name : t;
                  return (
                    <option key={key} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Pattern */}
          {patterns.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="filter-pattern">
                Pattern
              </label>
              <select
                id="filter-pattern"
                className={styles.select}
                value={filters.pattern ?? ''}
                onChange={set('pattern')}
              >
                <option value="">All Patterns</option>
                {patterns.map((p) => {
                  const val = typeof p === 'object' ? p.name : p;
                  const key = typeof p === 'object' ? p.id || p.name : p;
                  return (
                    <option key={key} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Company */}
          {companies.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="filter-company">
                Company
              </label>
              <select
                id="filter-company"
                className={styles.select}
                value={filters.company ?? ''}
                onChange={set('company')}
              >
                <option value="">All Companies</option>
                {companies.map((c) => {
                  const val = typeof c === 'object' ? c.name : c;
                  const key = typeof c === 'object' ? c.id || c.slug || c.name : c;
                  return (
                    <option key={key} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Time Period (Only visible if Company is selected) */}
          {companies.length > 0 && filters.company && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="filter-time-period">
                Time Period
              </label>
              <select
                id="filter-time-period"
                className={styles.select}
                value={filters.timePeriod ?? ''}
                onChange={set('timePeriod')}
              >
                {TIME_PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Platform */}
          {platforms.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="filter-platform">
                Platform
              </label>
              <select
                id="filter-platform"
                className={styles.select}
                value={filters.platform ?? ''}
                onChange={set('platform')}
              >
                <option value="">All Platforms</option>
                {platforms.map((p) => {
                  const val = typeof p === 'object' ? p.name : p;
                  const key = typeof p === 'object' ? p.id || p.name : p;
                  return (
                    <option key={key} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="filter-from">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.fromDate ?? ''}
              onChange={set('fromDate')}
              className={styles.select}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="filter-to">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.toDate ?? ''}
              onChange={set('toDate')}
              className={styles.select}
            />
          </div>
        </div>
      )}
    </div>
  );
}
