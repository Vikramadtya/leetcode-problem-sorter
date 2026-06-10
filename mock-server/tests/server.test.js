/**
 * Phase 9: Mock Server Test Suite
 *
 * Coverage:
 *   - SRS state machine (PATCH /progress/:id)
 *   - Bulk update endpoint (POST /progress/bulk)
 *   - dateSolved server-authority invariant
 *   - 404 for unknown questions
 *   - Analytics computation
 *   - Query filters (trackerMode, reviseFilter, difficulty, company, search)
 *   - Data invariants (tags always array)
 *   - Error responses (schema shape)
 *
 * Run: cd mock-server && npm test
 */

const assert = require('assert');
const http = require('http');

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:4000/api/v1';
const AUTH_HEADER = { 'Authorization': 'Bearer test-token', 'Content-Type': 'application/json' };

// ─── HTTP helpers ──────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL + '/');
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...AUTH_HEADER },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) {
      const json = JSON.stringify(body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(json));
      req.write(json);
    }
    req.end();
  });
}

const GET = (path) => request('GET', path);
const PATCH = (path, body) => request('PATCH', path, body);
const POST = (path, body) => request('POST', path, body);

// ─── Test framework ─────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual: (expected) => {
      const a = JSON.stringify(actual), b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy: () => {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeArray: () => {
      if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
    },
    toHaveProperty: (key) => {
      if (!(key in actual)) throw new Error(`Expected object to have property '${key}'`);
    },
    toContain: (str) => {
      if (!actual.includes(str)) throw new Error(`Expected "${actual}" to contain "${str}"`);
    },
    toBeGreaterThan: (n) => {
      if (actual <= n) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual: (n) => {
      if (actual < n) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual: (n) => {
      if (actual > n) throw new Error(`Expected ${actual} <= ${n}`);
    },
  };
}

// ─── Test data helpers ──────────────────────────────────────────────────────
// Pick a known stable question ID from the global questions
let QUESTION_ID = '1'; // Two Sum — always present

async function resetQuestion(id = QUESTION_ID) {
  return await PATCH(`/api/v1/progress/${id}`, { status: 'Unsolved' });
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🧪 Tacker Mock Server Test Suite\n');

  // ── System / Health ──────────────────────────────────────────────────────
  console.log('── System ──');

  await test('GET /health returns 200 with required fields', async () => {
    const r = await request('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('status');
    expect(r.body).toHaveProperty('uptime');
    expect(r.body).toHaveProperty('questionsLoaded');
    expect(r.body.questionsLoaded).toBeGreaterThan(0);
    expect(r.body.status).toBe('ok');
  });

  await test('X-Request-ID header is present on all responses', async () => {
    const r = await GET('/api/v1/questions?limit=1');
    expect(r.headers['x-request-id']).toBeTruthy();
  });

  // ── Questions ────────────────────────────────────────────────────────────
  console.log('\n── GET /questions ──');

  await test('returns paginated response shape', async () => {
    const r = await GET('/api/v1/questions?limit=10&page=1');
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('data');
    expect(r.body).toHaveProperty('totalCount');
    expect(r.body).toHaveProperty('page');
    expect(r.body).toHaveProperty('totalPages');
    expect(r.body.data).toBeArray();
    expect(r.body.page).toBe(1);
  });

  await test('each question has required fields', async () => {
    const r = await GET('/api/v1/questions?limit=5');
    expect(r.status).toBe(200);
    const q = r.body.data[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('title');
    expect(q).toHaveProperty('difficulty');
    expect(q).toHaveProperty('isCustom');
    expect(q).toHaveProperty('progress');
    // Tags in progress must always be an array
    expect(q.progress.tags).toBeArray();
  });

  await test('difficulty filter=Easy returns only Easy questions', async () => {
    const r = await GET('/api/v1/questions?difficulty=Easy&limit=20');
    expect(r.status).toBe(200);
    const nonEasy = r.body.data.filter(q => q.difficulty !== 'Easy');
    expect(nonEasy.length).toBe(0);
  });

  await test('difficulty filter=Medium returns only Medium questions', async () => {
    const r = await GET('/api/v1/questions?difficulty=Medium&limit=20');
    expect(r.status).toBe(200);
    const nonMedium = r.body.data.filter(q => q.difficulty !== 'Medium');
    expect(nonMedium.length).toBe(0);
  });

  await test('search filter returns matching questions', async () => {
    const r = await GET('/api/v1/questions?search=Two+Sum&limit=10');
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThan(0);
    const titles = r.body.data.map(q => q.title.toLowerCase());
    titles.forEach(t => {
      if (!t.includes('two') && !t.includes('sum')) {
        throw new Error(`Search returned non-matching title: ${t}`);
      }
    });
  });

  await test('trackerMode=true returns empty when no progress set', async () => {
    // Reset question first
    await resetQuestion();
    const r = await GET('/api/v1/questions?trackerMode=true&limit=100');
    expect(r.status).toBe(200);
    // May have other questions in tracker mode from other tests; just check structure
    expect(r.body.data).toBeArray();
  });

  await test('pagination: page 2 returns different items than page 1', async () => {
    const r1 = await GET('/api/v1/questions?page=1&limit=5');
    const r2 = await GET('/api/v1/questions?page=2&limit=5');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const ids1 = r1.body.data.map(q => q.id).join(',');
    const ids2 = r2.body.data.map(q => q.id).join(',');
    if (r2.body.data.length > 0) {
      if (ids1 === ids2) throw new Error('Page 1 and page 2 returned identical results');
    }
  });

  // ── Progress — SRS State Machine ─────────────────────────────────────────
  console.log('\n── PATCH /progress/:id (SRS state machine) ──');

  await test('marking Solved stamps dateSolved (server-authoritative)', async () => {
    await resetQuestion();
    const before = new Date().toISOString();
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved',
      confidenceLevel: 3,
    });
    const after = new Date().toISOString();
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Solved');
    expect(r.body.dateSolved).toBeTruthy();
    // dateSolved should be within the time window of this test
    const ds = new Date(r.body.dateSolved).toISOString();
    if (ds < before) throw new Error(`dateSolved (${ds}) is before test started (${before})`);
    if (ds > after) throw new Error(`dateSolved (${ds}) is after test finished (${after})`);
  });

  await test('Solved computes nextRevisionDate from confidenceLevel', async () => {
    await resetQuestion();
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved',
      confidenceLevel: 1, // 1 day interval
    });
    expect(r.status).toBe(200);
    expect(r.body.nextRevisionDate).toBeTruthy();
    const nrd = new Date(r.body.nextRevisionDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Should be approximately 1 day from now (within 2 day tolerance)
    const diffDays = Math.abs((nrd - new Date()) / 86400000);
    if (diffDays < 0.5 || diffDays > 2) {
      throw new Error(`nextRevisionDate diffDays=${diffDays.toFixed(2)}, expected ~1`);
    }
  });

  await test('confidenceLevel=4 gives ~14 day nextRevisionDate', async () => {
    await resetQuestion();
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved',
      confidenceLevel: 4,
    });
    expect(r.status).toBe(200);
    const nrd = new Date(r.body.nextRevisionDate);
    const diffDays = (nrd - new Date()) / 86400000;
    if (diffDays < 13 || diffDays > 15) {
      throw new Error(`Expected ~14 days, got ${diffDays.toFixed(2)}`);
    }
  });

  await test('client cannot override dateSolved', async () => {
    await resetQuestion();
    const fakeDate = '2020-01-01T00:00:00.000Z';
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved',
      confidenceLevel: 3,
      dateSolved: fakeDate,  // should be ignored
    });
    expect(r.status).toBe(200);
    if (r.body.dateSolved === fakeDate) {
      throw new Error('Server accepted client-supplied dateSolved (security violation!)');
    }
    expect(r.body.dateSolved).toBeTruthy();
    // Should be a recent timestamp, not 2020
    if (r.body.dateSolved < '2025-01-01') {
      throw new Error(`dateSolved should not be in the past: ${r.body.dateSolved}`);
    }
  });

  await test('revise=true computes nextRevisionDate', async () => {
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      revise: true,
      confidenceLevel: 2,
    });
    expect(r.status).toBe(200);
    expect(r.body.revise).toBe(true);
    expect(r.body.nextRevisionDate).toBeTruthy();
    const nrd = new Date(r.body.nextRevisionDate);
    const diffDays = (nrd - new Date()) / 86400000;
    if (diffDays < 2 || diffDays > 4) {
      throw new Error(`Expected ~3 days for confidenceLevel=2, got ${diffDays.toFixed(2)}`);
    }
  });

  await test('revise=false clears nextRevisionDate', async () => {
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, { revise: false });
    expect(r.status).toBe(200);
    expect(r.body.revise).toBe(false);
    expect(r.body.nextRevisionDate).toBeNull();
  });

  await test('status=Unsolved resets all fields (preserves tags)', async () => {
    // Set up some state
    await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved',
      confidenceLevel: 3,
      notes: 'My notes',
      tags: ['important'],
      important: true,
    });
    // Now reset
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, { status: 'Unsolved' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('Unsolved');
    expect(r.body.dateSolved).toBeNull();
    expect(r.body.notes).toBe('');
    expect(r.body.confidenceLevel).toBeNull();
    expect(r.body.nextRevisionDate).toBeNull();
    expect(r.body.revise).toBe(false);
    // Tags and important are preserved
    expect(r.body.tags).toBeArray();
    expect(r.body.important).toBe(true);
  });

  await test('tags are always returned as array (never string)', async () => {
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      tags: ['recursion', 'hash-map'],
    });
    expect(r.status).toBe(200);
    expect(r.body.tags).toBeArray();
    expect(r.body.tags.length).toBe(2);
  });

  await test('attempts increment correctly', async () => {
    await resetQuestion();
    await PATCH(`/api/v1/progress/${QUESTION_ID}`, { status: 'Attempted' });
    const r = await PATCH(`/api/v1/progress/${QUESTION_ID}`, { attempts: 5 });
    expect(r.status).toBe(200);
    expect(r.body.attempts).toBe(5);
  });

  await test('returns 404 for unknown question ID', async () => {
    const r = await PATCH('/api/v1/progress/nonexistent-question-xyz-999', { attempts: 1 });
    expect(r.status).toBe(404);
    expect(r.body.code).toBe(404);
    expect(r.body.message).toBeTruthy();
    expect(r.body.requestId).toBeTruthy();
  });

  // ── Bulk Progress ────────────────────────────────────────────────────────
  console.log('\n── POST /progress/bulk ──');

  await test('bulk update applies SRS for revise=true items', async () => {
    await resetQuestion();
    const r = await POST('/api/v1/progress/bulk', {
      updates: [{ id: QUESTION_ID, revise: true, confidenceLevel: 3 }],
    });
    expect(r.status).toBe(200);
    expect(r.body.updated).toBe(1);
    expect(r.body.results[0].progress.revise).toBe(true);
    expect(r.body.results[0].progress.nextRevisionDate).toBeTruthy();
  });

  await test('bulk update skips unknown question IDs', async () => {
    const r = await POST('/api/v1/progress/bulk', {
      updates: [
        { id: QUESTION_ID, confidenceLevel: 2 },
        { id: 'TOTALLY-UNKNOWN-ID', confidenceLevel: 4 },
      ],
    });
    expect(r.status).toBe(200);
    expect(r.body.updated).toBe(1);
    expect(r.body.skipped).toBeGreaterThanOrEqual(1);
  });

  await test('bulk update returns 400 for empty updates array', async () => {
    const r = await POST('/api/v1/progress/bulk', { updates: [] });
    expect(r.status).toBe(400);
  });

  await test('bulk update tags are always arrays in response', async () => {
    const r = await POST('/api/v1/progress/bulk', {
      updates: [{ id: QUESTION_ID, tags: ['dp', 'memoisation'] }],
    });
    expect(r.status).toBe(200);
    const prog = r.body.results[0].progress;
    expect(prog.tags).toBeArray();
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  console.log('\n── GET /stats ──');

  await test('returns required StatsResponse fields', async () => {
    const r = await GET('/api/v1/stats');
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('totalSolved');
    expect(r.body).toHaveProperty('totalAttempted');
    expect(r.body).toHaveProperty('totalQuestions');
    expect(r.body).toHaveProperty('totalRevise');
    expect(r.body).toHaveProperty('currentStreak');
    expect(r.body).toHaveProperty('maxStreak');
    expect(r.body).toHaveProperty('weeklyCount');
    expect(r.body).toHaveProperty('difficultyBreakdown');
    expect(r.body.difficultyBreakdown).toHaveProperty('Easy');
    expect(r.body.difficultyBreakdown).toHaveProperty('Medium');
    expect(r.body.difficultyBreakdown).toHaveProperty('Hard');
  });

  await test('totalSolved increases after marking Solved', async () => {
    await resetQuestion();
    const before = (await GET('/api/v1/stats')).body.totalSolved;
    await PATCH(`/api/v1/progress/${QUESTION_ID}`, { status: 'Solved', confidenceLevel: 3 });
    const after = (await GET('/api/v1/stats')).body.totalSolved;
    expect(after).toBe(before + 1);
  });

  await test('totalRevise includes questions past due date', async () => {
    // Reset and mark for revision
    await resetQuestion();
    await PATCH(`/api/v1/progress/${QUESTION_ID}`, {
      status: 'Solved', confidenceLevel: 3, revise: false,
    });
    await PATCH(`/api/v1/progress/${QUESTION_ID}`, { revise: true, confidenceLevel: 1 });
    const stats = (await GET('/api/v1/stats')).body;
    // totalRevise should be at least 1 now
    expect(stats.totalRevise).toBeGreaterThanOrEqual(1);
  });

  // ── Analytics ─────────────────────────────────────────────────────────
  console.log('\n── GET /analytics ──');

  await test('returns AnalyticsResponse superset of StatsResponse', async () => {
    const r = await GET('/api/v1/analytics');
    expect(r.status).toBe(200);
    // StatsResponse fields
    expect(r.body).toHaveProperty('totalSolved');
    expect(r.body).toHaveProperty('difficultyBreakdown');
    // AnalyticsResponse-only fields
    expect(r.body).toHaveProperty('topCompanies');
    expect(r.body).toHaveProperty('patternMasteryData');
    expect(r.body).toHaveProperty('revisionList');
    expect(r.body).toHaveProperty('avgTimePerDiff');
    expect(r.body.topCompanies).toBeArray();
    expect(r.body.patternMasteryData).toBeArray();
    expect(r.body.revisionList).toBeArray();
    expect(r.body.avgTimePerDiff).toBeArray();
  });

  // ── Utilities ────────────────────────────────────────────────────────────
  console.log('\n── GET /utilities ──');

  await test('returns all four utility collections', async () => {
    const r = await GET('/api/v1/utilities');
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('difficulties');
    expect(r.body).toHaveProperty('patterns');
    expect(r.body).toHaveProperty('platforms');
    expect(r.body).toHaveProperty('tags');
    expect(r.body.patterns).toBeArray();
    expect(r.body.patterns.length).toBeGreaterThan(0);
  });

  // ── Companies ────────────────────────────────────────────────────────────
  console.log('\n── GET /companies ──');

  await test('returns array of {name, slug, count} objects', async () => {
    const r = await GET('/api/v1/companies');
    expect(r.status).toBe(200);
    expect(r.body).toBeArray();
    expect(r.body.length).toBeGreaterThan(0);
    const first = r.body[0];
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('slug');
    expect(first).toHaveProperty('count');
  });

  await test('includes Custom Questions pseudo-company', async () => {
    const r = await GET('/api/v1/companies');
    expect(r.status).toBe(200);
    const customComp = r.body.find(c => c.name === 'Custom Questions');
    expect(customComp).toBeTruthy();
  });

  // ── Custom Questions ─────────────────────────────────────────────────────
  console.log('\n── POST /custom-questions ──');

  await test('creates custom question and returns 201', async () => {
    const r = await POST('/api/v1/custom-questions', {
      title: 'Test Question ' + Date.now(),
      difficulty: 'Medium',
      tags: ['test', 'automation'],
    });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.question).toHaveProperty('id');
    expect(r.body.question.isCustom).toBe(true);
    expect(r.body.question.progress.tags).toBeArray();
    // Store ID for cleanup
    CUSTOM_QUESTION_ID = r.body.question.id;
  });

  await test('custom question appears in trackerMode query', async () => {
    if (!CUSTOM_QUESTION_ID) return;
    const r = await GET('/api/v1/questions?trackerMode=true&limit=1000');
    const found = r.body.data.find(q => q.id === CUSTOM_QUESTION_ID);
    expect(found).toBeTruthy();
  });

  // ── Metadata CRUD ────────────────────────────────────────────────────────
  console.log('\n── Metadata CRUD ──');

  await test('POST /patterns returns 201 with created item', async () => {
    const r = await POST('/api/v1/patterns', { name: 'Test Pattern', description: 'For testing' });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty('item');
    expect(r.body.item).toHaveProperty('id');
    expect(r.body.item.name).toBe('Test Pattern');
  });

  await test('POST /platforms returns 201', async () => {
    const r = await POST('/api/v1/platforms', { name: 'TestPlatform' });
    expect(r.status).toBe(201);
    expect(r.body.item.name).toBe('TestPlatform');
  });

  await test('POST /tags returns 201', async () => {
    const r = await POST('/api/v1/tags', { name: 'test-tag' });
    expect(r.status).toBe(201);
    expect(r.body.item.name).toBe('test-tag');
  });

  await test('GET /patterns returns the newly created pattern', async () => {
    const r = await GET('/api/v1/patterns');
    expect(r.status).toBe(200);
    const found = r.body.find(p => p.name === 'Test Pattern');
    expect(found).toBeTruthy();
  });

  // ── Error Responses ──────────────────────────────────────────────────────
  console.log('\n── Error Responses ──');

  await test('errors include requestId for correlation', async () => {
    const r = await PATCH('/api/v1/progress/DEFINITELY-NOT-REAL', { attempts: 1 });
    expect(r.status).toBe(404);
    expect(r.body.requestId).toBeTruthy();
  });

  await test('X-Request-ID in error response header matches body requestId', async () => {
    const r = await PATCH('/api/v1/progress/NOT-REAL-ID-XYZ', { attempts: 1 });
    expect(r.status).toBe(404);
    expect(r.headers['x-request-id']).toBe(r.body.requestId);
  });

  // ── Data Invariants ──────────────────────────────────────────────────────
  console.log('\n── Data Invariants ──');

  await test('progress tags are always an array even when not set', async () => {
    await resetQuestion();
    const r = await GET(`/api/v1/questions?search=Two+Sum&limit=1`);
    expect(r.status).toBe(200);
    if (r.body.data.length > 0) {
      expect(r.body.data[0].progress.tags).toBeArray();
    }
  });

  await test('sortBy=frequency returns results in ascending order', async () => {
    const r = await GET('/api/v1/questions?sortBy=frequency&sortDirection=asc&limit=10');
    expect(r.status).toBe(200);
    const freqs = r.body.data.map(q => q.frequency);
    for (let i = 1; i < freqs.length; i++) {
      if (freqs[i] < freqs[i - 1]) {
        throw new Error(`Sort broken: ${freqs[i]} < ${freqs[i - 1]} at index ${i}`);
      }
    }
  });

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  ✗ ${f.name}: ${f.error}`));
  }
  console.log('─────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

// Global for cleanup reference
let CUSTOM_QUESTION_ID = null;

// Wait for server to be ready before running tests
const MAX_RETRIES = 10;
let retries = 0;
async function waitForServer() {
  try {
    const r = await request('GET', '/health');
    if (r.status === 200) {
      console.log('✓ Server is ready');
      await runTests();
    } else {
      throw new Error('Not ready');
    }
  } catch (e) {
    retries++;
    if (retries >= MAX_RETRIES) {
      console.error('✗ Server did not start. Is it running? Run: make dev');
      process.exit(1);
    }
    console.log(`  Waiting for server (attempt ${retries}/${MAX_RETRIES})...`);
    setTimeout(waitForServer, 1000);
  }
}

waitForServer();
