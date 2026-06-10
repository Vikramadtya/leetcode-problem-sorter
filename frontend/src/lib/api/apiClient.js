import toast from 'react-hot-toast';
import config from '../../config.json';
import { getSession } from 'next-auth/react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || config.api.endpoint;
const TIMEOUT_MS = config.api.timeoutMs || 10000;

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Parse a consistent error message from any server error response */
async function parseError(res) {
  try {
    const body = await res.json();
    return body.message || body.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** Wrap fetch with a timeout using AbortController */
async function fetchWithTimeout(url, options = {}, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ─── ApiClient class ───────────────────────────────────────────────────────

class ApiClient {
  constructor() {
    // Holds the AbortController for the most recent GET /questions call
    // so we can cancel it when filters change rapidly.
    this._questionsFetchController = null;
  }

  async getHeaders() {
    const session = await getSession();
    // Use email as the identity token for the mock server (not user.id — that's not a secret)
    const token = session?.user?.email || 'mock-token';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Serialize filter params for query strings:
   *   false          → omit (server treats missing = off)
   *   true           → 'true' (string — OpenAPI validator requirement)
   *   'all' / '' / null / undefined → omit
   *   anything else  → String(value)
   */
  buildQueryString(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (value === false) continue;
      if (value === 'all') continue;
      if (value === true) { query.append(key, 'true'); continue; }
      query.append(key, String(value));
    }
    return query.toString();
  }

  // ── Questions ─────────────────────────────────────────────────────────

  /**
   * GET /questions — cancels any in-flight request when called again.
   * This prevents stale responses overwriting newer filter results.
   */
  async getQuestions(params = {}) {
    // Cancel previous in-flight request
    if (this._questionsFetchController) {
      this._questionsFetchController.abort();
    }
    this._questionsFetchController = new AbortController();

    try {
      const qs = this.buildQueryString(params);
      const url = `${API_BASE}/questions${qs ? '?' + qs : ''}`;
      const headers = await this.getHeaders();
      const res = await fetch(url, {
        headers,
        signal: this._questionsFetchController.signal,
      });

      if (res.status === 401) {
        this._handle401();
        return { data: [], totalCount: 0, page: 1, totalPages: 1 };
      }
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      if (error.name === 'AbortError') return null; // cancelled — caller ignores null
      const msg = this._isMockServerDown(error) ? 'Mock server unreachable. Run: make dev' : error.message;
      console.error('[API] getQuestions:', msg);
      toast.error(`Failed to load questions: ${msg}`);
      throw error;
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────

  /** GET /progress/:id — fetch single question progress */
  async getProgress(questionId) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/progress/${questionId}`, {
        headers: await this.getHeaders(),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error(`[API] getProgress (${questionId}):`, error.message);
      throw error;
    }
  }

  /**
   * PATCH /progress/:id
   * Returns the full server-authoritative ProgressData object.
   * The caller MUST use this response to update local state (not the payload).
   */
  async updateProgress(questionId, updates) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/progress/${questionId}`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.status === 401) { this._handle401(); return null; }
      if (res.status === 404) throw new Error(`Question ${questionId} not found`);
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error(`[API] updateProgress (${questionId}):`, error.message);
      toast.error(`Update failed: ${error.message}`);
      throw error;
    }
  }

  /** POST /progress/bulk — batch update for FlashcardMode */
  async bulkUpdateProgress(updates = []) {
    if (!updates.length) return { updated: 0, results: [] };
    try {
      const res = await fetchWithTimeout(`${API_BASE}/progress/bulk`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ updates }),
      });
      if (res.status === 401) { this._handle401(); return null; }
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] bulkUpdateProgress:', error.message);
      toast.error(`Bulk update failed: ${error.message}`);
      throw error;
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────

  /**
   * GET /stats — lightweight stats for Tracker and Explore pages.
   * Use this instead of getAnalytics() on non-Dashboard pages.
   */
  async getStats() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/stats`, {
        headers: await this.getHeaders(),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] getStats:', error.message);
      throw error;
    }
  }

  /**
   * GET /analytics — full analytics for Dashboard page only.
   * Heavy — do not call from Tracker or Explore.
   */
  async getAnalytics() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/analytics`, {
        headers: await this.getHeaders(),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] getAnalytics:', error.message);
      throw error;
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  async getUtilities() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/utilities`, {
        headers: await this.getHeaders(),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] getUtilities:', error.message);
      return { difficulties: [], platforms: [], patterns: [], tags: [] };
    }
  }

  async getCompanies() {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/companies`, {
        headers: await this.getHeaders(),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] getCompanies:', error.message);
      return [];
    }
  }

  // ── Custom questions ──────────────────────────────────────────────────

  async createCustomQuestion(data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/custom-questions`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.status === 401) { this._handle401(); return null; }
      // Expects 201 Created
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error('[API] createCustomQuestion:', error.message);
      toast.error(`Failed to create question: ${error.message}`);
      throw error;
    }
  }

  // ── Metadata CRUD (patterns / platforms / tags) ───────────────────────

  async getMetadata(type) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/${type}`, {
        headers: await this.getHeaders(),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error(`[API] getMetadata (${type}):`, error.message);
      throw error;
    }
  }

  async createMetadata(type, data) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/${type}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      });
      // Expects 201 Created
      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      console.error(`[API] createMetadata (${type}):`, error.message);
      throw error;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  _handle401() {
    console.warn('[API] 401 Unauthorized — redirecting to sign-in');
    toast.error('Session expired. Please sign in again.');
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/signin';
    }
  }

  _isMockServerDown(error) {
    return (
      error instanceof TypeError &&
      (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED'))
    );
  }
}

export const apiClient = new ApiClient();
