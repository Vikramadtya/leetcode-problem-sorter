# 07 — Known Issues & TODO

> **If you are resuming work on this codebase, start here.**  
> Last updated: 2026-06-10

---

## Priority 1 — Critical Bugs (Fix First)

### BUG-1: Company Dropdown Renders `[object Object]`

**Status:** 🔴 Unresolved  
**Files:** `frontend/src/app/page.js:275`, `frontend/src/app/explore/page.js:199`  
**Impact:** Company filter is completely broken — selecting a company sends `[object Object]` as the filter value

**Root cause:** `GET /companies` now returns `CompanyItem[]` objects `{name, slug, count}` instead of plain strings. The dropdown code still treats each item as a string.

**Current broken code (both files):**
```jsx
{companies.map(c => <option key={c} value={c}>{c}</option>)}
```

**Fix:**
```jsx
{companies.map(c => (
  <option key={c.slug || c} value={c.slug || c}>
    {c.name || c}
  </option>
))}
```
The `|| c` fallback safely handles any legacy plain string format during transition.

---

### BUG-2: Tags Sent as String from Table.js

**Status:** 🔴 Unresolved  
**File:** `frontend/src/app/components/Table.js:48`  
**Impact:** When a user types tags in the table row input and presses Enter, tags are sent as a comma-string. The server normalizes it, but the data contract specifies arrays.

**Current broken code:**
```js
const handleTagInput = (e, id) => {
  if (e.key === 'Enter') {
    const tagsString = e.target.value;
    updateProgress(id, { tags: tagsString });  // ← sends string
    e.target.value = '';
  }
};
```

**Fix:**
```js
const handleTagInput = (e, id) => {
  if (e.key === 'Enter') {
    const tagsString = e.target.value;
    updateProgress(id, {
      tags: tagsString.split(',').map(t => t.trim()).filter(Boolean)
    });
    e.target.value = '';
  }
};
```

---

## Priority 2 — Missing Features (High Impact)

### TODO-1: Add `getStats()` and `fetchLightStats()`

**Status:** 🟡 Not started  
**Files:** `apiClient.js`, `useAppStore.js`, `page.js`, `explore/page.js`  
**Impact:** Tracker and Explore pages currently call `fetchStats()` which hits `GET /analytics` — the heavy full-analytics endpoint. They should call the lightweight `GET /stats` instead.

**Step 1 — Add to `apiClient.js`:**
```js
async getStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`, { headers: await this.getHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('[API] getStats:', error.message);
    throw error;
  }
}

async bulkUpdateProgress(updates) {
  try {
    const res = await fetch(`${API_BASE}/progress/bulk`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ updates })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('[API] bulkUpdateProgress:', error.message);
    toast.error(`Bulk update failed: ${error.message}`);
    throw error;
  }
}
```

**Step 2 — Add to `useAppStore.js`:**
```js
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
        activityTimeline: data.activityTimeline || null,
      }
    });
  } catch (error) {
    console.error('[Store] fetchLightStats failed:', error);
  }
},
```

**Step 3 — Update `page.js` and `explore/page.js`:**
```js
// In page.js useEffect:
fetchLightStats();  // was: fetchStats()
```

---

### TODO-2: FlashcardMode Bulk Update

**Status:** 🟡 Not started  
**File:** `frontend/src/app/components/FlashcardMode.js`  
**Impact:** Currently makes one `PATCH /progress/:id` per flashcard. With 50 cards, that's 50 sequential network requests.

**Current behavior:**
```js
// In page.js:
onSetConfidence={(id, lvl) => {
  updateProgress(id, { confidenceLevel: lvl });
  setTimeout(fetchStats, 300);
}}
```

**Desired behavior:** Accumulate all confidence updates, send as one bulk request when modal closes.

**Fix in `FlashcardMode.js`:**
```js
const [pendingUpdates, setPendingUpdates] = useState([]);

const handleScore = (level) => {
  setPendingUpdates(prev => [...prev, { id: currentQ.id, confidenceLevel: level }]);
  // advance to next card...
};

