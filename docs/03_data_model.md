# 03 — Data Model

This document describes every data structure in the system — the in-memory shapes, SQLite database, API response shapes, and the future PostgreSQL schema.

---

## 1. Global Question (in-memory, mock server)

Built from `SQLite tacker.db` at startup. **Never mutated after load.**

```typescript
interface Question {
  id: string;           // e.g. "1", "2358"
  title: string;        // e.g. "Two Sum"
  titleLower: string;   // pre-lowercased for O(1) case-insensitive search
  url: string;          // LeetCode URL
  difficulty: 'Easy' | 'Medium' | 'Hard';
  diffLower: 'easy' | 'medium' | 'hard';  // pre-lowercased for index key
  acceptanceRate: string;  // e.g. "57.5%"
  frequency: number;       // parsed float, e.g. 100.0
  companies: string[];     // lowercase slugs e.g. ["google", "amazon"]
  isCustom: boolean;       // true for user-created questions
}
```

**Source file format (`SQLite tacker.db`):**
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

**Stats:** 3,358 total questions | 811 Easy | 1,789 Medium | 758 Hard | 654 unique companies

---

## 2. Progress Record (in-memory + `SQLite tacker.db (progress table)`)

One record per question the user has interacted with.

```typescript
interface ProgressRecord {
  status: 'Unsolved' | 'Attempted' | 'Solved';
  dateSolved: string | null;       // ISO-8601, e.g. "2026-06-10T14:30:00.000Z"
  confidenceLevel: 1 | 2 | 3 | 4 | null;
  nextRevisionDate: string | null; // ISO-8601, computed by server via SRS
  revise: boolean;                 // user has flagged for active revision
  attempts: number;                // total attempt count
  timeSpent: number;               // total seconds spent (from timer)
  notes: string;                   // markdown notes
  tags: string[];                  // ARRAY not comma-string — e.g. ["Array", "Hash Map"]
  pattern: string;                 // algorithmic pattern e.g. "Two Pointers"
  solutionLink: string;            // link to user's solution
  important: boolean;              // starred / bookmarked
}
```

**Key rules (all enforced server-side):**
- `tags` is ALWAYS an array — the server migrates any legacy comma-strings on load
- `dateSolved` is ONLY set by the server when `status` transitions to `'Solved'`
- `nextRevisionDate` is ONLY set by the server via SRS calculation
- Setting `status='Unsolved'` resets ALL fields except `tags` and `important`

**SRS intervals:**
```
confidenceLevel 1 → +1 day
confidenceLevel 2 → +3 days
confidenceLevel 3 → +7 days
confidenceLevel 4 → +14 days
```

---

## 3. API Response Shapes

### `QuestionWithProgress` (from `GET /questions`)
```typescript
interface QuestionWithProgress {
  id: string;
  title: string;
  url: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptanceRate: string;
  frequency: number;
  companies: string[];     // lowercase slugs
  isCustom: boolean;
  progress: ProgressData;  // always present, defaults to Unsolved
}
```

### `ProgressData` (from `PATCH /progress/:id` response and embedded in questions)
```typescript
interface ProgressData {
  status: 'Unsolved' | 'Attempted' | 'Solved';
  dateSolved: string | null;
  confidenceLevel: number | null;  // 1-4
  nextRevisionDate: string | null;
  revise: boolean;
  attempts: number;
  timeSpent: number;  // seconds
  notes: string;
  tags: string[];     // array
  pattern: string;
  solutionLink: string;
  important: boolean;
}
```

### `PaginatedQuestionsResponse` (from `GET /questions`)
```typescript
interface PaginatedQuestionsResponse {
  data: QuestionWithProgress[];
  totalCount: number;
  page: number;
  totalPages: number;
}
```

### `CompanyItem` (from `GET /companies`)
```typescript
interface CompanyItem {
  name: string;   // lowercase slug, e.g. "google"
  slug: string;   // same as name for global questions
  count: number;  // number of questions tagged with this company
}
```

The first item is always `{ name: 'Custom Questions', slug: 'custom questions', count: N }`.

### `StatsResponse` (from `GET /stats`)
```typescript
interface StatsResponse {
  totalSolved: number;
  totalAttempted: number;
  totalQuestions: number;
  totalRevise: number;
  currentStreak: number;    // consecutive days with at least 1 solve
  maxStreak: number;        // longest ever streak
  weeklyCount: number;      // solves in the last 7 days
  activityTimeline: {       // object, not array: { "2026-06-10": 3, "2026-06-09": 1 }
    [date: string]: number;
  };
  difficultyBreakdown: { Easy: number; Medium: number; Hard: number };
}
```

