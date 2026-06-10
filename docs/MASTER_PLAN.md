# Tacker — Master Plan: Full Optimisation, Bug Fixes & BE Implementation

> **Created:** 2026-06-10 | **Conversation:** `43446f4c-2a6d-4fe8-972f-83a76f0ef059`  
> This is the **single source of truth** for all planned work. Read this before touching any code.

---

## PART 0 — EXECUTIVE SUMMARY

The audit uncovered **12 confirmed bugs** (3 critical), **8 UI structural problems**, **6 API design gaps**, and **4 mock-server inefficiencies**. The plan is structured in 7 phases executed in order. Each phase has numbered tasks so any agent can pick up where the previous left off.

---

## PART 1 — AUDIT FINDINGS

### 1.1 Critical Bugs (App is Broken / Data Loss)

| # | Location | Bug | Severity |
|---|---------|-----|---------|
| B-1 | `page.js:275`, `explore/page.js:199` | Company dropdown renders `[object Object]` — companies are now objects `{name,slug,count}` not strings | 🔴 Critical |
| B-2 | `Table.js:288-292` | Tag display: `typeof prog.tags === 'string'` check — tags are now arrays, this branch NEVER runs, tags never display | 🔴 Critical |
| B-3 | `Table.js:48` | `handleTagInput` sends `{ tags: tagsString }` (string) — violates contract, tags lost if server ever enforces strict types | 🔴 Critical |

### 1.2 Logic Bugs (Wrong Behaviour)

| # | Location | Bug | Severity |
|---|---------|-----|---------|
| B-4 | `add/page.js:53` | `tags: form.tags.join(',')` sends comma-string — should send array | 🟠 High |
| B-5 | `ReflectionModal.js:7` | `question.pattern` is wrong — `question` is a `QuestionWithProgress` so pattern is at `question.progress?.pattern` | 🟠 High |
| B-6 | `InitialSolveModal.js:7` | Same as B-5 — reads `question.pattern` instead of `question.progress?.pattern` | 🟠 High |
| B-7 | `page.js:60` | `fetchStats()` is called on Tracker page but calls `GET /analytics` — the full heavy endpoint — instead of lightweight `GET /stats` | 🟠 High |
| B-8 | `Table.js:122` | `isRevisionOverdue` condition wrong: `!prog.revise` excludes questions actively being revised that are also overdue | 🟡 Medium |
| B-9 | `useAppStore.js:165` | `if (updates.status === 'Unsolved') await get().fetchQuestions()` — this is called even when page is in Explore mode, causing flicker | 🟡 Medium |
| B-10 | `FlashcardMode.js:6` | Receives `progress` prop but never uses it — `currentQ.progress` is used instead. Dead prop. | 🟡 Medium |

### 1.3 UX/Display Bugs

| # | Location | Bug | Severity |
|---|---------|-----|---------|
| B-11 | `Table.js:122` | Timer state `activeTimers` is local to Table — timer is lost on any re-render/re-fetch | 🟡 Medium |
| B-12 | `Header.js:19` | Logo text says "LeetCode Prep" — should say "Tacker" (app name from config) | 🟢 Low |

### 1.4 Security Issues

| # | Location | Issue |
|---|---------|------|
| S-1 | `apiClient.js:9` | `session?.user?.id` used as Bearer token — user IDs are NOT secrets; exposes user ID to API |
| S-2 | `mock-server/server.js` | No auth validation — any Bearer token accepted; acceptable for dev but must be documented |
| S-3 | `add/page.js:42` | `if (!session) return` silently fails — form submits but does nothing; should show error |
| S-4 | `Table.js:162` | Fallback `updateProgress(q.id, { status: 'Solved', dateSolved: new Date().toISOString() })` sets dateSolved in frontend — violates "Dumb UI" principle |

### 1.5 Dead Code / Unused Items

| # | Location | Issue |
|---|---------|------|
| D-1 | `frontend/src/app/components/Filters.js` | Entire file is unused — filters are inlined in each page |
| D-2 | `frontend/src/app/components/FocusMode.js` | Not imported anywhere |
| D-3 | `frontend/src/app/components/ListManager.js` | Not imported anywhere (patterns/platforms/tags pages are stubs) |
| D-4 | `frontend/src/app/context/` | Empty directory |
| D-5 | `frontend/src/app/patterns/page.js` | 316-byte stub — returns null or blank |
| D-6 | `useAppStore.js` | `resetToExploreMode` not exported (was fixed) but `fetchLightStats` missing |
| D-7 | `Header.js` | `isMockMode` prop accepted but never passed — `signIn('credentials')` branch is dead |

### 1.6 Performance Issues

| # | Location | Issue |
|---|---------|------|
| P-1 | `Table.js` | Renders 3,358 DOM rows in Explore — no virtualization |
| P-2 | `useAppStore.js:51` | `setFilter()` calls `fetchQuestions()` synchronously — rapid typing fires many requests |
| P-3 | `Table.js` | No `React.memo` — re-renders entire table on any store change |
| P-4 | `mock-server/server.js` | `saveProgress()` is synchronous `fs.writeFileSync` — blocks event loop on every PATCH |
| P-5 | `apiClient.js` | No request deduplication — rapid filter changes can queue many overlapping requests |
| P-6 | `page.js` + `explore/page.js` | Both call `fetchUtilities()` independently — `GET /companies` called twice on first load |

