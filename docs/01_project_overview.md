# 01 — Project Overview

## What Is Tacker?

Tacker is a personal LeetCode interview-preparation tracker. The product helps software engineers:

1. **Track** which problems they have solved, attempted, or skipped
2. **Revise** solved problems on a smart schedule using Spaced Repetition (SRS)
3. **Analyse** their preparation — streaks, heatmaps, company coverage, pattern mastery
4. **Explore** 3,358 global LeetCode questions filtered by company, difficulty, or keyword
5. **Add** custom questions from other platforms (HackerRank, Codeforces, etc.)

---

## Who Is It For?

Software engineers preparing for technical interviews at top-tier companies. The typical user:
- Has 50–500 LeetCode problems to track
- Needs spaced repetition so solved problems don't decay from memory
- Wants to see their weak patterns and company-specific coverage

---

## Product Goals

| Goal | How Tacker achieves it |
|------|----------------------|
| Zero friction tracking | One-click to mark Attempted / Solved directly in the table |
| Smart revision | SRS schedule computed server-side (confidence 1–4 → 1/3/7/14 day intervals) |
| Deep analytics | Heatmap, streak, difficulty breakdown, pattern mastery, avg time per difficulty |
| Fast UI | All filtering/sorting/analytics done by the server; UI just renders |
| Company focus | 654 companies indexed; filter questions by any company in O(1) |
| Offline-friendly mock | Mock server mimics production API — no real DB needed during development |

---

## Scope of Current Work

The app is in **active development** against the mock server. The production Java Micronaut backend is planned but not yet implemented.

Current state:
- ✅ Mock server with all API endpoints and full business logic
- ✅ Frontend (Next.js) — Tracker, Explore, Dashboard, Add pages
- ✅ OpenAPI v2.0.0 contract strictly enforced by mock server
- ⚠️ Several known bugs being tracked in `07_known_issues_and_todos.md`
- ❌ Java Micronaut backend — skeleton only

---

## Pages / User Flows

### `/` — Tracker (Home)
- Shows only questions the user has **interacted with** (solved, attempted, starred, or flagged for revision)
- Streak panel + heatmap visible once the user has solved ≥ 1 question
- StatsBar: Solved / Attempted / Due Revision counts + difficulty breakdown
- Filter by: difficulty, company, status, tag, pattern, starred, hide-solved, needs-revision
- Sort by any column
- Flashcard mode (Quick Recall) for due-revision questions
- Notes modal with Markdown preview/edit

### `/explore` — Explore Global Questions
- Shows **all 3,358 questions** (no trackerMode filter)
- Always-visible filter bar (search, difficulty, company, tag, pattern, hide-solved, starred)
- Same table and modals as Tracker
- User can mark questions as solved/attempted directly here → appears in Tracker

### `/dashboard` — Analytics
- Requires auth
- Fetches full analytics: difficulty pie chart, top companies bar chart, avg time per difficulty, pattern mastery
- Revision list (upcoming due questions)
- AI Coach motivational blurb based on revision queue / strongest pattern

### `/add` — Add Custom Question
- Form to create a custom question (title, URL, difficulty, platform, pattern, confidence, time taken, tags)
- Creates via `POST /api/v1/custom-questions`
- Custom questions appear in Tracker with a "Custom Questions" company filter

---

## SRS (Spaced Repetition System)

When a question is marked **Solved**, the user selects a confidence level 1–4:

| Level | Label | Next revision in |
|-------|-------|----------------|
| 1 | Forgot Completely | 1 day |
| 2 | Needed Hints | 3 days |
| 3 | Recalled | 7 days |
| 4 | Mastered | 14 days |

The `nextRevisionDate` is **computed by the server** — the frontend only sends `confidenceLevel`.

When a question is due for revision, a pulsing badge appears in the REVISE column. The user can:
1. Click REVISE → opens ReflectionModal → rates confidence → server re-schedules
2. Open FlashcardMode (Quick Recall) → rate each card → server updates in batch (TODO: bulk endpoint)

---

## Authentication

- Google OAuth via **NextAuth.js**
- `authEnabled: true` in `frontend/src/config.json`
- Without auth: table is visible but all write actions are hidden
- With auth: full tracking, revision, and analytics unlocked
- Mock server accepts any Bearer token (uses `mock-token` when no session exists)
