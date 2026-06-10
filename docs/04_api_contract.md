# 04 — API Contract

> **Base URL (dev):** `http://localhost:4000/api/v1`  
> **OpenAPI spec:** `/api-contract/openapi.yaml` (v2.0.0)  
> **Auth:** `Authorization: Bearer <token>` on all requests

The mock server enforces this contract via `express-openapi-validator`. Any request or response deviating from the spec is rejected with a 4xx error.

---

## Endpoints Overview

| Method | Path | Purpose | Called By |
|--------|------|---------|-----------|
| `GET` | `/questions` | Paginated, filtered, sorted questions | All pages |
| `GET` | `/progress/{id}` | Single question progress | (Available, not yet used by frontend) |
| `PATCH` | `/progress/{id}` | Update progress — all business logic here | All pages |
| `POST` | `/progress/bulk` | Batch update multiple questions | FlashcardMode (TODO) |
| `GET` | `/stats` | Lightweight stats (StatsBar, streak, heatmap) | Tracker, Explore |
| `GET` | `/analytics` | Full analytics with charts | Dashboard |
| `GET` | `/utilities` | difficulties, patterns, platforms, tags | All pages (once) |
| `GET` | `/companies` | Company list with question counts | All pages (once) |
| `POST` | `/custom-questions` | Create a custom question | Add page |
| `GET/POST` | `/patterns` | Pattern CRUD | Settings / Add page |
| `GET/POST` | `/platforms` | Platform CRUD | Settings |
| `GET/POST` | `/tags` | Tag CRUD | Settings |

---

## `GET /questions`

