# Tacker — Documentation Index

> **App name:** Tacker | **Repo:** `problem-sorter` | **Last updated:** 2026-06-10

Tacker is a personal LeetCode interview-preparation tracker. It lets you log solved questions, track revision schedules using Spaced Repetition (SRS), and view analytics about your preparation.

---

## Documents in This Directory

| File | Purpose | Read First? |
|------|---------|-------------|
| [`00_README.md`](./00_README.md) | You are here — index and orientation | ✅ Yes |
| [`01_project_overview.md`](./01_project_overview.md) | What is Tacker, why it exists, product goals | ✅ Yes |
| [`02_architecture.md`](./02_architecture.md) | Full system architecture — monorepo, layers, data flow | ✅ Yes |
| [`03_data_model.md`](./03_data_model.md) | Data shapes, JSON structures, PostgreSQL DDL | When writing BE code |
| [`04_api_contract.md`](./04_api_contract.md) | Every API endpoint — params, request body, response schema | When calling/building APIs |
| [`05_frontend_guide.md`](./05_frontend_guide.md) | Vite pages, components, Zustand store, known bugs | When working on frontend |
| [`06_mock_server_guide.md`](./06_mock_server_guide.md) | Mock server internals — indexes, business logic, SRS | When working on mock server |
| [`07_known_issues_and_todos.md`](./07_known_issues_and_todos.md) | Current bugs, incomplete items, priority order | Start here if resuming |
| [`design_doc.md`](./design_doc.md) | System design v2 — feature matrix, PostgreSQL schema | Reference |
| [`findings_and_analysis.md`](./findings_and_analysis.md) | Deep analysis — bugs found/fixed, performance, decisions | Deep reference |

---

## Quick Start (Any Developer / Agent)

```bash
# Clone and install
git clone <repo-url>
cd problem-sorter

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install mock server dependencies  
cd mock-server && npm install && cd ..

# Run everything
make dev
# → Mock Server at http://localhost:4000
# → Frontend (Tacker) at http://localhost:3000
```

---

## Core Principle: "Dumb UI, Smart API"

The **single most important rule** of this codebase:

> **The frontend NEVER computes anything. It only renders what the API returns and sends simple intent payloads.**

| ❌ NEVER in frontend | ✅ ALWAYS in server |
|---------------------|-------------------|
| Calculate `nextRevisionDate` | Server computes via SRS from `confidenceLevel` |
| Stamp `dateSolved` | Server stamps when `status=Solved` |
| Filter/sort arrays | Server applies all filters via indexes |
| Compute streak or analytics | Server computes, caches, returns |

If you find business logic in `frontend/`, it is a bug.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 (App Router), React 18, Zustand, Vanilla CSS |
| Mock Server (dev) | Node.js, Express 5, express-openapi-validator |
| Backend (future) | Java Micronaut + JOOQ + PostgreSQL |
| Auth | NextAuth.js (Google OAuth) |
| API Contract | OpenAPI 3.0.3 (`/api-contract/openapi.yaml`) |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |

---

## Repository Structure

```
problem-sorter/
├── api-contract/
│   └── openapi.yaml              ← Source of truth for ALL API shapes
├── docs/                         ← All documentation (you are here)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js           ← Tracker page (home)
│   │   │   ├── explore/page.js   ← Explore all global questions
│   │   │   ├── dashboard/page.js ← Analytics dashboard
│   │   │   ├── add/page.js       ← Add custom question
│   │   │   └── components/       ← Shared UI components
│   │   ├── store/
│   │   │   └── useAppStore.js    ← Zustand global state
│   │   ├── lib/api/
│   │   │   └── apiClient.js      ← All API calls
│   │   └── config.json           ← App config (authEnabled, API URL)
│   └── package.json
├── mock-server/
│   ├── server.js                 ← Express API (all business logic)
│   ├── data/
│   │   ├── SQLite tacker.db ← 3,358 LeetCode questions + companies
│   │   └── SQLite tacker.db (progress table)    ← User's progress records
│   └── package.json
├── backend/                      ← Java Micronaut (skeleton, not active)
├── Makefile                      ← make dev, make mock, make frontend
└── README.md
```
