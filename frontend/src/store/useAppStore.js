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

// ─── Slices ───────────────────────────────────────────────────────────────

const createFiltersSlice = (set, get) => {
  let fetchDebounceTimer = null;
  return {
    filters: defaultFilters(),

    setFilter: (key, value) => {
      set(state => ({
        filters: { ...state.filters, [key]: value, page: 1 },
      }));
      get()._debouncedFetch();
    },

    setFilters: (newFilters) => {
      set(state => ({
        filters: { ...state.filters, ...newFilters, page: 1 },
      }));
      get()._debouncedFetch();
    },

    resetToTrackerMode: () => {
      set({ filters: { ...defaultFilters(), trackerMode: true } });
      get().fetchQuestions();
    },

    resetToExploreMode: () => {
      set({ filters: { ...defaultFilters(), trackerMode: false } });
      get().fetchQuestions();
    },

    _debouncedFetch: () => {
      clearTimeout(fetchDebounceTimer);
      fetchDebounceTimer = setTimeout(() => {
        get().fetchQuestions();
      }, DEBOUNCE_MS);
    },
  };
};

const createQuestionsSlice = (set, get) => ({
  questions: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,

  fetchQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getQuestions(get().filters);
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

  updateProgress: async (questionId, updates) => {
    const previousQuestions = get().questions;
    set(state => ({
      questions: state.questions.map(q =>
        q.id === questionId ? { ...q, progress: { ...q.progress, ...updates } } : q
      ),
    }));

    try {
      const serverProgress = await apiClient.updateProgress(questionId, updates);
      if (!serverProgress) return;
      
      set(state => ({
        questions: state.questions.map(q =>
          q.id === questionId ? { ...q, progress: serverProgress } : q
        ),
      }));

      if (updates.status === 'Unsolved' && get().filters.trackerMode) {
        await get().fetchQuestions();
      }
      get().fetchLightStats();
    } catch (error) {
      log.error('updateProgress failed:', error);
      set({ questions: previousQuestions });
    }
  },

  openFlashcards: async () => {
    try {
      const limit = parseInt(get().settings.maxFlashcards || '20', 10);
      const data = await apiClient.getQuestions({
        reviseFilter: true,
        trackerMode: true,
        limit,
      });
      return data?.data || [];
    } catch (error) {
      log.error('openFlashcards failed:', error);
      return [];
    }
  },

  bulkUpdateProgress: async (updates = []) => {
    if (!updates.length) return;
    try {
      await apiClient.bulkUpdateProgress(updates);
      get().fetchLightStats();
    } catch (error) {
      log.error('bulkUpdateProgress failed:', error);
      throw error;
    }
  },
});

const createStatsSlice = (set, get) => ({
  stats: {
    solved: 0, attempted: 0, dueRevision: 0, favourite: 0, totalQuestions: 0,
    completionPercent: "0.0", easy: 0, medium: 0, hard: 0, currentStreak: 0,
    maxStreak: 0, weeklyCount: 0, dailyCount: 0, activityTimeline: null,
  },

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
          dailyCount: data.dailyCount || 0,
          activityTimeline: data.activityTimeline || null,
          recentActivity: data.recentActivity || [],
          upcomingRevisions: data.upcomingRevisions || [],
          topPatterns: data.topPatterns || [],
        },
      });
    } catch (error) {
      log.error('fetchLightStats failed:', error);
    }
  },

  fetchStats: async () => {
    try {
      const data = await apiClient.getAnalytics();
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
          dailyCount: data.dailyCount || 0,
          activityTimeline: data.activityTimeline || null,
          recentActivity: data.recentActivity || [],
          upcomingRevisions: data.upcomingRevisions || [],
          topPatterns: data.topPatterns || [],
          _raw: data,
        },
      });
    } catch (error) {
      log.error('fetchStats failed:', error);
    }
  },
});

const createUtilitiesSlice = (set, get) => ({
  companies: [],
  patterns: [],
  settings: {
    dailyGoal: '2',
    weeklyGoal: '10',
    srsLevel1: '1',
    srsLevel2: '3',
    srsLevel3: '7',
    srsLevel4: '14',
    maxFlashcards: '20',
    weekStart: '0',
    defaultDifficulty: 'Medium',
    defaultPlatform: 'LeetCode',
    heatmapTheme: 'green'
  },

  fetchUtilities: async () => {
    try {
      const [utils, comps] = await Promise.all([
        apiClient.getUtilities(),
        apiClient.getCompanies(),
      ]);
      set({ patterns: utils.patterns || [], companies: comps || [] });
    } catch (error) {
      log.error('fetchUtilities failed:', error);
    }
  },

  fetchSettings: async () => {
    try {
      const data = await apiClient.getSettings();
      set({ settings: { ...get().settings, ...data } });
    } catch (error) {
      log.error('fetchSettings failed:', error);
    }
  },

  updateSettings: async (updates) => {
    try {
      const updated = await apiClient.updateSettings(updates);
      set({ settings: { ...get().settings, ...updated } });
    } catch (error) {
      log.error('updateSettings failed:', error);
    }
  },
});

// ─── Main Store ───────────────────────────────────────────────────────────

export const useAppStore = create((set, get) => ({
  ...createFiltersSlice(set, get),
  ...createQuestionsSlice(set, get),
  ...createStatsSlice(set, get),
  ...createUtilitiesSlice(set, get),
}));