---

## PART 2 — UI REFACTORING PLAN

### Track UI-1: Fix All Critical & High Bugs

**Tasks:**
```
[ ] UI-1.1  Fix B-1: Company dropdown in page.js and explore/page.js
[ ] UI-1.2  Fix B-2: Tag display in Table.js — render from array not string
[ ] UI-1.3  Fix B-3: handleTagInput — send array not string  
[ ] UI-1.4  Fix B-4: add/page.js — send tags as array
[ ] UI-1.5  Fix B-5/B-6: ReflectionModal + InitialSolveModal — read question.progress?.pattern
[ ] UI-1.6  Fix B-12: Header logo text → read from config.app.name
[ ] UI-1.7  Fix S-4: Remove fallback dateSolved in Table.js:162
[ ] UI-1.8  Fix S-3: add/page.js — show error if no session instead of silent fail
```

### Track UI-2: State Architecture Improvements

**Tasks:**
```
[ ] UI-2.1  Add apiClient.getStats() → GET /api/v1/stats
[ ] UI-2.2  Add apiClient.bulkUpdateProgress(updates) → POST /api/v1/progress/bulk
[ ] UI-2.3  Add store.fetchLightStats() → calls apiClient.getStats()
[ ] UI-2.4  page.js: replace fetchStats() with fetchLightStats()
[ ] UI-2.5  Add debounce inside setFilter() at store level (300ms, cancel prev)
[ ] UI-2.6  Add AbortController to fetchQuestions() — cancel in-flight requests on new filter change
[ ] UI-2.7  Extract defaultFilters() to a shared constants file
[ ] UI-2.8  Fix B-9: Only re-fetch on Unsolved when trackerMode=true
```

### Track UI-3: Table Component Refactor

**Tasks:**
```
[ ] UI-3.1  Wrap Table with React.memo(Table) 
[ ] UI-3.2  Wrap each row component in React.memo
[ ] UI-3.3  Move timer logic to a custom hook useTimer(questionId) — timer survives re-renders
[ ] UI-3.4  Fix B-11: Persist active timers in a ref (not useState) so re-renders don't reset them
[ ] UI-3.5  Fix B-8: isRevisionOverdue — overdue means past date; revise=true can also be overdue
[ ] UI-3.6  Fix tag display — check Array.isArray(prog.tags) not typeof === 'string'
[ ] UI-3.7  Add useCallback to all event handlers (handleTagInput, handleScore, etc.)
[ ] UI-3.8  companies column: capitalize slug display (e.g. "google" → "Google")
```

### Track UI-4: FlashcardMode Bulk Update

**Tasks:**
```
[ ] UI-4.1  Accumulate pendingUpdates in useState inside FlashcardMode
[ ] UI-4.2  On modal close: call apiClient.bulkUpdateProgress(pendingUpdates)
[ ] UI-4.3  Show progress bar during bulk save
[ ] UI-4.4  Remove dead progress prop from FlashcardMode
[ ] UI-4.5  After bulk save: call fetchLightStats() to refresh streak/heatmap
```

### Track UI-5: Cleanup Dead Code

**Tasks:**
```
[ ] UI-5.1  Delete Filters.js (unused)
[ ] UI-5.2  Delete FocusMode.js (unused)  
[ ] UI-5.3  Delete ListManager.js (unused)
[ ] UI-5.4  Delete empty context/ directory
[ ] UI-5.5  Fix patterns/page.js, platforms/page.js, tags/page.js — implement as proper pages or remove nav links
[ ] UI-5.6  Remove isMockMode prop from Header (dead)
[ ] UI-5.7  Remove unused imports across all files
```

### Track UI-6: Error Handling & Loading States

**Tasks:**
```
[ ] UI-6.1  Add error boundary (ErrorBoundary.js) wrapping the main table area
[ ] UI-6.2  Add skeleton loading state for Table (not just "Loading...")
[ ] UI-6.3  Add empty state illustration/message when tracker has 0 questions
[ ] UI-6.4  Add retry button when fetchQuestions fails
[ ] UI-6.5  Show toast.success on successful PATCH (not just on error)
[ ] UI-6.6  Handle 401 globally in apiClient — redirect to sign-in
[ ] UI-6.7  Add network error detection — show "Offline / Server unreachable" banner
[ ] UI-6.8  Dashboard: handle case where analytics returns 0 solved (empty chart messages)
```

### Track UI-7: Accessibility & Standards

**Tasks:**
```
[ ] UI-7.1  Add aria-label to all icon buttons (star, checkboxes, timer, sort icons)
[ ] UI-7.2  Add role="status" to loading states
[ ] UI-7.3  Ensure all modals trap focus (use a focus-trap library or manual tabIndex)
[ ] UI-7.4  Add keyboard navigation: Tab through table rows, Enter to open notes
[ ] UI-7.5  Add meta description per page (not just layout.js global)
[ ] UI-7.6  Add <title> per page using Next.js generateMetadata
[ ] UI-7.7  Ensure color contrast meets WCAG AA on all difficulty pills
```

