# Tacker — Findings & Analysis

> Conversation `43446f4c-2a6d-4fe8-972f-83a76f0ef059`  
> Last updated: 2026-06-10

---

## 1. Data Facts

| Metric | Value |
|--------|-------|
| Global questions | **3,358 total** |
| Easy | 811 |
| Medium | 1,789 |
| Hard | 758 |
| Unique companies | **654** |
| `global_questions.json` size | ~51K lines / ~5MB |
| SRS intervals | `{ 1: 1d, 2: 3d, 3: 7d, 4: 14d }` |

### Data Shape (global_questions.json)
```json
{
  "ID": "1",
  "Title": "Two Sum",
  "Difficulty": "Easy",
  "Acceptance %": "57.5%",
  "Frequency %": "100.0",
  "Leetcode Question Link": "https://leetcode.com/problems/two-sum/",
  "companies": ["google", "amazon", "meta"]
}
```

### Company Slug Format
Companies are stored as **lowercase slugs** (e.g., `"google"`, `"american-express"`).  
The `/companies` endpoint returns `{name, slug, count}[]` — `name` equals `slug` for global questions.  
Custom questions get a `"Custom Questions"` pseudo-company entry.

### Tags
Previously stored as **comma-strings** (`"Array,Hash Map"`).  
Now stored as **arrays** (`["Array", "Hash Map"]`) throughout.  
Migration handled in `loadProgress()` on server startup.

---

## 2. Architecture Decisions

### 2.1 "Dumb UI, Smart API" Principle
The core architectural decision: **zero business logic in the frontend**.

| Where | What lives there |
|-------|-----------------|
| Mock Server | SRS calculations, dateSolved stamping, filter logic, analytics |
| Frontend | Render what the API returns, send intent (not computed values) |

This means the frontend NEVER:
- Calculates `nextRevisionDate`
- Stamps `dateSolved`  
- Does array filtering/sorting
- Computes streak or heatmap data

### 2.2 In-Memory Indexes
Built once at server startup from `global_questions.json`:

```
questionMap     : Map<id, Question>        — O(1) lookup
companyIndex    : Map<slug, Set<id>>       — O(1) company filter
difficultyIndex : Map<'easy'|..., Set<id>> — O(1) difficulty filter
progressMap     : Map<id, ProgressRecord>  — O(1) progress lookup
```

**Result:** `GET /questions` went from O(n²) to O(n) — one linear pass over candidate IDs.

### 2.3 Analytics Cache (Dirty Flag Pattern)
```
analyticsCache = null  ← any PATCH sets this
getOrComputeAnalytics() checks if null → recomputes → caches
GET /stats and GET /analytics both use the same cache
```

**Why:** Computing analytics over 3,358 questions on every request was wasteful.  
The cache is intentionally simple: one dirty flag, no TTL, no versioning.

### 2.4 Stats vs Analytics Split
Two endpoints serve different pages:
- `GET /stats` → StatsBar + streak widget + heatmap (Tracker + Explore pages)
- `GET /analytics` → Full Dashboard charts (only Dashboard page)

Both share the same cache computation. `GET /stats` returns a subset of `GET /analytics`.

### 2.5 Tags as Arrays (Breaking Change)
Tags changed from comma-strings to proper arrays throughout the stack:
- OpenAPI schema: `tags: array of string`
- Server: normalizes on load, stores as array, returns as array
- Frontend: needs to send arrays (Table.js still sends strings — see Bugs)

### 2.6 Companies as Enriched Objects
`GET /companies` returns `{name, slug, count}[]` instead of `string[]`.
- Sorted by question count (most relevant companies first)
- `slug` is the filter value to send to `GET /questions?company=slug`
- `count` enables showing question counts in dropdowns (not yet done)

---

## 3. Bugs Found and Fixed

