import { create } from 'zustand';
import { apiClient } from '../lib/api/apiClient';

// ─── Logging ──────────────────────────────────────────────────────────────
const log = {
  info: (...args) => console.info('[Store]', ...args),
  warn: (...args) => console.warn('[Store]', ...args),
  error: (...args) => console.error('[Store]', ...args),
};

// ─── Constants ────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

// Default filter state factory — allows pages to reset cleanly
const defaultFilters = () => ({
  search: '',
  difficulty: 'all',
  company: 'all',
  timePeriod: 'all',
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
      favourite: 0,
      totalQuestions: 0,
      completionPercent: "0.0",
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
        log.error('fetchQuestions failed:', error);
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
        log.error('fetchUtilities failed:', error);
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
            favourite: data.totalFavourite || 0,
            totalQuestions: data.totalQuestions || 0,
            completionPercent: data.completionPercent || "0.0",
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
        log.error('fetchLightStats failed:', error);
      }
    },

    /**
     * fetchStats — Full analytics for Dashboard page only.
     *
     * Saves normalised summary fields AND the complete raw server response
     * as `stats._raw` so Dashboard can access topCompanies, patternMasteryData,
     * revisionList, avgTimePerDiff, platformsBreakdown etc.
     *
     * Do NOT call from Tracker / Explore pages — use fetchLightStats() instead.
     */
    fetchStats: async () => {
      try {
        const data = await apiClient.getAnalytics();
        set({
          stats: {
            // Normalised summary fields (same shape as fetchLightStats)
            solved:    data.totalSolved    || 0,
            attempted: data.totalAttempted || 0,
            dueRevision: data.totalRevise  || 0,
            favourite: data.totalFavourite || 0,
            totalQuestions: data.totalQuestions || 0,
            completionPercent: data.completionPercent || "0.0",
            easy:   data.difficultyBreakdown?.Easy   || 0,
            medium: data.difficultyBreakdown?.Medium || 0,
            hard:   data.difficultyBreakdown?.Hard   || 0,
            currentStreak: data.currentStreak || 0,
            maxStreak:     data.maxStreak     || 0,
            weeklyCount:   data.weeklyCount   || 0,
            activityTimeline: data.activityTimeline || null,
            // Full raw payload — Dashboard reads chart data from here
            _raw: data,
          },
        });
      } catch (error) {
        log.error('fetchStats failed:', error);
      }
    },


    // ── Flashcard mode ──────────────────────────────────────────────────

    /**
     * openFlashcards — Fetches questions due for revision and returns them.
     * Called by the Tracker page before opening FlashcardMode.
     */
    openFlashcards: async () => {
      try {
        const data = await apiClient.getQuestions({
          reviseFilter: true,
          trackerMode: true,
          limit: 1000,
        });
        log.info('openFlashcards: loaded', data?.data?.length ?? 0, 'questions');
        return data?.data || [];
      } catch (error) {
        log.error('openFlashcards failed:', error);
        return [];
      }
    },

    /**
     * bulkUpdateProgress — Batch update used by FlashcardMode at end of session.
     * Applies same SRS logic as PATCH /progress/:id but in one network round-trip.
     */
    bulkUpdateProgress: async (updates = []) => {
      if (!updates.length) return;
      try {
        await apiClient.bulkUpdateProgress(updates);
        log.info('bulkUpdateProgress: committed', updates.length, 'updates');
        // Refresh stats after bulk commit
        get().fetchLightStats();
      } catch (error) {
        log.error('bulkUpdateProgress failed:', error);
        throw error;
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

        // 5. Refresh lightweight stats (streak, heatmap) after any update
        get().fetchLightStats();

      } catch (error) {
        log.error('updateProgress failed:', error);
        // Roll back the optimistic update to prevent stale UI state
        set({ questions: previousQuestions });
      }
    },
  };
});
