# 05 — Frontend Guide

## Tech Stack
- **Next.js 16** (App Router, `'use client'` components)
- **React 18** (Strict Mode — causes double-mount in dev; guarded by `useRef`)
- **Zustand** — global state management
- **Vanilla CSS Modules** — no TailwindCSS
- **react-hot-toast** — error/success notifications
- **react-markdown + remark-gfm** — notes markdown rendering
- **Recharts** — Dashboard charts
- **dayjs** — date manipulation in Heatmap
- **next-auth** — Google OAuth

---

## Directory Structure

```
frontend/src/
├── app/
│   ├── page.js                   ← Tracker (home page)
│   ├── page.module.css
│   ├── globals.css               ← CSS variables, reset, global styles
│   ├── layout.js                 ← Root layout (AuthProvider, Toaster)
│   ├── explore/
│   │   └── page.js               ← Explore all global questions
│   ├── dashboard/
│   │   ├── page.js               ← Analytics dashboard
│   │   └── page.module.css
│   ├── add/
│   │   └── page.js               ← Add custom question
│   └── components/
│       ├── Table.js              ← Main questions table (dumb, reads store)
│       ├── Table.module.css
│       ├── StatsBar.js           ← Solved/Attempted/Difficulty stats strip
│       ├── Heatmap.js            ← Activity heatmap (GitHub-style)
│       ├── Header.js             ← Nav header with auth
│       ├── FlashcardMode.js      ← Quick recall modal
│       ├── InitialSolveModal.js  ← "Mark as solved" form
│       ├── ReflectionModal.js    ← "Revise this" form
│       ├── Filters.js            ← (exists but not used — filters inline in pages)
│       ├── FocusMode.js          ← Focus timer component
│       ├── ListManager.js        ← Pattern/Tag/Platform list manager
│       ├── ThemeToggle.js        ← Dark/light toggle
│       └── AuthProvider.js       ← Wraps SessionProvider
├── store/
│   └── useAppStore.js            ← Zustand store (ALL global state)
├── lib/api/
│   └── apiClient.js              ← All HTTP calls to mock server
└── config.json                   ← authEnabled, API URL, app name
```

---

## Pages

### `/` — Tracker (`app/page.js`)
**Purpose:** Shows the user's personal tracker — only questions they've interacted with.

**On mount:**
```js
resetToTrackerMode()  // sets trackerMode=true + resets all filters + fetchQuestions()
fetchUtilities()       // loads companies + patterns (once)
fetchStats()           // loads stats for StatsBar + streak + heatmap
```

**Key features:**
- Streak panel + Heatmap visible when `stats.solved > 0 || Object.keys(activityTimeline).length > 0`
- StatsBar with: SOLVED / ATTEMPTED / DUE REVISION / EASY / MEDIUM / HARD
- Collapsible filter drawer (toggled by "Show Filters" button)
- Debounced search (300ms delay)
- Compact / Detailed view toggle
- FlashcardMode (Quick Recall) button — queries `reviseFilter=true&trackerMode=true`
- Notes modal with Markdown preview/edit tabs
- Keyboard shortcuts: `Cmd+F` → focus search, `Escape` → close modals

**State from store used:** `questions`, `isLoading`, `filters`, `stats`, `companies`, `patterns`

---

### `/explore` — Explore (`app/explore/page.js`)
**Purpose:** Browse all 3,358 global questions with always-visible filters.

**On mount:**
```js
resetToExploreMode()  // sets trackerMode=false + resets filters + fetchQuestions()
fetchUtilities()
// Note: does NOT call fetchStats — no streak/heatmap on Explore
```

**Key differences from Tracker:**
- Filters always visible (no "Show Filters" toggle)
- No streak/heatmap panel
- No FlashcardMode button
- "← Back to Tracker" link instead of "Explore Global Questions"
- No Status filter (Tracker has it; Explore shows all statuses)

---

### `/dashboard` — Dashboard (`app/dashboard/page.js`)
**Purpose:** Full analytics view with charts.

**On mount:**
```js
// Does NOT use store — fetches directly via apiClient
apiClient.getAnalytics()  // GET /analytics
```

**Charts rendered:**
- Difficulty Breakdown (Pie chart) — Easy/Medium/Hard counts
- Top Companies Solved (Horizontal Bar chart)
- Platforms Breakdown (Pie chart)
- Average Time per Difficulty (Bar chart) — computed from `timeSpent` data
- Pattern Mastery (Horizontal Bar chart) — mastery score 0–100
- Due Revisions list