### `AnalyticsResponse` (from `GET /analytics`) — extends StatsResponse
```typescript
interface AnalyticsResponse extends StatsResponse {
  topCompanies: Array<{ name: string; count: number }>;
  platformsBreakdown: Array<{ name: string; count: number }>;
  avgTimePerDiff: Array<{ name: 'Easy' | 'Medium' | 'Hard'; avgMinutes: number }>;
  patternMasteryData: Array<{ name: string; solved: number; score: number }>;
  revisionList: Array<{
    id: string;
    title: string;
    difficulty: string;
    nextRevisionDate: string | null;
  }>;
}
```

### `UtilitiesResponse` (from `GET /utilities`)
```typescript
interface UtilitiesResponse {
  difficulties: UtilityItem[];
  platforms: UtilityItem[];
  patterns: UtilityItem[];
  tags: UtilityItem[];
}

interface UtilityItem {
  id: string;
  name: string;
  description: string;
}
```

---

## 4. Zustand Store State Shape (`useAppStore`)

```typescript
interface AppStoreState {
  // Data
  questions: QuestionWithProgress[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  companies: CompanyItem[];   // {name, slug, count}[] — NOT plain strings
  patterns: UtilityItem[];
  stats: {
    solved: number;
    attempted: number;
    dueRevision: number;
    easy: number;
    medium: number;
    hard: number;
    currentStreak: number;
    maxStreak: number;
    weeklyCount: number;
    activityTimeline: { [date: string]: number } | null;
  };

  // Filters
  filters: {
    search: string;
    difficulty: 'all' | 'Easy' | 'Medium' | 'Hard';
    company: string;      // 'all' or company slug
    status: 'all' | 'Unsolved' | 'Attempted' | 'Solved';
    tag: string;          // substring match
    pattern: string;      // 'all' or exact pattern name
    hideSolved: boolean;
    starredOnly: boolean;
    reviseFilter: boolean;
    trackerMode: boolean; // true = Tracker page (only engaged questions)
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    page: number;
    limit: number;        // default 1000 (load all, no server-side pagination currently)
  };
}
```

---

## 5. PostgreSQL Schema (Future Production Backend)

```sql
-- Users (managed by NextAuth + Micronaut)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global LeetCode questions (synced weekly from GitHub)
CREATE TABLE global_questions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    acceptance_rate VARCHAR(10),
    frequency DECIMAL(5,2),
    url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gq_difficulty ON global_questions(difficulty);

-- Company ↔ Question mapping (many-to-many)
CREATE TABLE question_companies (
    question_id VARCHAR(50) REFERENCES global_questions(id) ON DELETE CASCADE,
    company_slug VARCHAR(100) NOT NULL,
    PRIMARY KEY (question_id, company_slug)
);
CREATE INDEX idx_qc_company ON question_companies(company_slug);

-- User-created custom questions
CREATE TABLE custom_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    url TEXT,
    platform VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- All user progress (global + custom questions in one table)
CREATE TABLE user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL,  -- global_questions.id or custom_questions.id
    is_custom BOOLEAN DEFAULT FALSE,

    status VARCHAR(20) DEFAULT 'Unsolved'
        CHECK (status IN ('Unsolved', 'Attempted', 'Solved')),
    date_solved TIMESTAMPTZ,
    confidence_level SMALLINT CHECK (confidence_level BETWEEN 1 AND 4),
    next_revision_date TIMESTAMPTZ,
    revise BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    time_spent INTEGER DEFAULT 0 CHECK (time_spent >= 0),  -- seconds

    notes TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',          -- PostgreSQL native array
    pattern VARCHAR(100) DEFAULT '',
    solution_link TEXT DEFAULT '',
    important BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, question_id)
);

-- Performance indexes for Tracker page queries
CREATE INDEX idx_up_status       ON user_progress(user_id, status);
CREATE INDEX idx_up_important    ON user_progress(user_id, important);
CREATE INDEX idx_up_revise       ON user_progress(user_id, revise);
CREATE INDEX idx_up_next_rev     ON user_progress(user_id, next_revision_date);
CREATE INDEX idx_up_date_solved  ON user_progress(user_id, date_solved);

-- Patterns / Tags / Platforms reference tables (user-editable)
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);
```

### Key Design Decisions
- `tags` stored as PostgreSQL native `TEXT[]` array — mirrors the mock server's `string[]`
- Single `user_progress` table for both global and custom questions (`is_custom` flag differentiates)
- No `date_solved` default — only set by server when `status` transitions to `'Solved'`
- `updated_at` managed via trigger or JOOQ update logic in Micronaut