Returns paginated questions filtered and sorted by the server.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` (max `5000`) | Items per page |
| `search` | string | — | Substring match on title or ID |
| `difficulty` | `Easy\|Medium\|Hard\|all` | — | Filter by difficulty |
| `company` | string | — | Company slug (lowercase) or `"Custom Questions"` or omit for all |
| `tag` | string | — | Substring match against `progress.tags[]` |
| `pattern` | string | — | Exact match against `progress.pattern` |
| `status` | `Unsolved\|Attempted\|Solved\|all` | — | Filter by progress status |
| `starredOnly` | `'true'\|'false'` | — | Only starred (`important=true`) questions |
| `hideSolved` | `'true'\|'false'` | — | Exclude solved questions |
| `reviseFilter` | `'true'\|'false'` | — | Only questions due for revision |
| `trackerMode` | `'true'\|'false'` | — | Only engaged questions (solved/attempted/starred/revision) |
| `sortBy` | string | — | Field to sort by (see below) |
| `sortDirection` | `asc\|desc` | `asc` | Sort direction |

**Boolean params must be sent as the string `'true'`, never JavaScript `true`.**  
**Omitting a boolean param = `false`/off.**  
**Sending `'all'` or omitting for enum filters = no filter applied.**

**Valid `sortBy` values:**
- Question fields: `id`, `title`, `difficulty`, `acceptanceRate`, `frequency`
- Progress fields: `status`, `attempts`, `confidenceLevel`, `timeSpent`, `dateSolved`, `revise`, `important`, `nextRevisionDate`

### Response `200`
```json
{
  "data": [
    {
      "id": "1",
      "title": "Two Sum",
      "url": "https://leetcode.com/problems/two-sum/",
      "difficulty": "Easy",
      "acceptanceRate": "57.5%",
      "frequency": 100.0,
      "companies": ["google", "amazon", "meta"],
      "isCustom": false,
      "progress": {
        "status": "Solved",
        "dateSolved": "2026-06-10T14:30:00.000Z",
        "confidenceLevel": 3,
        "nextRevisionDate": "2026-06-17T14:30:00.000Z",
        "revise": false,
        "attempts": 2,
        "timeSpent": 1800,
        "notes": "Used HashMap for O(n) solution",
        "tags": ["Array", "Hash Map"],
        "pattern": "Two Pointers",
        "solutionLink": "https://github.com/...",
        "important": true
      }
    }
  ],
  "totalCount": 1,
  "page": 1,
  "totalPages": 1
}
```

---

## `GET /progress/{questionId}`

Returns the progress record for a single question.

### Response `200` → `ProgressData` object (same shape as `progress` field above)

---

## `PATCH /progress/{questionId}`

Updates progress for a question. **The server applies all business rules.**

### Request Body (partial — send only what changes)
```json
{
  "status": "Solved",
  "confidenceLevel": 3,
  "notes": "Used HashMap",
  "pattern": "Two Pointers",
  "solutionLink": "https://...",
  "tags": ["Array", "Hash Map"],
  "important": false,
  "attempts": 2,
  "timeSpent": 1800,
  "revise": false
}
```

### Server-side Business Rules

| Condition | Server Action |
|-----------|--------------|
| `status = 'Unsolved'` | **Full reset**: clear `dateSolved`, `confidenceLevel`, `nextRevisionDate`, `attempts=0`, `notes=''`, `pattern=''`, `solutionLink=''`, `revise=false`. Preserve `tags` + `important`. |
| `status = 'Solved'` | Stamp `dateSolved = now()`. Compute `nextRevisionDate` from `confidenceLevel` via SRS. Set `attempts = max(existing, 1)`. |
| `revise = true` | Compute `nextRevisionDate` from `confidenceLevel` via SRS. |
| `revise = false` | Clear `nextRevisionDate = null`. |
| `confidenceLevel` changed while `revise=true` | Re-compute `nextRevisionDate`. |
| Any other update | Merge payload into existing record. |

### Response `200` → Full `ProgressData` object (server-authoritative)

> **CRITICAL for frontend developers:** Always update local state from the **server response**, not from the request payload. The server stamps `dateSolved` and `nextRevisionDate` which are never in the request.

---

## `POST /progress/bulk`

Batch update for FlashcardMode. Sends multiple confidence-level updates in one request.

### Request Body
```json
{
  "updates": [
    { "id": "1", "confidenceLevel": 3, "revise": true },
    { "id": "42", "confidenceLevel": 1 },
    { "id": "99", "confidenceLevel": 4, "notes": "Nailed it" }
  ]
}
```

### Response `200`
```json
{
  "updated": 3,
  "results": [
    { "id": "1", "progress": { "status": "Solved", "confidenceLevel": 3, ... } },
    { "id": "42", "progress": { ... } },
    { "id": "99", "progress": { ... } }
  ]
}
```

---

## `GET /stats`

Lightweight stats for **Tracker and Explore pages**. Cached server-side.  
Cache is invalidated on any `PATCH /progress/:id` or `POST /progress/bulk`.

### Response `200`
```json
{
  "totalSolved": 42,
  "totalAttempted": 13,
  "totalQuestions": 3358,
  "totalRevise": 5,
  "currentStreak": 7,
  "maxStreak": 21,
  "weeklyCount": 12,
  "activityTimeline": {
    "2026-06-10": 3,
    "2026-06-09": 1,
    "2026-06-08": 2
  },
  "difficultyBreakdown": { "Easy": 20, "Medium": 18, "Hard": 4 }
}
```

---

## `GET /analytics`

Full analytics for the **Dashboard page only**. Same cache as `/stats`.

### Response `200` — extends StatsResponse with:
```json
{
  "...all StatsResponse fields...",
  "topCompanies": [
    { "name": "google", "count": 15 },
    { "name": "amazon", "count": 11 }
  ],
  "platformsBreakdown": [
    { "name": "LeetCode", "count": 42 }
  ],
  "avgTimePerDiff": [
    { "name": "Easy", "avgMinutes": 18 },
    { "name": "Medium", "avgMinutes": 35 },
    { "name": "Hard", "avgMinutes": 62 }
  ],
  "patternMasteryData": [
    { "name": "Dynamic Programming", "solved": 12, "score": 100 },
    { "name": "Two Pointers", "solved": 8, "score": 100 }
  ],
  "revisionList": [
    { "id": "42", "title": "Climbing Stairs", "difficulty": "Easy", "nextRevisionDate": "2026-06-11T..." }
  ]
}
```

---

## `GET /utilities`

Returns all metadata lists. Call once on page load.

### Response `200`
```json
{
  "difficulties": [
    { "id": "diff-1", "name": "Easy", "description": "" },
    { "id": "diff-2", "name": "Medium", "description": "" },
    { "id": "diff-3", "name": "Hard", "description": "" }
  ],
  "platforms": [
    { "id": "plat-1", "name": "LeetCode", "description": "Popular competitive programming platform." }
  ],
  "patterns": [
    { "id": "pat-1", "name": "Two Pointers", "description": "Two pointers iterating through data structures." },
    { "id": "pat-2", "name": "Sliding Window", "description": "Contiguous subarray/substring optimisation." }
  ],
  "tags": [
    { "id": "tag-1", "name": "Array", "description": "" }
  ]
}
```

---

## `GET /companies`

Returns companies sorted by question count (descending). The first item is always `Custom Questions`.

### Response `200`
```json
[
  { "name": "Custom Questions", "slug": "custom questions", "count": 0 },
  { "name": "google", "slug": "google", "count": 847 },
  { "name": "amazon", "slug": "amazon", "count": 623 },
  { "name": "microsoft", "slug": "microsoft", "count": 498 }
]
```

> **⚠️ Breaking change from v1:** Companies are now objects `{name, slug, count}`, not plain strings. Frontend dropdowns must use `c.slug` for the `value` attribute and `c.name` for display.

---

## `POST /custom-questions`

Creates a new custom question and its initial progress record.

### Request Body
```json
{
  "title": "My Custom Problem",
  "link": "https://hackerrank.com/...",
  "difficulty": "Medium",
  "platform": "HackerRank",
  "pattern": "Dynamic Programming",
  "confidenceLevel": 3,
  "timeTaken": 25,
  "tags": ["Array", "DP"]
}
```

### Response `200`
```json
{
  "success": true,
  "question": { ...QuestionWithProgress }
}
```

---

## Error Responses

All errors follow:
```json
{
  "message": "Human-readable error description",
  "errors": [ { "path": "/body/status", "message": "must be one of [Unsolved, Attempted, Solved]" } ]
}
```

| Status | Meaning |
|--------|---------|
| `400` | Request body/params violate OpenAPI schema |
| `401` | Missing/invalid Bearer token |
| `404` | Question ID not found |
| `500` | Server error |

---

## `buildQueryString()` — Frontend Serialization Rules

The `apiClient.buildQueryString()` method follows these rules:

| Value type | Behaviour |
|-----------|-----------|
| `undefined`, `null`, `''` | Skip entirely |
| `false` (boolean) | Skip entirely (server treats omitted = off) |
| `true` (boolean) | Send as string `'true'` |
| `'all'` | Skip (server treats omitted = all) |
| any other | Convert to string with `String(value)` |