### Track UI-8: Patterns / Platforms / Tags Pages

**Tasks:**
```
[ ] UI-8.1  Implement /patterns page using ListManager component (renamed/fixed)
[ ] UI-8.2  Implement /platforms page
[ ] UI-8.3  Implement /tags page  
[ ] UI-8.4  Each page: GET list, add new item form, delete (future)
```

---

## PART 3 — API CONTRACT IMPROVEMENTS

### Track API-1: Missing Endpoints & Response Hardening

**Tasks:**
```
[ ] API-1.1  Add GET /questions/{id} — fetch single question (needed for navigation)
[ ] API-1.2  Add DELETE /progress/{id} — explicit reset (cleaner than PATCH status=Unsolved)
[ ] API-1.3  Add GET /questions/due-revision — optimized shortcut (no need to filter client-side)
[ ] API-1.4  Add pagination cursor (cursor-based) as alternative to page/limit for large datasets
[ ] API-1.5  Standardize error envelope: { code, message, details[], requestId }
[ ] API-1.6  Add X-Request-ID header echo in all responses
```

### Track API-2: Validation Improvements

**Tasks:**
```
[ ] API-2.1  Add minLength: 1 to all required string fields in OpenAPI spec
[ ] API-2.2  Add maxLength constraints (title: 500, notes: 50000, solutionLink: 2048)
[ ] API-2.3  Add minimum: 0 to timeSpent, attempts
[ ] API-2.4  Ensure difficulty enum is strictly [Easy, Medium, Hard] everywhere (not case variations)
[ ] API-2.5  Add pattern: date-time to all date fields in spec
[ ] API-2.6  Add examples to all schemas for better DX
[ ] API-2.7  Add 404 responses to all /{id} paths in the spec
```

### Track API-3: Logging & Observability

**Tasks:**
```
[ ] API-3.1  Add structured request logging: method, path, status, duration, requestId
[ ] API-3.2  Add startup summary log: questions loaded, companies indexed, progress records
[ ] API-3.3  Log cache hits vs. recomputes for analytics endpoint
[ ] API-3.4  Log progress saves: questionId, field changed, old→new value
[ ] API-3.5  Add health check endpoint: GET /health → { status, uptime, questionsLoaded, progressCount }
[ ] API-3.6  Add metrics endpoint: GET /metrics → { cacheHits, cacheMisses, totalRequests, avgResponseMs }
```

---

## PART 4 — MOCK SERVER OPTIMISATION

### Track MS-1: Async File I/O

**Tasks:**
```
[ ] MS-1.1  Replace fs.writeFileSync with fs.writeFile (async) + queue writes
[ ] MS-1.2  Add write debounce: batch multiple PATCHs within 500ms into single disk write
[ ] MS-1.3  Add startup timing log: "Loaded 3358 questions in Xms"
```

### Track MS-2: Search Optimisation

**Tasks:**
```
[ ] MS-2.1  Build a titleIndex: Map<word, Set<id>> for word-based search (O(1) per word vs O(n))
[ ] MS-2.2  Add n-gram index for substring search (simpler: just keep current O(n) but note it's fast enough)
[ ] MS-2.3  Pre-compute search tokens at load time (already done: titleLower)
```

### Track MS-3: Request ID & Logging

**Tasks:**
```
[ ] MS-3.1  Add requestId middleware (uuid per request, attach to res.locals)
[ ] MS-3.2  Add morgan-style request logger (or hand-rolled): [timestamp] METHOD /path STATUS Xms
[ ] MS-3.3  Add graceful shutdown handler (SIGTERM → flush pending writes → exit)
```

### Track MS-4: Hardening

**Tasks:**
```
[ ] MS-4.1  Add rate limiting (express-rate-limit) — 1000 req/min per IP for dev safety
[ ] MS-4.2  Add helmet-like headers (X-Content-Type-Options, X-Frame-Options)
[ ] MS-4.3  Add payload size limit (express.json({ limit: '1mb' }))
[ ] MS-4.4  Add try-catch to all route handlers (currently error propagates to express handler, ok but unsafe)
[ ] MS-4.5  Validate questionId exists before PATCH (return 404 if question not found in questionMap)
[ ] MS-4.6  Add CORS config to only allow localhost:3000 in dev
```

### Track MS-5: Data Integrity

**Tasks:**
```
[ ] MS-5.1  On startup: validate user_progress.json entries against questionMap (remove orphans)
[ ] MS-5.2  Add progress schema validator: reject malformed records silently at load
[ ] MS-5.3  Add atomic write for user_progress.json: write to .tmp then rename (prevents corrupt file)
```

---

## PART 5 — DATA MODEL CHANGES

### Breaking Changes (Require Migration)

| Change | Impact | Migration |
|--------|--------|---------|
| `tags`: string[] already done | None | Done in loadProgress() |
| `companies`: `{name,slug,count}[]` | Frontend dropdowns broken | Fix in UI-1.1 |
| Add `dateSolvedEpoch`: number | Faster date comparisons | Compute at load, not stored |

### New Fields to Add

```
ProgressRecord additions:
  lastRevisedAt: string | null    — when revise was last completed
  revisionCount: number           — how many times revised (for advanced SRS)
  totalRevisedTime: number        — seconds spent in revision sessions
```