const handleClose = async () => {
  if (pendingUpdates.length > 0) {
    await apiClient.bulkUpdateProgress(pendingUpdates);
    // notify parent to refresh stats
  }
  onClose();
};
```

---

## Priority 3 — Documentation Updates

### TODO-3: Update `/docs/implementation_plan.md`

**Status:** 🟡 Outdated  
**File:** `docs/implementation_plan.md`  
**Problem:** Contains the old v1 migration plan. Should be replaced with the current v2 architecture state + next steps.

---

### TODO-4: Update `/docs/frontend_architecture.md`

**Status:** 🟡 Outdated  
**File:** `docs/frontend_architecture.md`  
**Problem:** Describes the old localStorage-based mock client. Should describe the current Zustand + apiClient architecture.

---

## Priority 4 — Dashboard Improvements

### TODO-5: Verify Dashboard Charts with Real Data

**Status:** 🟡 Needs verification  
**File:** `frontend/src/app/dashboard/page.js`  
**Problem:** Dashboard fetches `GET /analytics` and renders `avgTimePerDiff` and `patternMasteryData`. These are now real computed values from the server. Needs verification that:
1. `avgTimePerDiff` renders correctly when all `avgMinutes` are 0 (no time tracked)
2. `patternMasteryData` renders correctly with 0 items (empty state message shown)
3. `revisionList` shows `nextRevisionDate` properly

---

### TODO-6: Add Streak Cards to Dashboard

**Status:** 🟡 Not started  
Currently the Dashboard doesn't show the streak/heatmap that the Tracker has. Add:
```jsx
<div className={styles.streakPanel}>
  <div>Current Streak: {analytics.currentStreak} 🔥</div>
  <div>Max Streak: {analytics.maxStreak} ⚡</div>
  <div>This Week: {analytics.weeklyCount}/10 🎯</div>
</div>
<Heatmap data={analytics.activityTimeline} />
```

---

## Priority 5 — Performance / Polish

### TODO-7: Virtual Scrolling for Table

**Status:** 🔵 Future  
**File:** `frontend/src/app/components/Table.js`  
When Explore shows all 3,358 questions, the table renders 3,358 DOM rows. This is slow on initial render. Consider `react-window` or `react-virtual` for virtualization.

---

### TODO-8: Debounce at Store Level

**Status:** 🔵 Future  
Currently `setFilter()` calls `fetchQuestions()` immediately. Quick successive filter changes (typing in search) can fire multiple requests. Better: debounce `fetchQuestions()` at the store level.

---

## Resolved Bugs (Fixed, for Reference)

### FIXED: `dateSolved` Never Showing
**Root cause:** `updateProgress()` was using the request payload for local state, never the server response.  
**Fix:** After PATCH, replace local progress with server response (`serverProgress`).

### FIXED: Streak/Heatmap Hidden
**Root cause:** Heatmap expected array `[{date,count}]`, server returned object `{"date":count}`. Also condition checked wrong field.  
**Fix:** Heatmap accepts both formats. Condition: `stats.solved > 0 || Object.keys(activityTimeline).length > 0`.

### FIXED: Tracker/Explore State Bleed
**Root cause:** Both pages shared Zustand filters; navigating from Explore (no trackerMode) to Tracker showed all questions.  
**Fix:** `resetToTrackerMode()` / `resetToExploreMode()` actions + `useRef` guard.

### FIXED: Boolean Filter Params Causing 400 Errors
**Root cause:** OpenAPI validator expected string `'true'`/`'false'`, old code sent actual booleans.  
**Fix:** `buildQueryString()` converts `true → 'true'`, omits `false`.

### FIXED: `useEffect` Infinite Re-fetch
**Root cause:** Function references in `useEffect` deps array created fresh on every render.  
**Fix:** `useRef` guard, empty deps array with eslint-disable comment.

---

## Build Verification

Before deploying or considering a task done, verify:

```bash
# Mock server syntax check
cd mock-server && node --check server.js

# Frontend build (must be clean — zero errors)
cd frontend && npm run build

# Type check (if TypeScript is added later)
# cd frontend && npm run type-check
```

---

## Architecture Invariants (Never Break These)

1. **No business logic in frontend** — all dates, SRS math, and data transformations belong in the server
2. **Tags are arrays** — never strings. The server migrates legacy data but new code must always use arrays
3. **Companies are `{name, slug, count}` objects** — never plain strings
4. **`updateProgress()` must apply server response** — not request payload
5. **OpenAPI contract is the source of truth** — if you add an endpoint, update `openapi.yaml` first
6. **Mock server enforces the contract** — do not set `validateRequests: false` in OpenApiValidator