### Bug 1: `dateSolved` Never Showing (FIXED ✅)
**Root cause:** `updateProgress()` in `useAppStore.js` was using the **request payload** as the optimistic update AND never applying the server response. Since the payload never contains `dateSolved`, it never rendered.

**Fix:** After the PATCH succeeds, apply the **server response** (which has all computed fields):
```js
const serverProgress = await apiClient.updateProgress(questionId, updates);
set(state => ({
  questions: state.questions.map(q =>
    q.id === questionId ? { ...q, progress: serverProgress } : q
  )
}));
```

### Bug 2: Streak/Heatmap Hidden (FIXED ✅)
**Root cause 1:** Heatmap component expected array `[{date, count}]` but server returned object `{"date": count}`.  
**Fix:** Heatmap now accepts both formats.

**Root cause 2:** Condition `stats?.activityTimeline` was checking for truthiness but `null` was passed when no activity.  
**Fix:** `hasActivity = stats.solved > 0 || (stats.activityTimeline && Object.keys(stats.activityTimeline).length > 0)`

### Bug 3: Tracker/Explore State Bleed (FIXED ✅)
**Root cause:** Both pages shared the same Zustand filters. Navigating from Explore (no trackerMode) to Tracker showed all global questions.

**Fix:** `resetToTrackerMode()` and `resetToExploreMode()` actions + `useRef` guard on mount:
```js
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;
  resetToTrackerMode();
}, []);
```

### Bug 4: Boolean Filter Params 400 Errors (FIXED ✅)
**Root cause:** OpenAPI validator expects string `'true'/'false'` in query params, not JS booleans. The old code serialized `true` → `"true"` but also sent `false` → `"false"` which the validator rejected.

**Fix:** `buildQueryString()` — omit `false` entirely (server treats missing as off), convert `true → 'true'`.

### Bug 5: `useEffect` Infinite Re-fetch (FIXED ✅)
**Root cause:** Function references (`fetchStats`, `fetchQuestions`) in `useEffect` deps array. These functions are created fresh on each render → infinite loop.

**Fix:** `useRef` guard pattern + removing function refs from dependency arrays.

---

## 4. Current Gaps (Unresolved)

### Gap 1: Company Dropdown Broken
**File:** `page.js:275`, `explore/page.js` (same pattern)  
**Problem:** Companies state contains `{name, slug, count}` objects, but the `<option>` uses `key={c} value={c}` treating `c` as a string.  
**Result:** Dropdown shows `[object Object]` and filter sends wrong value.

**Fix:**
```jsx
{companies.map(c => (
  <option key={c.slug || c} value={c.slug || c}>
    {c.name || c}
  </option>
))}
```
The `|| c` fallback handles any old string format during transition.

### Gap 2: Tags Sent as String from Table.js
**File:** `Table.js:48`  
**Problem:** `handleTagInput` sends `{ tags: tagsString }` (a string) — server normalizes it but this is wrong by contract.

**Fix:**
```js
updateProgress(id, { 
  tags: tagsString.split(',').map(t => t.trim()).filter(Boolean) 
});
```

### Gap 3: `fetchStats` Calls Wrong Endpoint
**File:** `useAppStore.js:109`  
**Problem:** `fetchStats()` calls `GET /analytics` (heavy) but is used by Tracker + Explore pages, not just Dashboard.

**Fix:**
1. Add `getStats()` to `apiClient.js` → `GET /api/v1/stats`
2. Add `fetchLightStats()` to store → calls `getStats()`  
3. Tracker + Explore pages call `fetchLightStats()`  
4. Dashboard page calls `fetchStats()` (full analytics)

### Gap 4: FlashcardMode Individual PATCHes
**File:** `FlashcardMode.js`  
**Problem:** Each confidence update is a separate PATCH. With 50 flashcards, that's 50 sequential requests.

**Fix:**
1. Add `bulkUpdateProgress(updates)` to `apiClient.js` → `POST /api/v1/progress/bulk`
2. Accumulate updates in local state
3. Call bulk endpoint when modal closes

