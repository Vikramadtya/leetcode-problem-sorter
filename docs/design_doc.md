# Tacker — System Design & Architecture (v2)

> Updated: 2026-06-10 | API version: 2.0.0

---

## 1. Core Principle: "Dumb UI, Smart API"

| Layer | Responsibility |
|-------|---------------|
| **Mock Server** (dev) / **Java Backend** (prod) | All filtering, sorting, SRS calculations, date stamping, analytics. Returns UI-ready JSON. |
| **Frontend (Next.js)** | Pure presentation. Renders what the API returns. Sends user intent as simple PATCH payloads. |

The frontend NEVER computes:
- `dateSolved` (server stamps on `status=Solved`)
- `nextRevisionDate` (server computes via SRS from `confidenceLevel`)
- Streak, heatmap, analytics
- Filter/sort results

---

## 2. Architecture

```
┌──────────────────────────────────────────┐
│           Next.js Frontend               │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ page.js  │  │explore/  │  │dash/   │ │
│  │ Tracker  │  │page.js   │  │page.js │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │             │      │
│  ┌────▼──────────────▼─────────────▼──┐  │
│  │         useAppStore (Zustand)       │  │
│  │  questions, stats, filters, actions │  │
│  └──────────────────┬─────────────────┘  │
│                     │                    │
│  ┌──────────────────▼─────────────────┐  │
│  │          apiClient.js              │  │
│  │  buildQueryString, fetch wrappers  │  │
│  └──────────────────┬─────────────────┘  │
└─────────────────────┼────────────────────┘
                       │ HTTP / JSON
         ┌─────────────▼────────────┐
         │   Mock Server (Express)  │  ← dev
         │   Java Micronaut         │  ← prod
         │                          │
         │  In-memory indexes:      │
         │   questionMap            │
         │   companyIndex           │
         │   difficultyIndex        │
         │   progressMap            │
         │   analyticsCache         │
         └─────────────┬────────────┘
                       │
         ┌─────────────▼────────────┐
         │  global_questions.json   │  ← dev
         │  user_progress.json      │  ← dev
         │  PostgreSQL (JOOQ)       │  ← prod
         └──────────────────────────┘
```

---

## 3. Frontend Architecture

### State Management (Zustand)
```
useAppStore {
  // Data
  questions: QuestionWithProgress[]    ← from GET /questions
  totalCount, page, totalPages         ← pagination
  companies: CompanyItem[]             ← {name, slug, count}[]
  patterns: UtilityItem[]
  stats: {
    solved, attempted, dueRevision,
    easy, medium, hard,
    currentStreak, maxStreak, weeklyCount,
    activityTimeline: {date: count}
  }

  // Filters
  filters: {
    search, difficulty, company, status,
    tag, pattern, hideSolved, starredOnly,
    reviseFilter, trackerMode,
    sortBy, sortDirection, page, limit
  }

  // Actions
  setFilter(key, value)        → updates filter + fetchQuestions()
  setFilters(obj)              → batch filter update + fetchQuestions()
  resetToTrackerMode()         → trackerMode=true, reset filters, fetch
  resetToExploreMode()         → trackerMode=false, reset filters, fetch
  fetchQuestions()             → GET /questions with current filters
  fetchUtilities()             → GET /utilities + GET /companies
  fetchStats()                 → GET /analytics (Dashboard only)
  fetchLightStats()            → GET /stats (Tracker + Explore pages)  [TODO]
  updateProgress(id, updates)  → optimistic + PATCH + apply server response
}
```

### API Client (`apiClient.js`)
- `buildQueryString(params)`: booleans → `'true'`/omit, skip `'all'`, skip null/empty
- `getQuestions(params)` → `GET /questions?...`
- `updateProgress(id, updates)` → `PATCH /progress/{id}` — **returns server response**
- `getUtilities()` → `GET /utilities`
- `getCompanies()` → `GET /companies`
- `getAnalytics()` → `GET /analytics`
- `getStats()` → `GET /stats` [TODO: add method]
- `bulkUpdateProgress(updates)` → `POST /progress/bulk` [TODO: add method]
- `createCustomQuestion(data)` → `POST /custom-questions`

### Page Initialization Pattern
All pages use a `useRef` guard to prevent double-initialization in React 18 Strict Mode:
```js
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;
  resetToTrackerMode(); // or resetToExploreMode()
  fetchUtilities();
  fetchLightStats(); // or fetchStats() for Dashboard
}, []);
```

---

## 4. Mock Server Architecture

### In-Memory Indexes (built at startup)
```js
questionMap     Map<id, Question>         // O(1) lookup by ID
companyIndex    Map<slug, Set<id>>        // O(1) company filter
difficultyIndex Map<level, Set<id>>       // O(1) difficulty filter
progressMap     Map<id, ProgressRecord>   // O(1) progress lookup
analyticsCache  Object | null             // null = dirty, recompute on next GET
```