### Mock Server Data File Improvements

```
[ ] DM-1   Add user_progress.json schema validation on startup
[ ] DM-2   Add .gitignore entry for user_progress.json (personal data)
[ ] DM-3   Add seed data file: data/sample_progress.json with 5-10 solved questions for demos
[ ] DM-4   Add data migration script: scripts/migrate-progress.js (future-proof)
```

---

## PART 6 — JAVA MICRONAUT BACKEND IMPLEMENTATION PLAN

### 6.1 Technology Decisions

| Technology | Choice | Reason |
|-----------|--------|--------|
| Framework | Micronaut 4.x | Low memory, fast startup, compile-time DI |
| Build | Gradle (Kotlin DSL) | Modern, fast |
| Java version | Java 21 (LTS) | Virtual threads, pattern matching |
| Database | PostgreSQL 16 | JSONB for tags, native arrays |
| ORM | JOOQ (type-safe SQL) | No lazy loading surprises, full SQL control |
| Migration | Flyway | Simple, file-based, works with JOOQ |
| Auth | JWT validation (Micronaut Security) | Validates NextAuth JWT tokens |
| HTTP Client | Micronaut HTTP Client | For GitHub sync job |
| Testing | JUnit 5 + Testcontainers | Real PostgreSQL in tests |
| Logging | Logback + SLF4J structured JSON | Cloud-compatible |
| API docs | Micronaut Swagger/OpenAPI | Auto-generate from annotations |
| Deployment | Docker → OCI Container Registry | GraalVM native image optional |

### 6.2 Project Structure

```
backend/
├── build.gradle.kts
├── Dockerfile
├── docker-compose.yml              ← local: postgres + backend
├── src/
│   ├── main/
│   │   ├── java/dev/tacker/
│   │   │   ├── TackerApplication.java
│   │   │   ├── config/
│   │   │   │   ├── AppConfig.java          ← @ConfigurationProperties
│   │   │   │   └── JooqConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── QuestionController.java  ← GET /questions, GET /questions/{id}
│   │   │   │   ├── ProgressController.java  ← GET/PATCH /progress/{id}, POST /bulk
│   │   │   │   ├── AnalyticsController.java ← GET /stats, GET /analytics
│   │   │   │   ├── CompanyController.java   ← GET /companies
│   │   │   │   ├── UtilityController.java   ← GET /utilities, CRUD /patterns etc.
│   │   │   │   ├── CustomQuestionController.java
│   │   │   │   └── HealthController.java    ← GET /health
│   │   │   ├── service/
│   │   │   │   ├── QuestionService.java
│   │   │   │   ├── ProgressService.java     ← ALL business logic (SRS, resets)
│   │   │   │   ├── AnalyticsService.java    ← Cached analytics computation
│   │   │   │   ├── SrsService.java          ← SRS interval calculation
│   │   │   │   └── GithubSyncService.java   ← @Scheduled weekly sync
│   │   │   ├── repository/
│   │   │   │   ├── QuestionRepository.java  ← JOOQ queries
│   │   │   │   ├── ProgressRepository.java
│   │   │   │   └── AnalyticsRepository.java ← SQL aggregation queries
│   │   │   ├── model/
│   │   │   │   ├── dto/                     ← Request/Response DTOs
│   │   │   │   │   ├── QuestionDto.java
│   │   │   │   │   ├── ProgressDto.java
│   │   │   │   │   ├── ProgressUpdateRequest.java
│   │   │   │   │   ├── StatsResponse.java
│   │   │   │   │   └── AnalyticsResponse.java
│   │   │   │   └── domain/                  ← JOOQ-generated records
│   │   │   ├── security/
│   │   │   │   └── JwtTokenValidator.java   ← Validate NextAuth JWT
│   │   │   ├── exception/
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   ├── NotFoundException.java
│   │   │   │   └── ValidationException.java
│   │   │   └── scheduler/
│   │   │       └── GithubSyncJob.java       ← @Scheduled Sunday midnight
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/migration/
│   │           ├── V1__create_tables.sql
│   │           ├── V2__create_indexes.sql
│   │           └── V3__seed_patterns.sql
│   └── test/
│       ├── java/dev/tacker/
│       │   ├── controller/
│       │   │   ├── QuestionControllerTest.java
│       │   │   └── ProgressControllerTest.java
│       │   ├── service/
│       │   │   ├── ProgressServiceTest.java
│       │   │   └── SrsServiceTest.java
│       │   └── integration/
│       │       └── ApiIntegrationTest.java    ← Testcontainers
│       └── resources/
│           └── application-test.yml
```

### 6.3 Controller Design

All controllers must:
- Be annotated `@Controller("/api/v1")`
- Accept `@RequestHeader Authorization` for JWT validation
- Return standard error envelopes
- Log every request with requestId

```java
// Example: ProgressController
@Controller("/api/v1")
public class ProgressController {
    
    @Get("/progress/{questionId}")
    public ProgressDto getProgress(@PathVariable String questionId, Authentication auth) {
        return progressService.getProgress(auth.getUserId(), questionId);
    }
    
    @Patch("/progress/{questionId}")
    @Status(HttpStatus.OK)
    public ProgressDto updateProgress(
        @PathVariable String questionId,
        @Body @Valid ProgressUpdateRequest request,
        Authentication auth
    ) {
        return progressService.updateProgress(auth.getUserId(), questionId, request);
    }
}
```

