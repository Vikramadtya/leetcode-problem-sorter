'use client';

import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * useFilterHandlers — Returns stable filter callbacks plus derived filter
 * option lists for the ProblemFilterToolbar.
 *
 * Centralises the two annoyances that were duplicated across page.js and
 * explore/page.js:
 *  1. The 'all' vs '' conversion between store format and toolbar display format
 *  2. Derived tag / pattern / platform option lists built from the question list
 */
export function useFilterHandlers() {
  const { questions, patterns, filters, setFilter, setFilters } = useAppStore(
    useShallow((state) => ({
      questions: state.questions,
      patterns: state.patterns,
      filters: state.filters,
      setFilter: state.setFilter,
      setFilters: state.setFilters,
    }))
  );

  // ── Individual filter change ─────────────────────────────────────────────
  /**
   * handleFilterChange — Normalises toolbar values before writing to the store.
   *
   * Free-text fields (search, tag, dates) clear to '' when empty.
   * Dropdown fields clear to 'all' when empty — the store / apiClient then
   * omits 'all' from the query string automatically.
   */
  const handleFilterChange = useCallback(
    (key, value) => {
      if (key === 'sort') {
        if (!value || value === 'all') {
          setFilters({ sortBy: '', sortDirection: 'asc' });
        } else {
          const [sortBy, sortDirection] = value.split('_');
          setFilters({ sortBy, sortDirection });
        }
        return;
      }

      const freeTextFields = ['search', 'tag', 'fromDate', 'toDate'];
      if (freeTextFields.includes(key)) {
        setFilter(key, value ?? '');
      } else {
        setFilter(key, value || 'all');
      }
    },
    [setFilter],
  );

  // ── Batch clear all filters ──────────────────────────────────────────────
  const handleClearFilters = useCallback(
    () =>
      setFilters({
        search: '',
        status: 'all',
        difficulty: 'all',
        tag: '',
        pattern: 'all',
        company: 'all',
        timePeriod: 'all',
        reviseFilter: false,
        hideSolved: false,
        starredOnly: false,
        fromDate: '',
        toDate: '',
        sortBy: '',
        sortDirection: 'asc',
      }),
    [setFilters],
  );

  // ── Derived option lists (memoised) ─────────────────────────────────────
  const allTags = useMemo(() => {
    const s = new Set();
    (questions || []).forEach((q) => {
      if (Array.isArray(q.tags)) q.tags.forEach((t) => s.add(t));
      if (Array.isArray(q.progress?.tags)) q.progress.tags.forEach((t) => s.add(t));
    });
    return [...s].sort();
  }, [questions]);

  const companies = useAppStore(state => state.companies) || [];
  const allCompanyNames = useMemo(
    () => companies.map((c) => c.name),
    [companies]
  );

  /** Pattern name strings derived from the store's UtilityItem[] array */
  const allPatternNames = useMemo(
    () => (patterns || []).map((p) => p.name),
    [patterns],
  );

  /** All unique platforms from the current question set, sorted alphabetically */
  const allPlatforms = useMemo(() => {
    const s = new Set((questions || []).map((q) => q.platform).filter(Boolean));
    return [...s].sort();
  }, [questions]);

  // ── Toolbar display filters (convert 'all' → '' for controlled inputs) ──
  /**
   * The toolbar uses '' to represent "no filter selected" in its <select>
   * elements. The store uses 'all'. This converts between them.
   */
  const toolbarFilters = useMemo(
    () => ({
      search: filters.search || '',
      difficulty: filters.difficulty === 'all' ? '' : filters.difficulty || '',
      pattern: filters.pattern === 'all' ? '' : filters.pattern || '',
      company: filters.company === 'all' ? '' : filters.company || '',
      timePeriod: filters.timePeriod === 'all' ? '' : filters.timePeriod || '',
      tag: filters.tag || '',
      platform: filters.platform === 'all' ? '' : filters.platform || '',
      fromDate: filters.fromDate || '',
      toDate: filters.toDate || '',
      // Reconstruct a combined sort string if needed by the toolbar
      sort: filters.sortBy
        ? `${filters.sortBy}_${filters.sortDirection || 'asc'}`
        : '',
    }),
    [filters],
  );

  return {
    handleFilterChange,
    handleClearFilters,
    allTags,
    allPatternNames,
    allPlatforms,
    allCompanyNames,
    toolbarFilters,
  };
}