### Business Logic Rules
| Trigger | Server Action |
|---------|--------------|
| `PATCH status=Unsolved` | Full reset: clear dateSolved, confidenceLevel, nextRevisionDate, attempts, notes, pattern, solutionLink. Preserve tags + important. |
| `PATCH status=Solved` | Stamp `dateSolved=now()`, compute `nextRevisionDate` from SRS |
| `PATCH revise=true` | Compute `nextRevisionDate` from `confidenceLevel` via SRS |
| `PATCH revise=false` | Clear `nextRevisionDate` |
| `PATCH confidenceLevel` (during active revise) | Re-compute `nextRevisionDate` |

### SRS Intervals
```
confidenceLevel 1 (Forgot) → nextRevisionDate = today + 1 day
confidenceLevel 2 (Hard)   → nextRevisionDate = today + 3 days
confidenceLevel 3 (Good)   → nextRevisionDate = today + 7 days
confidenceLevel 4 (Easy)   → nextRevisionDate = today + 14 days
```

---

## 5. API Contract Summary

Base URL (dev): `http://localhost:4000/api/v1`  
Full spec: [`/api-contract/openapi.yaml`](../api-contract/openapi.yaml)

| Method | Path | Purpose | Used By |
|--------|------|---------|---------|
| GET | `/questions` | Paginated + filtered questions | All pages |
| GET | `/progress/{id}` | Single question progress | (Available, not yet used by FE) |
| PATCH | `/progress/{id}` | Update progress (upsert) | All pages |
| POST | `/progress/bulk` | Batch update | FlashcardMode |
| GET | `/stats` | Lightweight stats | Tracker, Explore |
| GET | `/analytics` | Full analytics + charts | Dashboard |
| GET | `/utilities` | difficulties, patterns, platforms, tags | All pages |
| GET | `/companies` | `{name,slug,count}[]` sorted | All pages |
| POST | `/custom-questions` | Create custom question | Add page |
| GET/POST | `/patterns` | Pattern CRUD | Settings |
| GET/POST | `/platforms` | Platform CRUD | Settings |
| GET/POST | `/tags` | Tag CRUD | Settings |

---

## 6. PostgreSQL Data Model (Future Backend)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255)
);

CREATE TABLE global_questions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy','Medium','Hard')),
    acceptance_rate VARCHAR(10),
    frequency DECIMAL(5,2),
    url TEXT
);
CREATE INDEX idx_global_difficulty ON global_questions(difficulty);

CREATE TABLE custom_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy','Medium','Hard')),
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE question_companies (
    question_id VARCHAR(50) REFERENCES global_questions(id) ON DELETE CASCADE,
    company_slug VARCHAR(100) NOT NULL,
    PRIMARY KEY (question_id, company_slug)
);
CREATE INDEX idx_qc_company ON question_companies(company_slug);

CREATE TABLE user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL,  -- global or custom
    is_custom BOOLEAN DEFAULT false,

    status VARCHAR(20) DEFAULT 'Unsolved' CHECK (status IN ('Unsolved','Attempted','Solved')),
    date_solved TIMESTAMPTZ,
    confidence_level SMALLINT CHECK (confidence_level BETWEEN 1 AND 4),
    next_revision_date TIMESTAMPTZ,
    revise BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,  -- seconds

    notes TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',       -- array, not comma-string
    pattern VARCHAR(100) DEFAULT '',
    solution_link TEXT DEFAULT '',
    important BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, question_id)
);
CREATE INDEX idx_up_status ON user_progress(user_id, status);
CREATE INDEX idx_up_important ON user_progress(user_id, important);
CREATE INDEX idx_up_revise ON user_progress(user_id, revise);
CREATE INDEX idx_up_next_revision ON user_progress(user_id, next_revision_date);
CREATE INDEX idx_up_date_solved ON user_progress(user_id, date_solved);
```

---

## 7. Feature Matrix

| Feature | Frontend Responsibility | Backend Responsibility |
|---------|------------------------|------------------------|
| Authentication | Google OAuth via NextAuth, pass JWT | Validate JWT, manage users table |
| Question List | Render rows, no sorting/filtering | SQL joins, WHERE, ORDER BY, LIMIT |
| Progress Updates | Send simple patch payloads | Upsert, stamp dates, compute SRS |
| Tracker Filter | Pass filter params to API | Apply all filters server-side |
| Streak + Heatmap | Render from `activityTimeline` | Compute from `date_solved` field |
| Custom Questions | Form UI, submit to API | Store, link to user_id |
| FlashcardMode | Show cards, accumulate updates | Bulk PATCH endpoint |
| Dashboard | Render chart data | Compute analytics (aggregation) |
| Weekly Sync | None | `@Scheduled` Java task, GitHub fetch |

---

## 8. Environments

| Variable | Dev | Prod |
|----------|-----|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | `https://api.tacker.dev/api/v1` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://tacker.dev` |
| `authEnabled` (config.json) | `true` | `true` |

### Running Locally
```bash
# Terminal 1: Mock Server
cd mock-server && node server.js

# Terminal 2: Frontend
cd frontend && npm run dev
```

Or use the combined script:
```bash
npm run dev  # from root (uses Makefile / package.json scripts)
```