### 6.4 ProgressService — Business Logic (Port from Mock Server)

```java
public class ProgressService {
    
    public ProgressDto updateProgress(UUID userId, String questionId, ProgressUpdateRequest req) {
        var existing = progressRepo.findOrDefault(userId, questionId);
        
        return switch (req.getStatus()) {
            case UNSOLVED -> resetProgress(existing);         // full reset
            case SOLVED   -> solveProgress(existing, req);   // stamp date, SRS
            case null     -> handlePartialUpdate(existing, req);
        };
    }
    
    private ProgressDto solveProgress(ProgressRecord existing, ProgressUpdateRequest req) {
        var confidence = req.getConfidenceLevel() != null ? req.getConfidenceLevel() : 3;
        var dateSolved = Instant.now();
        var nextRevision = srsService.computeNextDate(confidence);
        
        existing.setStatus(Status.SOLVED);
        existing.setDateSolved(dateSolved);
        existing.setConfidenceLevel(confidence);
        existing.setNextRevisionDate(nextRevision);
        existing.setAttempts(Math.max(existing.getAttempts(), 1));
        // merge other fields...
        
        progressRepo.upsert(existing);
        analyticsService.invalidateCache(existing.getUserId());
        return mapper.toDto(existing);
    }
}
```

### 6.5 SrsService

```java
@Singleton
public class SrsService {
    private static final Map<Integer, Long> INTERVALS_DAYS = Map.of(
        1, 1L, 2, 3L, 3, 7L, 4, 14L
    );
    
    public Instant computeNextDate(int confidenceLevel) {
        long days = INTERVALS_DAYS.getOrDefault(
            Math.max(1, Math.min(4, confidenceLevel)), 7L
        );
        return Instant.now().plus(days, ChronoUnit.DAYS);
    }
}
```

### 6.6 AnalyticsService — Caching Strategy

```java
@Singleton
public class AnalyticsService {
    private final Map<UUID, CachedAnalytics> cache = new ConcurrentHashMap<>();
    
    public AnalyticsResponse getAnalytics(UUID userId) {
        var cached = cache.get(userId);
        if (cached != null && !cached.isDirty()) return cached.getData();
        
        var data = analyticsRepo.computeAnalytics(userId);  // SQL aggregation
        cache.put(userId, new CachedAnalytics(data, false));
        return data;
    }
    
    public void invalidateCache(UUID userId) {
        cache.computeIfPresent(userId, (k, v) -> v.markDirty());
    }
}
```

### 6.7 JOOQ Queries — Key Patterns

**GET /questions with all filters — push to SQL:**
```sql
-- Dynamic WHERE clause built by JOOQ DSL
SELECT 
    gq.id, gq.title, gq.difficulty, gq.acceptance_rate, gq.frequency, gq.url,
    up.status, up.date_solved, up.confidence_level, up.next_revision_date,
    up.revise, up.attempts, up.time_spent, up.notes, up.tags,
    up.pattern, up.solution_link, up.important,
    ARRAY_AGG(qc.company_slug) AS companies
FROM global_questions gq
LEFT JOIN question_companies qc ON qc.question_id = gq.id
LEFT JOIN user_progress up ON up.question_id = gq.id AND up.user_id = ?
WHERE gq.difficulty = ?              -- optional
  AND qc.company_slug = ?            -- optional (via EXISTS subquery)
  AND up.status = ?                  -- optional
  AND gq.title ILIKE ?               -- optional search
  AND (? = FALSE OR up.important = TRUE)  -- starredOnly
  AND (? = FALSE OR up.status != 'Solved') -- hideSolved
GROUP BY gq.id, up.*
ORDER BY gq.id ASC                   -- or dynamic sortBy
LIMIT ? OFFSET ?;
```

**GET /stats — single SQL query:**
```sql
SELECT
    COUNT(*) FILTER (WHERE up.status = 'Solved') AS total_solved,
    COUNT(*) FILTER (WHERE up.status = 'Attempted') AS total_attempted,
    COUNT(*) FILTER (WHERE up.revise = TRUE OR up.next_revision_date <= NOW()) AS total_revise,
    (SELECT COUNT(*) FROM global_questions) AS total_questions
FROM user_progress up
WHERE up.user_id = ?;
```

### 6.8 GitHub Sync Job

```java
@Scheduled(cron = "0 0 0 * * SUN")  // Every Sunday midnight
public class GithubSyncJob {
    
    public void syncQuestions() {
        log.info("Starting GitHub question sync...");
        var data = githubClient.fetchQuestions();
        var upserted = questionRepo.batchUpsert(data);
        log.info("Synced {} questions ({} new, {} updated)", 
                 upserted.total(), upserted.created(), upserted.updated());
    }
}
```

### 6.9 Authentication Flow

