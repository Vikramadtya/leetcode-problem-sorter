import { create } from 'zustand';
import { apiClient } from '../lib/api/apiClient';

// ─── Constants ────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

// Default filter state factory — allows pages to reset cleanly
const defaultFilters = () => ({
  search: '',
  difficulty: 'all',
  company: 'all',
  status: 'all',
  tag: '',
  pattern: 'all',
  hideSolved: false,
  starredOnly: false,
  reviseFilter: false,
  trackerMode: false,
  sortBy: '',
  sortDirection: 'asc',
  page: 1,
  limit: 1000,
});

// ─── Store ────────────────────────────────────────────────────────────────

export const useAppStore = create((set, get) => {
  // Debounce timer ref — lives outside React render cycle
  let fetchDebounceTimer = null;

  return {
    // ── State ──────────────────────────────────────────────────────────
    questions: [],
    totalCount: 0,
    page: 1,
    totalPages: 1,
    isLoading: false,
    error: null,
    companies: [],   // CompanyItem[] → {name, slug, count}[]
    patterns: [],    // UtilityItem[] → {id, name, description}[]
    stats: {
      solved: 0,
      attempted: 0,
      dueRevision: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      currentStreak: 0,
      maxStreak: 0,
      weeklyCount: 0,
      activityTimeline: null,
    },
    filters: defaultFilters(),

    // ── Filter actions ──────────────────────────────────────────────────

    /** Update a single filter key and trigger a debounced fetch */
    setFilter: (key, value) => {
      set(state => ({
        filters: { ...state.filters, [key]: value, page: 1 },
      }));
      get()._debouncedFetch();
    },

    /** Batch update multiple filter keys and trigger a debounced fetch */
    setFilters: (newFilters) => {
      set(state => ({
        filters: { ...state.filters, ...newFilters, page: 1 },
      }));
      get()._debouncedFetch();
    },

    /** Reset to tracker mode (home page): shows only engaged questions */
    resetToTrackerMode: () => {
      set({ filters: { ...defaultFilters(), trackerMode: true } });
      get().fetchQuestions();
    },

    /** Reset to explore mode (explore page): shows all global questions */
    resetToExploreMode: () => {
      set({ filters: { ...defaultFilters(), trackerMode: false } });
      get().fetchQuestions();
    },

    // ── Internal: debounced fetch ───────────────────────────────────────

    _debouncedFetch: () => {
      clearTimeout(fetchDebounceTimer);
      fetchDebounceTimer = setTimeout(() => {
        get().fetchQuestions();
      }, DEBOUNCE_MS);
    },

    // ── Data fetching ───────────────────────────────────────────────────

    fetchQuestions: async () => {
      set({ isLoading: true, error: null });
      try {
        const { filters } = get();
        const response = await apiClient.getQuestions(filters);

        // null = request was aborted (newer request is in-flight) — ignore
        if (response === null) return;

        set({
          questions: response.data || [],
          totalCount: response.totalCount || 0,
          page: response.page || 1,
          totalPages: response.totalPages || 1,
          isLoading: false,
        });
      } catch (error) {
        console.error('[Store] fetchQuestions failed:', error);
        set({ error: error.message, isLoading: false });
      }
    },

    /** Fetch companies + patterns. Call once on page mount. */
    fetchUtilities: async () => {
      try {
        const [utils, comps] = await Promise.all([
          apiClient.getUtilities(),
          apiClient.getCompanies(),
        ]);
        set({
          patterns: utils.patterns || [],
          companies: comps || [],
        });
      } catch (error) {
        console.error('[Store] fetchUtilities failed:', error);
      }
    },

    /**
     * Lightweight stats for Tracker + Explore pages.
     * Calls GET /stats (not the heavy /analytics).
     */
    fetchLightStats: async () => {
      try {
        const data = await apiClient.getStats();
        set({
          stats: {
            solved: data.totalSolved || 0,
            attempted: data.totalAttempted || 0,
            dueRevision: data.totalRevise || 0,
            easy: data.difficultyBreakdown?.Easy || 0,
            medium: data.difficultyBreakdown?.Medium || 0,
            hard: data.difficultyBreakdown?.Hard || 0,
            currentStreak: data.currentStreak || 0,
            maxStreak: data.maxStreak || 0,
            weeklyCount: data.weeklyCount || 0,
            // API returns { "2026-06-10": 3, ... } object — Heatmap accepts this directly
            activityTimeline: data.activityTimeline || null,
          },
        });
      } catch (error) {
        console.error('[Store] fetchLightStats failed:', error);
      }
    },

    /**
     * Full analytics for Dashboard page only.
     * @deprecated Use fetchLightStats() for Tracker/Explore pages.
     */
    fetchStats: async () => {
      try {
        const data = await apiClient.getAnalytics();
        set({
          stats: {
            solved: data.totalSolved || 0,
            attempted: data.totalAttempted || 0,
            dueRevision: data.totalRevise || 0,
            easy: data.difficultyBreakdown?.Easy || 0,
            medium: data.difficultyBreakdown?.Medium || 0,
            hard: data.difficultyBreakdown?.Hard || 0,
            currentStreak: data.currentStreak || 0,
            maxStreak: data.maxStreak || 0,
            weeklyCount: data.weeklyCount || 0,
            activityTimeline: data.activityTimeline || null,
          },
        });
      } catch (error) {
        console.error('[Store] fetchStats failed:', error);
      }
    },

    // ── Progress update ─────────────────────────────────────────────────

    /**
     * Optimistic update → PATCH → replace with server response.
     *
     * CRITICAL: We replace local state from the SERVER RESPONSE, not the
     * request payload. This is how dateSolved and nextRevisionDate (computed
     * server-side) become visible in the UI.
     */
    updateProgress: async (questionId, updates) => {
      const previousQuestions = get().questions;

      // 1. Optimistic update — show the change immediately
      set(state => ({
        questions: state.questions.map(q =>
          q.id === questionId
            ? { ...q, progress: { ...q.progress, ...updates } }
            : q
        ),
      }));

      try {
        // 2. Send to server — server stamps dates, computes SRS
        const serverProgress = await apiClient.updateProgress(questionId, updates);
        if (!serverProgress) return; // 401 handled by apiClient

        // 3. Replace optimistic state with authoritative server response
        set(state => ({
          questions: state.questions.map(q =>
            q.id === questionId
              ? { ...q, progress: serverProgress }
              : q
          ),
        }));

        // 4. If unsolved AND we're in tracker mode: re-fetch to remove
        //    the question from the tracker view
        if (updates.status === 'Unsolved' && get().filters.trackerMode) {
          await get().fetchQuestions();
        }

        // 5. Refresh lightweight stats (streak, heatmap) after every solve/revise
        if (updates.status === 'Solved' || updates.revise === true) {
          get().fetchLightStats();
        }

      } catch (error) {
        console.error('[Store] updateProgress failed:', error);
        // Roll back optimistic update
        set({ questions: previousQuestions });
      }
    },
  };
});
