# Tacker — LeetCode Interview Prep Tracker

> **"Dumb UI, Smart API"** — All business logic lives in the backend. The frontend is a pure rendering layer.

---

## What Is This?

Tacker is a personal LeetCode interview-preparation tracker. It lets you:
- Track 3,358+ global LeetCode questions — mark solved, attempted, starred
- Revise solved problems on a smart SRS schedule (confidence 1–4 → 1/3/7/14 day intervals)
- Filter by 654 companies, difficulty, pattern, tag, and more
- View analytics: streaks, heatmaps, difficulty breakdown, pattern mastery, avg solve time
- Add custom questions and System Design questions from any platform

---

## 🚀 Quick Start

```bash
# One command starts everything
make dev
# → Mock Server at http://localhost:4000
# → Frontend (Tacker) at http://localhost:3000
```

Or manually in separate terminals:
```bash
# Terminal 1:
cd mock-server && node server.js

# Terminal 2:
cd frontend && npm run dev
```

---

## 🏗 Repository Structure

```
problem-sorter/
├── api-contract/
│   └── openapi.yaml              ← The source of truth for ALL API shapes (v2.0.0)
├── docs/                         ← Full documentation (start with docs/00_README.md)
├── frontend/                     ← Vite + React 19 Frontend (Tacker UI)
│   └── src/
│       ├── app/                  ← Pages: Tracker, Explore, Dashboard, Add
│       ├── store/useAppStore.js  ← Zustand global state
│       ├── lib/api/apiClient.js  ← All HTTP calls
│       └── config.json           ← authEnabled, API URL
├── mock-server/
│   ├── server.js                 ← Express API — all business logic, SRS, analytics
│   └── data/
│       ├── SQLite tacker.db ← 3,358 LeetCode questions + 654 companies
│       └── SQLite tacker.db (progress table)    ← User progress records (written on every update)
├── backend/                      ← Java Micronaut (future production backend, skeleton only)
├── Makefile                      ← make dev | make mock | make frontend
└── README.md
```

---

## 📚 Documentation

Full documentation is in the [`/docs`](./docs/) directory:

| Doc | Purpose |
|-----|---------|
| [`docs/00_README.md`](./docs/00_README.md) | Documentation index |
| [`docs/01_project_overview.md`](./docs/01_project_overview.md) | Product goals, user flows, SRS system |
| [`docs/02_architecture.md`](./docs/02_architecture.md) | System architecture, data flows, layers |
| [`docs/03_data_model.md`](./docs/03_data_model.md) | Data shapes, API interfaces, PostgreSQL DDL |
| [`docs/04_api_contract.md`](./docs/04_api_contract.md) | Every API endpoint — params, request/response |
| [`docs/05_frontend_guide.md`](./docs/05_frontend_guide.md) | Pages, Zustand store, components, patterns |
| [`docs/06_mock_server_guide.md`](./docs/06_mock_server_guide.md) | Mock server internals, business logic, SRS |
| [`docs/07_known_issues_and_todos.md`](./docs/07_known_issues_and_todos.md) | Current bugs with fixes, TODO priority list |

---

## 🔑 Key Principles

### 1. Dumb UI, Smart API
The frontend **never** computes `dateSolved`, `nextRevisionDate`, streak, or analytics.
It sends simple intent payloads; the server applies all business rules and returns authoritative state.

### 2. OpenAPI Contract is Law
`/api-contract/openapi.yaml` is the single source of truth. The mock server enforces it via
`express-openapi-validator` — invalid requests are rejected with structured 400 errors.

### 3. In-Memory Indexes
The mock server builds `companyIndex` and `difficultyIndex` at startup for O(1) filtering.
No database scans during request handling.

### 4. Analytics Cache
Analytics are computed once and cached. Any `PATCH /progress/:id` invalidates the cache.
`GET /stats` (lightweight) and `GET /analytics` (full) share the same cached computation.

---

## 🛣 Roadmap

- [x] Mock server with all business logic and OpenAPI enforcement
- [x] OpenAPI v2.0.0 contract
- [x] Tracker, Explore, Dashboard, Add pages
- [x] SRS revision system
- [x] Streak + heatmap
- [ ] Fix company dropdown bug (see `docs/07_known_issues_and_todos.md`)
- [ ] Add `GET /stats` to apiClient + `fetchLightStats` to store
- [ ] FlashcardMode bulk update endpoint integration
- [ ] Java Micronaut production backend
- [ ] Vercel deployment + OCI Docker backend

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 19, React 18, Zustand, Vanilla CSS |
| Mock Server | Node.js, Express 5, express-openapi-validator |
| Backend (future) | Java Micronaut, JOOQ, PostgreSQL |
| Auth | NextAuth.js (Google OAuth) |
| Charts | Recharts |