```
Next.js (Vercel)                    Micronaut (OCI)
   │                                    │
   │ 1. User signs in with Google       │
   │ 2. NextAuth creates JWT session    │
   │ 3. Frontend sends:                 │
   │    Authorization: Bearer <jwt>  ──►│
   │                                    │ 4. JwtTokenValidator validates:
   │                                    │    - Signature (shared NEXTAUTH_SECRET)
   │                                    │    - Expiry
   │                                    │    - Extract user email/sub
   │                                    │
   │                                    │ 5. Lookup/create user in DB by email
   │                                    │ 6. Attach userId to request context
   │                                    │ 7. Process request
```

```java
@Singleton
public class JwtTokenValidator implements TokenValidator<HttpRequest<?>> {
    
    @Override
    public Publisher<Authentication> validateToken(String token, HttpRequest<?> request) {
        try {
            var claims = Jwts.parser()
                .setSigningKey(nextAuthSecret)
                .parseClaimsJws(token);
            
            var email = claims.getBody().get("email", String.class);
            var userId = userService.findOrCreateByEmail(email).getId();
            
            return Publishers.just(new UserAuthentication(userId, email));
        } catch (JwtException e) {
            return Publishers.empty();
        }
    }
}
```

### 6.10 Flyway Migrations

```sql
-- V1__create_tables.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE global_questions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
    acceptance_rate VARCHAR(10),
    frequency DECIMAL(5,2),
    url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE question_companies (
    question_id VARCHAR(50) REFERENCES global_questions(id) ON DELETE CASCADE,
    company_slug VARCHAR(100) NOT NULL,
    PRIMARY KEY (question_id, company_slug)
);

CREATE TABLE user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Unsolved' CHECK (status IN ('Unsolved','Attempted','Solved')),
    date_solved TIMESTAMPTZ,
    confidence_level SMALLINT CHECK (confidence_level BETWEEN 1 AND 4),
    next_revision_date TIMESTAMPTZ,
    revise BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    time_spent INTEGER DEFAULT 0 CHECK (time_spent >= 0),
    notes TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    pattern VARCHAR(100) DEFAULT '',
    solution_link TEXT DEFAULT '',
    important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, question_id)
);

CREATE TABLE custom_questions (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy','Medium','Hard')),
    url TEXT,
    platform VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

-- V2__create_indexes.sql
CREATE INDEX idx_gq_difficulty ON global_questions(difficulty);
CREATE INDEX idx_qc_company ON question_companies(company_slug);
CREATE INDEX idx_up_status ON user_progress(user_id, status);
CREATE INDEX idx_up_important ON user_progress(user_id, important);
CREATE INDEX idx_up_revise ON user_progress(user_id, revise);
CREATE INDEX idx_up_next_rev ON user_progress(user_id, next_revision_date);
CREATE INDEX idx_up_date_solved ON user_progress(user_id, date_solved);
CREATE INDEX idx_gq_title ON global_questions USING gin(to_tsvector('english', title));

-- V3__seed_patterns.sql
INSERT INTO patterns (name, description) VALUES
  ('Two Pointers', 'Two pointers iterating through data structures.'),
  ('Sliding Window', 'Contiguous subarray/substring optimisation.'),
  ('Dynamic Programming', 'Memoisation and optimal substructure.'),
  ('BFS / DFS', 'Graph and tree traversal.'),
  ('Binary Search', 'Search in a sorted/monotonic space.'),
  ('Backtracking', 'Explore all possibilities and prune.'),
  ('Heap / Priority Queue', 'Efficient min/max retrieval.'),
  ('Greedy', 'Locally optimal choices.'),
  ('Union Find', 'Disjoint set / connected components.'),
  ('Trie', 'Prefix tree for string problems.'),
  ('Monotonic Stack', 'Next greater/smaller element problems.'),
  ('Fast & Slow Pointers', 'Cycle detection in linked lists.');
```

---

## PART 7 — TESTING STRATEGY

### Frontend Tests
```
[ ] T-1.1  Add Vitest + React Testing Library to frontend
[ ] T-1.2  Test useAppStore actions (fetchQuestions, updateProgress, setFilter)
[ ] T-1.3  Test apiClient.buildQueryString() edge cases
[ ] T-1.4  Test Table component renders correct rows from store
[ ] T-1.5  Test SRS badge display logic (overdue, today, upcoming)
[ ] T-1.6  Test Heatmap with both object and array formats
```

### Mock Server Tests
```
[ ] T-2.1  Add Jest to mock-server
[ ] T-2.2  Test PATCH /progress/:id state machine (all 6 branches)
[ ] T-2.3  Test GET /questions filter combinations
[ ] T-2.4  Test analytics cache invalidation
[ ] T-2.5  Test normalizeTags() with all input types
[ ] T-2.6  Test calcNextRevisionDate() for all 4 levels
```

### Backend (Java) Tests
```
[ ] T-3.1  Unit test SrsService — all 4 confidence levels + edge cases
[ ] T-3.2  Unit test ProgressService state machine
[ ] T-3.3  Integration test with Testcontainers PostgreSQL
[ ] T-3.4  API contract tests — validate all endpoints against openapi.yaml
[ ] T-3.5  Load test: GET /questions with 3358 questions + 1000 users (Gatling/k6)
```

---

## PART 8 — DEPLOYMENT PLAN

