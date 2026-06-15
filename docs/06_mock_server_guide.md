# 06 — Mock Server Guide

> File: `mock-server/server.js`  
> Dependencies: `express@5`, `cors`, `express-openapi-validator`, `yaml`  
> Port: `4000` (override with `PORT` env var)

The mock server is the **authoritative backend** during development. It holds all business logic and enforces the OpenAPI contract strictly.

---

## Starting the Server

```bash
cd mock-server
node server.js
```

Output:
```
🚀 Mock Server → http://localhost:4000
   3358 questions | 654 companies | 2 progress records
   OpenAPI contract enforced
```

---

## Architecture

### OpenAPI Validation (Middleware)
```js
app.use(OpenApiValidator.middleware({
  apiSpec: '../api-contract/openapi.yaml',
  validateRequests: true,
  validateResponses: false,  // responses not validated (too slow for 3358 questions)
}));
```

Every request is validated against the OpenAPI spec. Invalid requests → 400 with structured error.

---

## In-Memory Data Structures

All data structures are built once at startup from SQLite database. No disk reads during request handling (except progress saves on PATCH).

### `questionMap` — `Map<id, Question>`
```js
// Main store — O(1) lookup by question ID
questionMap.get("1")
// → { id: "1", title: "Two Sum", titleLower: "two sum", difficulty: "Easy",
//     diffLower: "easy", url: "...", acceptanceRate: "57.5%",
//     frequency: 100.0, companies: ["google", "amazon"], isCustom: false }
```

### `questionList` — `Question[]`
```js
// Sorted array of all questions by numeric ID ascending
// Used as the starting point for GET /questions when no company/difficulty filter
questionList[0]  // → { id: "1", ... }
```

### `companyIndex` — `Map<slug, Set<questionId>>`
```js
// O(1) company filter
companyIndex.get("google")
// → Set { "1", "2", "42", "100", ... }  (847 questions)

companyIndex.get("american-express")
// → Set { "15", "87", ... }
```

### `difficultyIndex` — `Map<'easy'|'medium'|'hard', Set<questionId>>`
```js
difficultyIndex.get("easy")   // → Set of 811 IDs
difficultyIndex.get("medium") // → Set of 1789 IDs
difficultyIndex.get("hard")   // → Set of 758 IDs
```

### `progressMap` — `Map<questionId, ProgressRecord>`
```js
// Loaded from SQLite tacker.db (progress table) at startup, written on every PATCH
progressMap.get("1")
// → { status: "Solved", dateSolved: "...", confidenceLevel: 3,
//     nextRevisionDate: "...", revise: false, attempts: 2,
//     timeSpent: 1800, notes: "...", tags: ["Array"], pattern: "...",
//     solutionLink: "", important: true }
```

### `analyticsCache` — `Object | null`
```js
// null = dirty, needs recompute
// Set to null by invalidateAnalyticsCache() after every PATCH
// Computed lazily by getOrComputeAnalytics()
analyticsCache = null;
```

---

## Startup Sequence

```
1. loadGlobalQuestions()
   ├── Read SQLite tacker.db (~5MB, 51K lines)
   ├── For each question:
   │   ├── Parse ID, title, difficulty, acceptanceRate, frequency, URL, companies
   │   ├── Pre-compute: titleLower, diffLower, frequency (float)
   │   ├── Normalize companies: lowercase, trim, filter empty
   │   ├── Add to questionMap
   │   ├── Add to difficultyIndex[diffLower]
   │   └── Add to companyIndex[company] for each company
   └── Sort questionList by numeric ID ascending

2. loadProgress()
   ├── Read SQLite tacker.db (progress table)
   ├── For each entry: migrate legacy comma-string tags → array
   └── Populate progressMap

3. Inline metadata: patternsData, platformsData, tagsData (hardcoded)

4. app.listen(4000)
```

---

## Request Handling: `GET /questions`

```
Input: query params { company, difficulty, search, status, tag, pattern,
                      hideSolved, starredOnly, reviseFilter, trackerMode,
                      sortBy, sortDirection, page, limit }

Step 1: candidateIds (Set of IDs to consider)
  if company=google:
    candidateIds = companyIndex.get("google")  // O(1), ~847 IDs
  if difficulty=Easy:
    easyIds = difficultyIndex.get("easy")      // O(1), 811 IDs
    candidateIds = intersection(candidateIds, easyIds)  // O(min)
  if neither:
    source = questionList (all 3358)

Step 2: Linear pass over candidates
  for each question in candidates:
    prog = progressMap.get(q.id) || { status: 'Unsolved', attempts: 0, tags: [] }
    
    if trackerMode=true && !isCustom && !hasEngaged: continue
    if search && !title.includes(search): continue
    if status && prog.status !== status: continue
    if tag && !prog.tags.some(t => t.includes(tag)): continue
    if pattern && prog.pattern !== pattern: continue
    if hideSolved && isSolved: continue
    if starredOnly && !prog.important: continue
    if reviseFilter && !isDue && !prog.revise: continue
    
    results.push(formatQuestion(q, prog))

Step 3: Sort (if sortBy specified)
  In-place sort on results array

Step 4: Paginate
  slice((page-1)*limit, page*limit)

Step 5: Return JSON { data, totalCount, page, totalPages }
```

**Complexity:**
- No company + no difficulty filter: O(n) — walks all 3,358 questions
- With company filter: O(k) where k = questions for that company
- With both: O(intersection size)

---

## Business Logic: `PATCH /progress/:id`

All state transitions are centralized here. The frontend sends intent; the server computes derived values.

