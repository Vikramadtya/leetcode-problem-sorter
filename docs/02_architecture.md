# 02 — System Architecture

## Core Principle

**"Dumb UI, Smart API"** — The frontend is a pure rendering layer. All business logic, filtering, sorting, SRS calculations, and analytics live in the backend/mock-server.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (Vite + React 19)                   │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Tracker   │  │   Explore    │  │   Dashboard    │  │
│  │  page.js   │  │  page.js     │  │   page.js      │  │
│  └─────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│        │                │                   │           │
│  ┌─────▼────────────────▼───────────────────▼────────┐  │
│  │              useAppStore (Zustand)                 │  │
│  │  questions[], filters{}, stats{}, companies[]      │  │
│  │  fetchQuestions() fetchStats() updateProgress()    │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                           │
│  ┌────────────────────────▼───────────────────────────┐  │
│  │               apiClient.js                        │  │
│  │  buildQueryString() → fetch() → return JSON       │  │
│  └────────────────────────┬───────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP/JSON over localhost:4000
              ┌─────────────▼──────────────────┐
              │    Mock Server (Express 5)      │  ← DEVELOPMENT
              │    mock-server/server.js        │
              │                                │
              │  In-memory data structures:    │
              │  • questionMap (Map<id,Q>)      │
              │  • companyIndex (Map<co,Set>)   │
              │  • difficultyIndex (Map<d,Set>) │
              │  • progressMap (Map<id,Prog>)   │
              │  • analyticsCache (Object|null) │
              │                                │
              │  Enforces openapi.yaml strictly │
              └──────────────┬─────────────────┘
                             │
              ┌──────────────▼─────────────────┐
              │  SQLite tacker.db (5 MB)   │
              │  SQLite tacker.db (progress table)             │
              └─────────────────────────────────┘

              ┌─────────────────────────────────┐
              │  Java Micronaut (FUTURE / prod)  │  ← PRODUCTION
              │  Controllers → Services → JOOQ  │
              │  → PostgreSQL                   │
              └─────────────────────────────────┘
```

---

## Layer Responsibilities

### Frontend (Vite)
| Responsibility | Details |
|---------------|---------|
| Render data | Maps `store.questions[]` → table rows. Zero filtering. |
| Send user intent | Sends partial PATCH payloads (`{ status: 'Solved', confidenceLevel: 3 }`). Never computes dates. |
| Manage filters | Zustand store holds filter state. `setFilter()` → `fetchQuestions()` immediately. |
| Optimistic updates | Updates local state before server confirms, then replaces with server response. |
| Auth | NextAuth.js handles Google OAuth. Mock server accepts any token. |

### Mock Server
| Responsibility | Details |
|---------------|---------|
| Filtering | Uses in-memory indexes for O(1) company + difficulty lookup |
| Business rules | SRS calculation, date stamping, status resets |
| Analytics | Streak, heatmap, pattern mastery — cached and lazily recomputed |
| Contract enforcement | `express-openapi-validator` rejects any request/response deviating from `openapi.yaml` |
| Persistence | Writes `SQLite tacker.db (progress table)` on every PATCH |

### OpenAPI Contract (`/api-contract/openapi.yaml`)
- **Version 2.0.0**
- The single source of truth for ALL data shapes
- Both the mock server AND the future Java backend must implement it exactly
- The frontend `apiClient.js` is built to consume exactly this contract

---

## Data Flow: Filter Change

```
1. User changes difficulty dropdown → "Easy"
2. setFilter('difficulty', 'Easy') in Zustand
3. store.fetchQuestions() called immediately
4. apiClient.buildQueryString({ difficulty: 'Easy', trackerMode: true, ... })
   → "difficulty=Easy&trackerMode=true&limit=1000"
5. fetch("http://localhost:4000/api/v1/questions?difficulty=Easy&trackerMode=true")
6. Mock server:
   a. difficultyIndex.get('easy') → Set of 811 question IDs  [O(1)]
   b. candidateIds = Set(811 IDs)
   c. For each ID: check trackerMode, search, status, tag, pattern filters
   d. Sort by sortBy/sortDirection
   e. Paginate (page * limit)
   f. Return { data: [...], totalCount, page, totalPages }
7. store.questions = response.data
8. Table component re-renders (pure map over store.questions)
```

---

## Data Flow: Mark Question Solved

```
1. User clicks ✓ on a question row
2. Table → onOpenInitialSolve(question) [if not solved]
3. User fills InitialSolveModal (notes, pattern, confidenceLevel=3)
4. handleSaveInitialSolve() called
5. store.updateProgress(id, {
     status: 'Solved',
     confidenceLevel: 3,
     notes: '...',
     pattern: 'Dynamic Programming'
   })
6. Optimistic update: merge payload into local question.progress
7. apiClient.updateProgress(id, payload)
   → PATCH /api/v1/progress/{id}
8. Mock server PATCH handler:
   a. Detects status='Solved'
   b. stamps dateSolved = new Date().toISOString()
   c. calcNextRevisionDate(3) → today + 7 days
   d. Merges, saves to progressMap + SQLite tacker.db (progress table)
   e. Invalidates analyticsCache
   f. Returns full ProgressData object
9. store: replaces local progress with server response
   → dateSolved, nextRevisionDate now visible in UI
10. setTimeout(fetchStats, 300) → GET /api/v1/stats
    → updates streak, heatmap, StatsBar
```

---

## Page Initialization Pattern

All pages use a `useRef` guard to prevent double-mount in React 18 Strict Mode:

```js
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  // Tracker page:
  resetToTrackerMode();   // trackerMode=true, reset filters, fetchQuestions
  fetchUtilities();       // GET /utilities + GET /companies (once)
  fetchStats();           // GET /analytics (Tracker calls fetchStats currently)
                          // TODO: should call fetchLightStats → GET /stats

  // Explore page:
  resetToExploreMode();   // trackerMode=false, reset filters, fetchQuestions
  fetchUtilities();
  // (no stats fetch on Explore currently)
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## Environments

| Environment | Frontend | API |
|------------|---------|-----|
| Development | `http://localhost:3000` | `http://localhost:4000/api/v1` |
| Production (planned) | Vercel deployment | `https://api.tacker.dev/api/v1` |

### Configuration
`frontend/src/config.json`:
```json
{
  "app": { "name": "Tacker", "defaultTheme": "dark" },
  "api": { "endpoint": "http://localhost:4000/api/v1", "timeoutMs": 10000 },
  "features": { "authEnabled": true, "hideExploreTab": false }
}
```

Override API URL with environment variable:
```bash
NEXT_PUBLIC_API_URL=https://api.tacker.dev/api/v1 npm run dev
```

---

## Running Locally

```bash
# Option A: Single command (recommended)
make dev

# Option B: Two terminals
# Terminal 1:
cd mock-server && node server.js    # → http://localhost:4000

# Terminal 2:
cd frontend && npm run dev           # → http://localhost:3000
```

Available `make` targets:
- `make dev` — starts both servers
- `make mock` — mock server only
- `make frontend` — frontend only