**AI Coach section:** Motivational text based on `totalRevise` and `patternMasteryData[0]`.

**Auth required:** Redirects to `/` if `status === 'unauthenticated'`.

---

## Zustand Store (`useAppStore.js`)

### State Shape
```js
{
  questions: [],          // QuestionWithProgress[] — from GET /questions
  totalCount: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  companies: [],          // CompanyItem[] — {name, slug, count}[]
  patterns: [],           // UtilityItem[]
  stats: {
    solved: 0, attempted: 0, dueRevision: 0,
    easy: 0, medium: 0, hard: 0,
    currentStreak: 0, maxStreak: 0, weeklyCount: 0,
    activityTimeline: null
  },
  filters: {
    search: '', difficulty: 'all', company: 'all',
    status: 'all', tag: '', pattern: 'all',
    hideSolved: false, starredOnly: false, reviseFilter: false,
    trackerMode: false, sortBy: '', sortDirection: 'asc',
    page: 1, limit: 1000
  }
}
```

### Actions

| Action | Description |
|--------|-------------|
| `setFilter(key, val)` | Updates one filter key → triggers `fetchQuestions()` |
| `setFilters(obj)` | Batch update multiple filters → triggers `fetchQuestions()` |
| `resetToTrackerMode()` | Sets `trackerMode=true`, resets all filters, fetches |
| `resetToExploreMode()` | Sets `trackerMode=false`, resets all filters, fetches |
| `fetchQuestions()` | `GET /questions` with current filters → updates `questions[]` |
| `fetchUtilities()` | `GET /utilities` + `GET /companies` → updates `patterns` + `companies` |
| `fetchStats()` | `GET /analytics` → updates `stats` (Tracker uses this; TODO: use `/stats` instead) |
| `updateProgress(id, updates)` | Optimistic update → PATCH → apply server response |

### `updateProgress()` — Critical Implementation

```js
updateProgress: async (questionId, updates) => {
  // 1. Save current state for rollback
  const previousQuestions = get().questions;

  // 2. Optimistic update: show the change immediately
  set(state => ({
    questions: state.questions.map(q =>
      q.id === questionId ? { ...q, progress: { ...q.progress, ...updates } } : q
    )
  }));

  try {
    // 3. Send to server (server computes dateSolved, nextRevisionDate, etc.)
    const serverProgress = await apiClient.updateProgress(questionId, updates);

    // 4. CRITICAL: Replace with server response (not request payload!)
    //    This is how dateSolved and nextRevisionDate appear in the UI.
    set(state => ({
      questions: state.questions.map(q =>
        q.id === questionId ? { ...q, progress: serverProgress } : q
      )
    }));

    // 5. If unsolved, re-fetch so question disappears from Tracker view
    if (updates.status === 'Unsolved') {
      await get().fetchQuestions();
    }
  } catch (error) {
    set({ questions: previousQuestions }); // rollback on error
  }
}
```

---

## API Client (`apiClient.js`)

### `buildQueryString(params)` — Boolean/Filter Serialization

| Param value | Serialized |
|-------------|-----------|
| `false` | **Omitted** (server treats missing = off) |
| `true` | `'true'` (string) |
| `'all'` | **Omitted** (server treats missing = all) |
| `''`, `null`, `undefined` | **Omitted** |
| anything else | `String(value)` |

### Methods

```js
apiClient.getQuestions(filters)              // GET /questions?...
apiClient.updateProgress(id, updates)        // PATCH /progress/{id} → returns server ProgressData
apiClient.getUtilities()                     // GET /utilities
apiClient.getCompanies()                     // GET /companies → CompanyItem[]
apiClient.getAnalytics()                     // GET /analytics (Dashboard)
apiClient.createCustomQuestion(data)         // POST /custom-questions
apiClient.getMetadata(type)                  // GET /{type} (patterns/platforms/tags)
apiClient.createMetadata(type, data)         // POST /{type}
```

**Missing methods (TODO):**
```js
apiClient.getStats()                         // GET /stats (lightweight — for Tracker/Explore)
apiClient.bulkUpdateProgress(updates)        // POST /progress/bulk (FlashcardMode)
```

---

## Components

### `Table.js`
The main table component. **Pure rendering — no filtering, no sorting logic.**