```js
if (updates.status === 'Unsolved') {
  // FULL RESET — removes all tracking data
  newProgress = {
    status: 'Unsolved',
    dateSolved: null,
    confidenceLevel: null,
    nextRevisionDate: null,
    revise: false,
    attempts: 0,
    timeSpent: existing.timeSpent,  // ← preserve time already spent
    notes: '',
    tags: existing.tags,            // ← preserve tags
    pattern: '',
    solutionLink: '',
    important: existing.important,  // ← preserve starred
  };

} else if (updates.status === 'Solved') {
  // SOLVE — stamp date, compute SRS date
  dateSolved = now()
  confidenceLevel = updates.confidenceLevel || existing.confidenceLevel || 3
  nextRevisionDate = calcNextRevisionDate(confidenceLevel)
  attempts = max(existing.attempts, 1)
  newProgress = { ...existing, ...updates, dateSolved, confidenceLevel, nextRevisionDate, attempts }

} else if (updates.revise === true) {
  // MARK FOR REVISION — compute SRS date
  confidenceLevel = updates.confidenceLevel || existing.confidenceLevel || 3
  nextRevisionDate = calcNextRevisionDate(confidenceLevel)
  newProgress = { ...existing, ...updates, revise: true, nextRevisionDate }

} else if (updates.revise === false) {
  // UNMARK REVISION — clear SRS date
  newProgress = { ...existing, ...updates, revise: false, nextRevisionDate: null }

} else if (updates.confidenceLevel !== undefined && existing.revise) {
  // CONFIDENCE CHANGE during active revision — re-schedule
  nextRevisionDate = calcNextRevisionDate(updates.confidenceLevel)
  newProgress = { ...existing, ...updates, nextRevisionDate }

} else {
  // ANY OTHER UPDATE — simple merge
  newProgress = { ...existing, ...updates }
}

progressMap.set(id, newProgress)
invalidateAnalyticsCache()  // set analyticsCache = null
saveProgress()              // write SQLite tacker.db (progress table) to disk
res.json(formatProgress(newProgress))  // return FULL progress object
```

---

## SRS Calculation

```js
const SRS_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14 };  // days

function calcNextRevisionDate(confidenceLevel) {
  const days = SRS_INTERVALS[Math.max(1, Math.min(4, confidenceLevel || 3))];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
```

---

## Analytics Computation (`getOrComputeAnalytics`)

Called by both `GET /stats` and `GET /analytics`. Uses the cache:

```js
function getOrComputeAnalytics() {
  if (analyticsCache) return analyticsCache;  // O(1) cache hit

  // Walk all progress records: O(p) where p = solved/attempted questions
  for (const [id, p] of progressMap) {
    const q = questionMap.get(id);
    
    if (isSolved) {
      totalSolved++;
      diffs[q.difficulty]++;
      
      // Heatmap: { "YYYY-MM-DD": count }
      activityTimeline[dateSolved.split('T')[0]]++;
      
      // Time tracking
      timeByDiff[q.diffLower].sum += p.timeSpent;
      
      // Pattern mastery
      patternCounts[p.pattern].solved++;
      
      // Company coverage
      q.companies.forEach(c => companyCounts[c]++);
    }
    
    if (isDue || p.revise) {
      revList.push({ id, title, difficulty, nextRevisionDate });
    }
  }

  // Streak calculation from sorted activityTimeline dates
  // Weekly count from last 7 days
  // topCompanies, avgTimePerDiff, patternMasteryData from aggregations

  analyticsCache = { ...all computed fields };
  return analyticsCache;
}
```

**Cache invalidation:** Any `PATCH /progress/:id` or `POST /progress/bulk` calls `invalidateAnalyticsCache()` → sets `analyticsCache = null`. Next request recomputes.

---

## Tag Normalization

```js
function normalizeTags(incoming, existing = []) {
  if (incoming === undefined) return Array.isArray(existing) ? existing : [];
  if (Array.isArray(incoming)) return incoming.map(t => t.trim()).filter(Boolean);
  if (typeof incoming === 'string') return incoming.split(',').map(t => t.trim()).filter(Boolean);
  return Array.isArray(existing) ? existing : [];
}
```

Also runs on startup for legacy data:
```js
// In loadProgress():
if (typeof p.tags === 'string') {
  p.tags = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
}
```

---

## Data Files

### `mock-server/data/SQLite tacker.db`
- ~5MB, ~51K lines
- Object keyed by question ID
- Updated by `frontend/scripts/fetch-data.js` which pulls from GitHub (`Vikramadtya/leetcode-companywise-interview-questions`)
- Never modified by the mock server

### `mock-server/data/SQLite tacker.db (progress table)`
- Written on every PATCH and POST /progress/bulk
- Object keyed by question ID
- Only contains questions the user has interacted with

---

## Adding a New Endpoint

1. Add the path/operation to `/api-contract/openapi.yaml` first
2. Implement the handler in `server.js`
3. The OpenAPI validator will enforce request validation automatically

```js
app.get('/api/v1/my-new-endpoint', (req, res) => {
  // req.query is already validated by OpenApiValidator middleware
  const result = computeSomething();
  res.json(result);
});
```

---

## Hardcoded Metadata

Patterns, platforms, and tags are hardcoded in `server.js` (not from a file). Modify them directly:

```js
let patternsData = [
  { id: 'pat-1', name: 'Two Pointers', description: '...' },
  { id: 'pat-2', name: 'Sliding Window', description: '...' },
  // 12 total
];

let platformsData = [
  { id: 'plat-1', name: 'LeetCode', description: '...' },
  // 3 total
];

let tagsData = [
  { id: 'tag-1', name: 'Array', description: '' },
  // 8 total
];
```

`GET/POST /patterns`, `/platforms`, `/tags` endpoints allow runtime CRUD (in-memory only, lost on restart).