### Local Development (Current — No Changes Needed)
```bash
make dev
# → Mock Server: localhost:4000
# → Frontend: localhost:3000
```

### Local Development with Real Backend
```bash
docker-compose up -d  # starts postgres + java backend
make frontend         # starts next.js
# → Backend: localhost:8080
# → Frontend: localhost:3000 with NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

**`docker-compose.yml` (new file):**
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: tacker
      POSTGRES_USER: tacker
      POSTGRES_PASSWORD: tacker
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data
  
  backend:
    build: ./backend
    environment:
      DATASOURCES_DEFAULT_URL: jdbc:postgresql://postgres:5432/tacker
      DATASOURCES_DEFAULT_USERNAME: tacker
      DATASOURCES_DEFAULT_PASSWORD: tacker
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    ports: ["8080:8080"]
    depends_on: [postgres]
  
volumes:
  pg_data:
```

### Production Deployment
```
Frontend: Vercel (Next.js native)
  - Auto-deploy on main branch push
  - NEXT_PUBLIC_API_URL=https://api.tacker.dev/api/v1
  - NEXTAUTH_URL=https://tacker.dev
  - NEXTAUTH_SECRET=<secret>
  - GOOGLE_CLIENT_ID/SECRET=<oauth creds>

Backend: OCI (Oracle Cloud Infrastructure) — Free Tier
  - Docker container from OCI Container Registry
  - Compute: VM.Standard.A1.Flex (4 OCPU, 24GB RAM — free)
  - Database: PostgreSQL on VM or managed Autonomous DB
  - Caddy as reverse proxy (auto-HTTPS)
```

**`backend/Dockerfile`:**
```dockerfile
FROM eclipse-temurin:21-jre-alpine AS runtime
COPY build/libs/tacker-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xms64m", "-Xmx512m", "-jar", "app.jar"]
```

---

## PART 9 — NUMBERED TASK CHECKLIST (Execution Order)

> Execute in this order. Check off as done. Each has a clear owner (FE / MS / BE / DOCS).

### Phase 1: Fix Critical Bugs (Do this first — app is broken without it)
```
[ ] 1.1  [FE] Fix company dropdown: page.js:275 + explore/page.js:199
[ ] 1.2  [FE] Fix tag display: Table.js:288-292 — check Array.isArray not typeof string
[ ] 1.3  [FE] Fix handleTagInput: Table.js:48 — send array not string
[ ] 1.4  [FE] Fix add/page.js:53 — tags: form.tags (already array, just pass it)
[ ] 1.5  [FE] Fix B-5/B-6: Read question.progress?.pattern in Modals
[ ] 1.6  [FE] Fix B-12: Header — read name from config.app.name
[ ] 1.7  [FE] Remove S-4: Remove frontend dateSolved assignment in Table.js:162
[ ] 1.8  [FE] Fix add/page.js: show error toast when not authenticated
```

### Phase 2: State & API Layer Improvements
```
[ ] 2.1  [FE] Add apiClient.getStats() method
[ ] 2.2  [FE] Add apiClient.bulkUpdateProgress() method
[ ] 2.3  [FE] Add store.fetchLightStats() action
[ ] 2.4  [FE] Update page.js: call fetchLightStats() not fetchStats()
[ ] 2.5  [FE] Add debounce + AbortController to store.fetchQuestions()
[ ] 2.6  [FE] Fix B-9: only re-fetch on Unsolved when trackerMode=true
```

### Phase 3: Table & Component Fixes
```
[ ] 3.1  [FE] Wrap Table in React.memo
[ ] 3.2  [FE] Move timer to useTimer hook (persists across re-renders)
[ ] 3.3  [FE] Fix B-11: timer lost on re-render
[ ] 3.4  [FE] Fix B-8: isRevisionOverdue logic
[ ] 3.5  [FE] Add useCallback to Table event handlers
[ ] 3.6  [FE] Companies column: capitalize slug display
[ ] 3.7  [FE] Remove dead progress prop from FlashcardMode
```

### Phase 4: FlashcardMode Bulk Update
```
[ ] 4.1  [FE] Accumulate updates in FlashcardMode state
[ ] 4.2  [FE] Call bulkUpdateProgress on close
[ ] 4.3  [FE] Add loading state during bulk save
[ ] 4.4  [FE] Call fetchLightStats after bulk save
```

### Phase 5: Dead Code Cleanup
```
[ ] 5.1  [FE] Delete Filters.js
[ ] 5.2  [FE] Delete FocusMode.js
[ ] 5.3  [FE] Delete ListManager.js
[ ] 5.4  [FE] Delete empty context/ directory
[ ] 5.5  [FE] Implement or remove patterns/platforms/tags pages
[ ] 5.6  [FE] Remove isMockMode prop from Header
[ ] 5.7  [FE] Remove all unused imports
```

### Phase 6: Error Handling & UX Polish
```
[ ] 6.1  [FE] Add ErrorBoundary component
[ ] 6.2  [FE] Add skeleton loading for Table
[ ] 6.3  [FE] Add retry button on fetch error
[ ] 6.4  [FE] Handle 401 in apiClient — redirect to sign-in
[ ] 6.5  [FE] Add offline detection banner
[ ] 6.6  [FE] Add success toast on PATCH (configurable)
[ ] 6.7  [FE] Add aria-labels to all icon buttons
[ ] 6.8  [FE] Add per-page <title> and meta description
```

