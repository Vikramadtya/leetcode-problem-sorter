# Tacker — Implementation Plan & Roadmap (v2)

> **Status:** Mock server + frontend complete. Java Micronaut backend is next.  
> Last updated: 2026-06-10

---

## Current Architecture Status

The app is live against the mock server. All core features are implemented.

See [`02_architecture.md`](./02_architecture.md) for full architecture details.

### What's Done ✅
- Mock server with all API endpoints, in-memory indexes, SRS logic, analytics cache
- OpenAPI v2.0.0 contract (`/api-contract/openapi.yaml`)
- Tracker, Explore, Dashboard, Add pages (Next.js)
- Zustand store with optimistic updates
- Streak, heatmap, StatsBar components

### What's Broken / Missing ⚠️
See [`07_known_issues_and_todos.md`](./07_known_issues_and_todos.md) for full list.

Critical:
1. Company dropdown renders `[object Object]` — fix in `page.js:275` and `explore/page.js:199`
2. Tags sent as string from `Table.js:48` — fix to send array
3. `fetchStats()` calls heavy `/analytics` — add `fetchLightStats()` → `GET /stats`
4. FlashcardMode makes individual PATCHes — implement `bulkUpdateProgress`

---

## Phase 1: Fix Current Bugs (Short-term)

1. **Company dropdown bug** — 30min fix, 2 files
2. **Tags as array** — 10min fix, 1 file
3. **`fetchLightStats()`** — 1 hour: add `apiClient.getStats()` + store action + update pages
4. **Bulk update** — 2 hours: `apiClient.bulkUpdateProgress()` + refactor `FlashcardMode.js`

---

## Phase 2: Java Micronaut Backend (Production)

The mock server is a development placeholder. The production backend is Java Micronaut.

### Database
PostgreSQL with JOOQ. Full schema in [`03_data_model.md`](./03_data_model.md).

### API Surface
Exact same endpoints as the mock server — guided by `/api-contract/openapi.yaml`.
When the Micronaut backend is ready, simply change `NEXT_PUBLIC_API_URL` — zero frontend changes.

### Weekly GitHub Sync
Micronaut `@Scheduled` task (every Sunday midnight) to fetch and upsert questions from:
`https://github.com/Vikramadtya/leetcode-companywise-interview-questions`

### Auth
Micronaut validates the NextAuth JWT token. Shared secret between Vercel and OCI.

### Deployment
- Frontend → Vercel
- Backend → OCI Docker (Micronaut native image via GraalVM, or standard JVM)

---

## Phase 3: Advanced Features

| Feature | Priority | Notes |
|---------|---------|-------|
| Virtual scrolling in Table | Medium | `react-window` for 3358-row performance |
| Store-level debounce for fetchQuestions | Medium | Batch rapid filter changes |
| Streak cards on Dashboard | Low | Already in `GET /analytics` response |
| Tags autocomplete | Low | Fetch existing tags from `/utilities` |
| Question difficulty override | Low | Custom questions can set any difficulty |
| Export to CSV | Low | Backend generates CSV of progress |
| Multi-user support | Future | JWT-based user isolation in Micronaut |