Props:
```js
{
  onOpenReflection: fn,      // opens ReflectionModal for revise flow
  onOpenInitialSolve: fn,    // opens InitialSolveModal for solve flow
  onOpenNotes: fn,           // opens notes modal
  authEnabled: boolean,      // shows/hides STATUS + REVISE columns + write actions
  patterns: UtilityItem[],   // for pattern select in table row
  isCompactMode: boolean,    // hides Attempts/Time/Acceptance/Frequency/DateSolved columns
  visibleColumns: string[]   // which columns to show
}
```

Reads from store: `questions`, `filters`, `setFilter`, `updateProgress`

**⚠️ Known bug:** `handleTagInput` (line 48) sends tags as a raw string — should send as array:
```js
// Current (wrong):
updateProgress(id, { tags: tagsString });

// Correct:
updateProgress(id, { tags: tagsString.split(',').map(t => t.trim()).filter(Boolean) });
```

### `StatsBar.js`
Props: `{ stats, total, title, secondLabel, secondValue }`

Renders: SOLVED | ATTEMPTED | {secondLabel} | EASY | MEDIUM | HARD

### `Heatmap.js`
Props: `{ data }` — accepts BOTH formats:
- Object: `{ "2026-06-10": 3, "2026-06-09": 1 }` ← API format
- Array: `[{ date: "2026-06-10", count: 3 }]` ← legacy format

Renders a GitHub-style 52-week activity grid using dayjs.

### `FlashcardMode.js`
Props: `{ questions, onClose, onSetConfidence }`

Shows a flashcard for each due-revision question. User flips to see notes, then rates recall (1–4). Currently calls `onSetConfidence(id, level)` per card which makes individual PATCHes.

**TODO:** Accumulate updates and call `bulkUpdateProgress` on close.

### `InitialSolveModal.js`
Shown when user marks a question solved for the first time.
Collects: solutionLink, notes, pattern, memoryStrength (confidence 1–4)
Calls `onSave(id, { solutionLink, notes, pattern, memoryStrength })`

### `ReflectionModal.js`
Shown when user marks a question for revision.
Collects: insight (added to notes), pattern, memoryStrength
Calls `onSave(id, { insight, pattern, memoryStrength })`

---

## Configuration (`config.json`)

```json
{
  "app": { "name": "Tacker", "defaultTheme": "dark" },
  "api": { "endpoint": "http://localhost:4000/api/v1", "timeoutMs": 10000 },
  "features": {
    "authEnabled": true,
    "hideExploreTab": false
  }
}
```

To disable auth (development without Google OAuth):
```json
"authEnabled": false
```

To point at production API:
```bash
NEXT_PUBLIC_API_URL=https://api.tacker.dev/api/v1 npm run dev
```

---

## CSS Variables (Theming)

Defined in `globals.css` as CSS custom properties. Key variables:
```css
--bg-main           /* page background */
--bg-card           /* card/table background */
--text-main         /* primary text */
--text-muted        /* secondary text */
--border-color      /* borders */
--primary           /* green accent (solved) */
--accent            /* blue accent */
--warning           /* yellow/amber (revision due) */
--success           /* green */
--diff-easy         /* Easy badge background */
--diff-med          /* Medium badge */
--diff-hard         /* Hard badge */
```

---

## Common Patterns & Pitfalls

### ✅ Correct: Applying server response after PATCH
```js
const serverProgress = await apiClient.updateProgress(id, payload);
set(state => ({ questions: state.questions.map(q => q.id === id ? { ...q, progress: serverProgress } : q) }));
```

### ❌ Wrong: Using request payload as the update
```js
set(state => ({ questions: state.questions.map(q => q.id === id ? { ...q, progress: payload } : q) }));
// dateSolved and nextRevisionDate will NEVER appear this way
```

### ✅ Correct: useRef guard for page initialization
```js
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;
  resetToTrackerMode();
}, []);
```

### ❌ Wrong: Functions in useEffect deps array
```js
useEffect(() => {
  fetchStats(); // fetchStats is created fresh each render
}, [fetchStats]); // → infinite loop
```

### ✅ Correct: Rendering company dropdown
```jsx
{companies.map(c => (
  <option key={c.slug || c} value={c.slug || c}>{c.name || c}</option>
))}
```

### ❌ Current bug in page.js and explore/page.js
```jsx
{companies.map(c => <option key={c} value={c}>{c}</option>)}
// companies[i] is now {name, slug, count} — this renders "[object Object]"
```