### Phase 7: Mock Server Hardening
```
[ ] 7.1  [MS] Add requestId middleware
[ ] 7.2  [MS] Add structured request logger
[ ] 7.3  [MS] Replace writeFileSync with async + debounced write
[ ] 7.4  [MS] Add atomic write (write to .tmp then rename)
[ ] 7.5  [MS] Add 404 for unknown questionId in PATCH
[ ] 7.6  [MS] Add payload size limit
[ ] 7.7  [MS] Add graceful shutdown
[ ] 7.8  [MS] Add GET /health endpoint
[ ] 7.9  [MS] Add startup orphan cleanup (progress for non-existent questions)
[ ] 7.10 [MS] Add rate limiting
```

### Phase 8: OpenAPI Contract Update
```
[ ] 8.1  [API] Add minLength/maxLength constraints
[ ] 8.2  [API] Add 404 responses to all /{id} paths
[ ] 8.3  [API] Standardize error envelope schema
[ ] 8.4  [API] Add GET /health endpoint spec
[ ] 8.5  [API] Add GET /questions/{id} endpoint spec
[ ] 8.6  [API] Add examples to all schemas
[ ] 8.7  [API] Add X-Request-ID header spec
```

### Phase 9: Testing
```
[ ] 9.1  [FE] Install Vitest + React Testing Library
[ ] 9.2  [FE] Test store actions
[ ] 9.3  [FE] Test apiClient.buildQueryString
[ ] 9.4  [MS] Install Jest in mock-server
[ ] 9.5  [MS] Test PATCH state machine (all 6 branches)
[ ] 9.6  [MS] Test analytics computation
```

### Phase 10: Java Backend Implementation
```
[ ] 10.1 [BE] Initialize Micronaut project with Gradle
[ ] 10.2 [BE] Set up PostgreSQL + Flyway migrations
[ ] 10.3 [BE] Generate JOOQ classes from schema
[ ] 10.4 [BE] Implement UserRepository + auth
[ ] 10.5 [BE] Implement QuestionRepository + QuestionController
[ ] 10.6 [BE] Implement ProgressRepository + ProgressService (full state machine)
[ ] 10.7 [BE] Implement SrsService
[ ] 10.8 [BE] Implement AnalyticsService with caching
[ ] 10.9 [BE] Implement GithubSyncJob
[ ] 10.10 [BE] Implement CompanyController
[ ] 10.11 [BE] Implement UtilityController (patterns/platforms/tags CRUD)
[ ] 10.12 [BE] Implement HealthController
[ ] 10.13 [BE] Write JUnit tests for ProgressService state machine
[ ] 10.14 [BE] Write Testcontainers integration tests
[ ] 10.15 [BE] Dockerize + write docker-compose.yml
[ ] 10.16 [BE] Deploy to OCI
```

### Phase 11: Documentation Update
```
[ ] 11.1 [DOCS] Update docs/07_known_issues after Phase 1-4 fixes
[ ] 11.2 [DOCS] Update docs/06_mock_server_guide after Phase 7
[ ] 11.3 [DOCS] Update docs/04_api_contract after Phase 8
[ ] 11.4 [DOCS] Add docs/08_backend_guide.md (Java Micronaut)
[ ] 11.5 [DOCS] Add docs/09_testing_guide.md
[ ] 11.6 [DOCS] Add docs/10_deployment_guide.md
[ ] 11.7 [DOCS] Update README with new make targets and docker-compose
```

---

## PART 10 — ARCHITECTURAL INVARIANTS (Never Break)

1. **Zero business logic in frontend** — all dates, SRS, data transforms in server
2. **OpenAPI contract is the source of truth** — update spec FIRST, then implement
3. **Tags are always arrays** — never strings anywhere in the stack
4. **Companies are `{name, slug, count}` objects** — never plain strings
5. **`updateProgress()` must apply server response** — not request payload
6. **Each PATCH must invalidate analytics cache** — no stale stats
7. **User data isolated by userId** — never return one user's data to another
8. **Atomic writes for persistence** — no partial file writes that corrupt state

---

## PART 11 — QUICK REFERENCE: BUGS BY FILE

| File | Bug IDs |
|------|---------|
| `page.js` | B-1, B-7, B-9, S-3 |
| `explore/page.js` | B-1 |
| `Table.js` | B-2, B-3, B-8, B-11, S-4, D-1 |
| `add/page.js` | B-4, S-3 |
| `ReflectionModal.js` | B-5 |
| `InitialSolveModal.js` | B-6 |
| `FlashcardMode.js` | B-10, D-dead-prop |
| `Header.js` | B-12, D-7 |
| `useAppStore.js` | B-7, B-9, D-6, P-2, P-5 |
| `apiClient.js` | S-1 |
| `mock-server/server.js` | P-4, MS-4.5 |
| `Filters.js` | D-1 (entire file unused) |
| `FocusMode.js` | D-2 (entire file unused) |
| `ListManager.js` | D-3 (entire file unused) |