---

## 5. Performance Characteristics

### Mock Server
| Operation | Complexity | Notes |
|-----------|-----------|-------|
| `GET /questions` (no filters) | O(n) | Full list walk |
| `GET /questions?company=google` | O(k) where k = google questions | Uses companyIndex |
| `GET /questions?difficulty=Easy` | O(k) where k = easy questions | Uses difficultyIndex |
| `PATCH /progress/:id` | O(1) + disk write | progressMap update |
| `GET /stats` (cached) | O(1) | Served from cache |
| `GET /analytics` (recompute) | O(p) where p = progress entries | Only on first call or after PATCH |

### Frontend
| Component | Notes |
|-----------|-------|
| Table with 3,358 rows | Renders all in DOM — no virtualization yet |
| Filter debounce | 300ms for search + tag inputs |
| Stats re-fetch | Triggered after solve/revise with 300ms delay |
| Page init | `useRef` guard ensures single fetch on mount |

---

## 6. Data Flow Diagrams

### Question Update Flow
```
User clicks "Solved"
    → page.js handleSaveInitialSolve()
    → store.updateProgress(id, { status: 'Solved', confidenceLevel, notes, pattern })
    → Optimistic update: merge payload into local state
    → apiClient.updateProgress(id, payload) → PATCH /api/v1/progress/{id}
    → Mock server: stamps dateSolved, computes nextRevisionDate
    → Server returns full ProgressData object
    → Store applies server response to local state (dateSolved now visible)
    → If trackerMode && status=Unsolved: re-fetch questions list
    → setTimeout(fetchStats, 300) → GET /api/v1/stats → update streak/heatmap
```

### Filter Change Flow
```
User changes difficulty dropdown
    → setFilter('difficulty', 'Easy')
    → store updates filters state
    → store.fetchQuestions() called immediately
    → apiClient.getQuestions(filters) → GET /questions?difficulty=Easy&trackerMode=true&...
    → buildQueryString() serializes: booleans omit false, convert true→'true', skip 'all'
    → Mock server: difficultyIndex.get('easy') → O(1) candidate set
    → Filter/sort/paginate → return JSON
    → store.questions updated → Table re-renders
```

---

## 7. Future Backend (Java Micronaut)

The mock server is a placeholder. The real backend will be:
- **Java Micronaut** with JOOQ + PostgreSQL
- OpenAPI contract at `/api-contract/openapi.yaml` is the binding contract for both
- **Database schema** in `/docs/design_doc.md` (PostgreSQL DDL)
- **Weekly sync job** (`@Scheduled`) to pull from GitHub leetcode questions repo

### Migration Path
1. Implement Micronaut controllers matching OpenAPI spec exactly
2. Replace `NEXT_PUBLIC_API_URL=http://localhost:4000` with production URL
3. Mock server is discarded — frontend requires zero changes

---

## 8. Key File Locations

| What | Where |
|------|-------|
| Mock server | `/mock-server/server.js` |
| OpenAPI spec | `/api-contract/openapi.yaml` |
| Zustand store | `/frontend/src/store/useAppStore.js` |
| API client | `/frontend/src/lib/api/apiClient.js` |
| Config (auth, API URL) | `/frontend/src/config.json` |
| Tracker page | `/frontend/src/app/page.js` |
| Explore page | `/frontend/src/app/explore/page.js` |
| Dashboard page | `/frontend/src/app/dashboard/page.js` |
| Table component | `/frontend/src/app/components/Table.js` |
| Heatmap component | `/frontend/src/app/components/Heatmap.js` |
| FlashcardMode | `/frontend/src/app/components/FlashcardMode.js` |
| Global questions data | `/mock-server/data/global_questions.json` |
| User progress data | `/mock-server/data/user_progress.json` |
| Design doc | `/docs/design_doc.md` |
| This file | `/docs/findings_and_analysis.md` |
