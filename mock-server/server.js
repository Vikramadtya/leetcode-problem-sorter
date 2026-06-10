const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const OpenApiValidator = require('express-openapi-validator');

const PORT = process.env.PORT || 4000;
const app = express();

// ─── Security / Request Hygiene ──────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '1mb' })); // MS-4.6: limit payload size

// MS-3.1: Attach requestId to every request
app.use((req, _res, next) => {
  req.requestId = randomUUID();
  next();
});

// MS-3.2: Structured request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${level}] ${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${ms}ms reqId=${req.requestId}`);
  });
  next();
});

app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '../api-contract/openapi.yaml'),
    validateRequests: true,
    validateResponses: false,
  })
);

// ============================================================
// DATA PATHS
// ============================================================
const GLOBAL_DATA_PATH = path.join(__dirname, 'data', 'global_questions.json');
const PROGRESS_DATA_PATH = path.join(__dirname, 'data', 'user_progress.json');

// ============================================================
// IN-MEMORY INDEXES  (built once at startup, O(1) lookups)
// ============================================================
// Main question store — Map<id, Question>
let questionMap = new Map();
// Sorted question list (by numeric id) for stable ordering
let questionList = [];
// Company → Set of question IDs
let companyIndex = new Map();
// Difficulty (lowercase) → Set of question IDs
let difficultyIndex = new Map(['easy', 'medium', 'hard'].map(d => [d, new Set()]));
// User progress — Map<questionId, ProgressRecord>
let progressMap = new Map();

// ============================================================
// ANALYTICS CACHE  (invalidated on every PATCH)
// ============================================================
let analyticsCache = null; // null = dirty / needs recompute

// ============================================================
// METADATA (patterns, platforms, tags)
// ============================================================
let patternsData = [
  { id: 'pat-1',  name: 'Two Pointers',       description: 'Two pointers iterating through data structures.' },
  { id: 'pat-2',  name: 'Sliding Window',      description: 'Contiguous subarray/substring optimisation.' },
  { id: 'pat-3',  name: 'Dynamic Programming', description: 'Memoisation and optimal substructure.' },
  { id: 'pat-4',  name: 'BFS / DFS',           description: 'Graph and tree traversal.' },
  { id: 'pat-5',  name: 'Binary Search',       description: 'Search in a sorted/monotonic space.' },
  { id: 'pat-6',  name: 'Backtracking',        description: 'Explore all possibilities and prune.' },
  { id: 'pat-7',  name: 'Heap / Priority Queue', description: 'Efficient min/max retrieval.' },
  { id: 'pat-8',  name: 'Greedy',              description: 'Locally optimal choices.' },
  { id: 'pat-9',  name: 'Union Find',          description: 'Disjoint set / connected components.' },
  { id: 'pat-10', name: 'Trie',                description: 'Prefix tree for string problems.' },
  { id: 'pat-11', name: 'Monotonic Stack',     description: 'Next greater/smaller element problems.' },
  { id: 'pat-12', name: 'Fast & Slow Pointers', description: 'Cycle detection in linked lists.' },
];

let platformsData = [
  { id: 'plat-1', name: 'LeetCode',   description: 'Popular competitive programming platform.' },
  { id: 'plat-2', name: 'HackerRank', description: 'Common for online assessments.' },
  { id: 'plat-3', name: 'Codeforces', description: 'Competitive programming contests.' },
];

let tagsData = [
  { id: 'tag-1', name: 'Array',       description: '' },
  { id: 'tag-2', name: 'String',      description: '' },
  { id: 'tag-3', name: 'Graph',       description: '' },
  { id: 'tag-4', name: 'Tree',        description: '' },
  { id: 'tag-5', name: 'Math',        description: '' },
  { id: 'tag-6', name: 'Hash Map',    description: '' },
  { id: 'tag-7', name: 'Recursion',   description: '' },
  { id: 'tag-8', name: 'Bit Masking', description: '' },
];

// ============================================================
// SRS INTERVALS  (Spaced Repetition)
// ============================================================
const SRS_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14 };

function calcNextRevisionDate(confidenceLevel) {
  const days = SRS_INTERVALS[Math.max(1, Math.min(4, confidenceLevel || 3))];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ============================================================
// DATA LOADING & INDEX BUILDING
// ============================================================
function loadGlobalQuestions() {
  try {
    const raw = JSON.parse(fs.readFileSync(GLOBAL_DATA_PATH, 'utf8'));
    questionMap.clear();
    companyIndex.clear();
    ['easy', 'medium', 'hard'].forEach(d => difficultyIndex.set(d, new Set()));

    Object.values(raw).forEach(q => {
      const id = String(q.ID || q.id);
      const difficulty = (q.Difficulty || q.difficulty || 'Medium');
      const diffLower = difficulty.toLowerCase();
      const freqRaw = q['Frequency %'] || q.frequency || '0';
      const frequency = parseFloat(freqRaw) || 0;
      const companies = (q.companies || []).map(c => String(c).toLowerCase().trim()).filter(Boolean);

      const question = {
        id,
        title: q.Title || q.title || '',
        titleLower: (q.Title || q.title || '').toLowerCase(),
        url: q['Leetcode Question Link'] || q.URL || q.url || '',
        difficulty,
        diffLower,
        acceptanceRate: q['Acceptance %'] || q.acceptanceRate || '-',
        frequency,
        companies,      // array of lowercase slugs
        isCustom: false,
      };

      questionMap.set(id, question);

      // Difficulty index
      if (difficultyIndex.has(diffLower)) {
        difficultyIndex.get(diffLower).add(id);
      }

      // Company index
      companies.forEach(c => {
        if (!companyIndex.has(c)) companyIndex.set(c, new Set());
        companyIndex.get(c).add(id);
      });
    });

    // Build sorted list (numeric id ascending, custom at end)
    questionList = Array.from(questionMap.values()).sort((a, b) => {
      const na = parseInt(a.id), nb = parseInt(b.id);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.id.localeCompare(b.id);
    });

    console.log(`✓ Loaded ${questionMap.size} questions | ${companyIndex.size} companies indexed`);
  } catch (err) {
    console.error('✗ Failed to load global questions:', err.message);
  }
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_DATA_PATH)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_DATA_PATH, 'utf8'));
      progressMap.clear();
      Object.entries(raw).forEach(([id, p]) => {
        // Normalise legacy comma-string tags → array
        if (typeof p.tags === 'string') {
          p.tags = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        }
        if (!Array.isArray(p.tags)) p.tags = [];
        progressMap.set(id, p);
      });
      console.log(`✓ Loaded progress for ${progressMap.size} questions`);
    }
  } catch (err) {
    console.error('✗ Failed to load progress:', err.message);
  }
}

// MS-1.1 + MS-1.2 + MS-5.3: Async debounced write with atomic rename
let _saveTimer = null;
function saveProgress() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const obj = Object.fromEntries(progressMap);
    const tmp = PROGRESS_DATA_PATH + '.tmp';
    fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8', (err) => {
      if (err) { console.error('✗ Failed to write progress tmp:', err.message); return; }
      fs.rename(tmp, PROGRESS_DATA_PATH, (err2) => {
        if (err2) console.error('✗ Failed to rename progress file:', err2.message);
      });
    });
  }, 500); // batch writes within 500ms window
}

function invalidateAnalyticsCache() {
  analyticsCache = null;
}

// Helper: get progress or default
function getProgress(id) {
  return progressMap.get(id) || { status: 'Unsolved', attempts: 0, tags: [] };
}

// Helper: format question for API response
function formatQuestion(q, progress) {
  return {
    id: q.id,
    title: q.title,
    url: q.url,
    difficulty: q.difficulty,
    acceptanceRate: q.acceptanceRate,
    frequency: q.frequency,
    companies: q.companies,
    isCustom: q.isCustom,
    progress: formatProgress(progress),
  };
}

function formatProgress(p) {
  return {
    status: p.status || 'Unsolved',
    dateSolved: p.dateSolved || null,
    confidenceLevel: p.confidenceLevel || null,
    nextRevisionDate: p.nextRevisionDate || null,
    revise: p.revise || false,
    attempts: p.attempts || 0,
    timeSpent: p.timeSpent || 0,
    notes: p.notes || '',
    tags: Array.isArray(p.tags) ? p.tags : [],
    pattern: p.pattern || '',
    solutionLink: p.solutionLink || '',
    important: p.important || false,
  };
}



// ============================================================
// GET /api/v1/questions  —  O(n) with index assists
// ============================================================
app.get('/api/v1/questions', (req, res) => {
  const p = req.query;

  // --- Start from full list or pre-filtered by company/difficulty ---
  let candidateIds = null; // null = all

  if (p.company && p.company !== 'all') {
    const slug = p.company.toLowerCase().trim();
    if (slug === 'custom questions') {
      candidateIds = new Set(
        questionList.filter(q => q.isCustom).map(q => q.id)
      );
    } else {
      candidateIds = companyIndex.get(slug) || new Set();
    }
  }

  if (p.difficulty && p.difficulty !== 'all') {
    const diffSlug = p.difficulty.toLowerCase();
    const diffIds = difficultyIndex.get(diffSlug) || new Set();
    candidateIds = candidateIds
      ? new Set([...candidateIds].filter(id => diffIds.has(id)))
      : diffIds;
  }

  // Walk questions
  const source = candidateIds
    ? Array.from(candidateIds).map(id => questionMap.get(id)).filter(Boolean)
    : questionList;

  const now = new Date();
  const results = [];

  for (const q of source) {
    const prog = getProgress(q.id);
    const status = prog.status || 'Unsolved';
    const isSolved = status === 'Solved';
    const isAttempted = status === 'Attempted';
    const hasEngaged = isSolved || isAttempted || prog.important || prog.revise || (prog.attempts > 0);

    // trackerMode: only engaged questions
    if (p.trackerMode === 'true' && !q.isCustom && !hasEngaged) continue;

    // text search — already O(n) so keep simple
    if (p.search) {
      const s = p.search.toLowerCase();
      if (!q.titleLower.includes(s) && !q.id.includes(s)) continue;
    }

    // status filter
    if (p.status && p.status !== 'all' && status !== p.status) continue;

    // tag filter
    if (p.tag) {
      const tagLower = p.tag.toLowerCase();
      const tags = Array.isArray(prog.tags) ? prog.tags : [];
      if (!tags.some(t => t.toLowerCase().includes(tagLower))) continue;
    }

    // pattern filter
    if (p.pattern && p.pattern !== 'all') {
      const ptn = (prog.pattern || '').toLowerCase();
      if (ptn !== p.pattern.toLowerCase()) continue;
    }

    // hideSolved
    if (p.hideSolved === 'true' && isSolved) continue;

    // starredOnly
    if (p.starredOnly === 'true' && !prog.important) continue;

    // reviseFilter
    if (p.reviseFilter === 'true') {
      const isDue = prog.nextRevisionDate && new Date(prog.nextRevisionDate) <= now;
      if (!prog.revise && !isDue) continue;
    }

    results.push(formatQuestion(q, prog));
  }

  // --- Sorting ---
  if (p.sortBy) {
    const dir = p.sortDirection === 'desc' ? -1 : 1;
    const PROGRESS_FIELDS = new Set(['status', 'attempts', 'confidenceLevel', 'timeSpent', 'dateSolved', 'revise', 'important', 'nextRevisionDate']);
    const DIFF_ORDER = { easy: 1, medium: 2, hard: 3 };

    results.sort((a, b) => {
      let va = PROGRESS_FIELDS.has(p.sortBy) ? a.progress[p.sortBy] : a[p.sortBy];
      let vb = PROGRESS_FIELDS.has(p.sortBy) ? b.progress[p.sortBy] : b[p.sortBy];

      if (p.sortBy === 'difficulty') {
        va = DIFF_ORDER[(va || '').toLowerCase()] || 0;
        vb = DIFF_ORDER[(vb || '').toLowerCase()] || 0;
      } else if (p.sortBy === 'id') {
        va = parseInt(va) || 0;
        vb = parseInt(vb) || 0;
      }

      if (va == null || va === '') return 1 * dir;
      if (vb == null || vb === '') return -1 * dir;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  // --- Pagination ---
  const page = Math.max(1, parseInt(p.page) || 1);
  const limit = Math.min(5000, parseInt(p.limit) || 50);
  const totalCount = results.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginated = results.slice((page - 1) * limit, page * limit);

  res.json({ data: paginated, totalCount, page, totalPages });
});

// ============================================================
// GET /api/v1/progress/:id   — single question progress
// ============================================================
app.get('/api/v1/progress/:id', (req, res) => {
  const prog = getProgress(req.params.id);
  res.json(formatProgress(prog));
});

// ============================================================
// PATCH /api/v1/progress/:id  — ALL business logic here
// ============================================================
app.patch('/api/v1/progress/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;

  // MS-4.5: Return 404 if question doesn't exist (custom or global)
  if (!questionMap.has(id)) {
    return res.status(404).json({ code: 404, message: `Question ${id} not found`, requestId: req.requestId });
  }

  const existing = progressMap.get(id) || {};


  let newProgress;

  if (updates.status === 'Unsolved') {
    // Full reset — preserve tags & starred
    newProgress = {
      status: 'Unsolved',
      dateSolved: null,
      confidenceLevel: null,
      nextRevisionDate: null,
      revise: false,
      attempts: 0,
      timeSpent: existing.timeSpent || 0,
      notes: '',
      tags: existing.tags || [],
      pattern: '',
      solutionLink: '',
      important: existing.important || false,
    };
  } else if (updates.status === 'Solved') {
    const dateSolved = updates.dateSolved || existing.dateSolved || new Date().toISOString();
    const confidenceLevel = updates.confidenceLevel || existing.confidenceLevel || 3;
    const nextRevisionDate = updates.nextRevisionDate || calcNextRevisionDate(confidenceLevel);
    const tags = normalizeTags(updates.tags, existing.tags);
    newProgress = {
      ...existing,
      ...updates,
      status: 'Solved',
      dateSolved,
      confidenceLevel,
      nextRevisionDate,
      revise: existing.revise || false,
      attempts: updates.attempts || Math.max(existing.attempts || 0, 1),
      tags,
    };
  } else if (updates.revise === true) {
    const confidenceLevel = updates.confidenceLevel || existing.confidenceLevel || 3;
    const nextRevisionDate = updates.nextRevisionDate || calcNextRevisionDate(confidenceLevel);
    const tags = normalizeTags(updates.tags, existing.tags);
    newProgress = { ...existing, ...updates, revise: true, nextRevisionDate, tags };
  } else if (updates.revise === false) {
    const tags = normalizeTags(updates.tags, existing.tags);
    newProgress = { ...existing, ...updates, revise: false, nextRevisionDate: null, tags };
  } else if (updates.confidenceLevel !== undefined && existing.revise) {
    // Re-schedule when confidence changes during active revision
    const tags = normalizeTags(updates.tags, existing.tags);
    newProgress = { ...existing, ...updates, nextRevisionDate: calcNextRevisionDate(updates.confidenceLevel), tags };
  } else {
    const tags = normalizeTags(updates.tags, existing.tags);
    newProgress = { ...existing, ...updates, tags };
  }

  progressMap.set(id, newProgress);
  invalidateAnalyticsCache();
  saveProgress();

  res.json(formatProgress(newProgress));
});

// ============================================================
// POST /api/v1/progress/bulk  — batch update (flashcard mode)
// ============================================================
app.post('/api/v1/progress/bulk', (req, res) => {
  const { updates } = req.body; // [{ id, ...fields }]
  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: 'updates must be an array' });
  }

  const results = [];
  for (const { id, ...fields } of updates) {
    if (!id) continue;
    const existing = progressMap.get(id) || {};
    const merged = { ...existing, ...fields };
    if (Array.isArray(fields.tags)) merged.tags = fields.tags;
    else if (typeof fields.tags === 'string') merged.tags = fields.tags.split(',').map(t => t.trim()).filter(Boolean);
    progressMap.set(id, merged);
    results.push({ id, progress: formatProgress(merged) });
  }

  invalidateAnalyticsCache();
  saveProgress();
  res.json({ updated: results.length, results });
});

// ============================================================
// GET /api/v1/stats  — lightweight stats for StatsBar/streak
// ============================================================
app.get('/api/v1/stats', (req, res) => {
  const cached = getOrComputeAnalytics();
  res.json({
    totalSolved: cached.totalSolved,
    totalAttempted: cached.totalAttempted,
    totalQuestions: cached.totalQuestions,
    totalRevise: cached.totalRevise,
    currentStreak: cached.currentStreak,
    maxStreak: cached.maxStreak,
    weeklyCount: cached.weeklyCount,
    activityTimeline: cached.activityTimeline,
    difficultyBreakdown: cached.difficultyBreakdown,
  });
});

// ============================================================
// GET /api/v1/analytics  — full analytics (Dashboard)
// ============================================================
app.get('/api/v1/analytics', (req, res) => {
  res.json(getOrComputeAnalytics());
});

// ============================================================
// ANALYTICS COMPUTATION (cached)
// ============================================================
function getOrComputeAnalytics() {
  if (analyticsCache) return analyticsCache;

  let totalSolved = 0;
  let totalAttempted = 0;
  let totalRevise = 0;
  const totalQuestions = questionMap.size;
  const now = new Date();

  const diffs = { Easy: 0, Medium: 0, Hard: 0 };
  const revList = [];
  const activityTimeline = {}; // { "2025-06-01": 3 }
  const companyCounts = {};
  const patternCounts = {};  // pattern → { solved, total }
  const timeByDiff = { easy: { sum: 0, count: 0 }, medium: { sum: 0, count: 0 }, hard: { sum: 0, count: 0 } };

  for (const [id, p] of progressMap) {
    const q = questionMap.get(id);
    if (!q) continue;

    const status = p.status || 'Unsolved';
    const isSolved = status === 'Solved';
    const isAttempted = status === 'Attempted';

    if (isSolved) {
      totalSolved++;
      const diffKey = q.difficulty; // 'Easy' | 'Medium' | 'Hard'
      if (diffs[diffKey] !== undefined) diffs[diffKey]++;

      // Activity heatmap
      if (p.dateSolved) {
        const ds = new Date(p.dateSolved);
        if (!isNaN(ds)) {
          const dateStr = ds.toISOString().split('T')[0];
          activityTimeline[dateStr] = (activityTimeline[dateStr] || 0) + 1;
        }
      }

      // Company coverage
      q.companies.forEach(c => {
        companyCounts[c] = (companyCounts[c] || 0) + 1;
      });

      // Time per difficulty (stored in seconds, convert to minutes)
      if (p.timeSpent && p.timeSpent > 0) {
        const diffLow = q.diffLower;
        if (timeByDiff[diffLow]) {
          timeByDiff[diffLow].sum += p.timeSpent;
          timeByDiff[diffLow].count++;
        }
      }

      // Pattern mastery
      if (p.pattern) {
        if (!patternCounts[p.pattern]) patternCounts[p.pattern] = { solved: 0, total: 0 };
        patternCounts[p.pattern].solved++;
        patternCounts[p.pattern].total++;
      }
    } else if (isAttempted) {
      totalAttempted++;
    }

    // Revision queue
    const isDue = p.nextRevisionDate && new Date(p.nextRevisionDate) <= now;
    if (p.revise || isDue) {
      totalRevise++;
      revList.push({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        nextRevisionDate: p.nextRevisionDate || null,
      });
    }
  }

  // --- Streak calculation ---
  const sortedDates = Object.keys(activityTimeline).sort();
  let currentStreak = 0, maxStreak = 0;

  if (sortedDates.length > 0) {
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.round((new Date(sortedDates[i]) - new Date(sortedDates[i - 1])) / 86400000);
      if (diff === 1) streak++;
      else if (diff > 1) { if (streak > maxStreak) maxStreak = streak; streak = 1; }
    }
    if (streak > maxStreak) maxStreak = streak;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate === todayStr || lastDate === yesterStr) {
      currentStreak = 1;
      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const diff = Math.round((new Date(sortedDates[i + 1]) - new Date(sortedDates[i])) / 86400000);
        if (diff === 1) currentStreak++;
        else break;
      }
    }
  }

  // Weekly count
  const sevenAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weeklyCount = Object.entries(activityTimeline)
    .filter(([d]) => d >= sevenAgoStr)
    .reduce((s, [, c]) => s + c, 0);

  // Top companies
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // Avg time per difficulty (minutes)
  const avgTimePerDiff = ['Easy', 'Medium', 'Hard'].map(d => ({
    name: d,
    avgMinutes: timeByDiff[d.toLowerCase()].count
      ? Math.round(timeByDiff[d.toLowerCase()].sum / 60 / timeByDiff[d.toLowerCase()].count)
      : 0,
  }));

  // Pattern mastery (solved / total attempted × 100)
  const patternMasteryData = Object.entries(patternCounts)
    .map(([name, { solved, total }]) => ({
      name,
      solved,
      score: total > 0 ? Math.round((solved / total) * 100) : 0,
    }))
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 10);

  analyticsCache = {
    totalSolved,
    totalAttempted,
    totalQuestions,
    totalRevise,
    currentStreak,
    maxStreak,
    weeklyCount,
    activityTimeline,
    difficultyBreakdown: diffs,
    topCompanies,
    platformsBreakdown: [{ name: 'LeetCode', count: totalSolved }],
    avgTimePerDiff,
    patternMasteryData,
    revisionList: revList.sort((a, b) => {
      if (!a.nextRevisionDate) return 1;
      if (!b.nextRevisionDate) return -1;
      return new Date(a.nextRevisionDate) - new Date(b.nextRevisionDate);
    }).slice(0, 20),
  };

  return analyticsCache;
}

// ============================================================
// GET /api/v1/utilities
// ============================================================
app.get('/api/v1/utilities', (req, res) => {
  res.json({
    difficulties: [
      { id: 'diff-1', name: 'Easy' },
      { id: 'diff-2', name: 'Medium' },
      { id: 'diff-3', name: 'Hard' },
    ],
    platforms: platformsData,
    patterns: patternsData,
    tags: tagsData,
  });
});

// ============================================================
// GET /api/v1/companies  — sorted by question count
// ============================================================
app.get('/api/v1/companies', (req, res) => {
  const companies = Array.from(companyIndex.entries())
    .map(([name, ids]) => ({ name, slug: name, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Add custom questions pseudo-company
  const customCount = questionList.filter(q => q.isCustom).length;
  const result = [
    { name: 'Custom Questions', slug: 'custom questions', count: customCount },
    ...companies,
  ];

  res.json(result);
});

// ============================================================
// POST /api/v1/custom-questions
// ============================================================
app.post('/api/v1/custom-questions', (req, res) => {
  const id = req.body.id || 'custom-' + Date.now();
  const difficulty = req.body.difficulty || 'Medium';
  const diffLower = difficulty.toLowerCase();

  const customQ = {
    id,
    title: req.body.title,
    titleLower: req.body.title.toLowerCase(),
    url: req.body.link || '',
    difficulty,
    diffLower,
    acceptanceRate: '-',
    frequency: 0,
    companies: [],
    isCustom: true,
  };

  questionMap.set(id, customQ);
  questionList.push(customQ);
  if (difficultyIndex.has(diffLower)) difficultyIndex.get(diffLower).add(id);

  const confidenceLevel = req.body.confidenceLevel || null;
  const isSolved = !!confidenceLevel;
  const tags = normalizeTags(req.body.tags);

  const progress = {
    status: isSolved ? 'Solved' : 'Attempted',
    dateSolved: isSolved ? new Date().toISOString() : null,
    confidenceLevel,
    nextRevisionDate: confidenceLevel ? calcNextRevisionDate(confidenceLevel) : null,
    attempts: 1,
    timeSpent: (req.body.timeTaken || 0) * 60, // minutes → seconds
    notes: '',
    tags,
    pattern: req.body.pattern || '',
    solutionLink: '',
    important: false,
    revise: false,
  };

  progressMap.set(id, progress);
  invalidateAnalyticsCache();
  saveProgress();

  res.json({ success: true, question: formatQuestion(customQ, progress) });
});

// ============================================================
// METADATA ROUTES  (patterns, platforms, tags)
// ============================================================
function setupMetadataRoute(routePath, dataArray) {
  app.get(`/api/v1/${routePath}`, (req, res) => res.json(dataArray));

  app.post(`/api/v1/${routePath}`, (req, res) => {
    const newItem = {
      id: `${routePath}-${Date.now()}`,
      name: req.body.name,
      description: req.body.description || '',
    };
    dataArray.push(newItem);
    res.json({ item: newItem });
  });
}

setupMetadataRoute('patterns', patternsData);
setupMetadataRoute('platforms', platformsData);
setupMetadataRoute('tags', tagsData);

// ============================================================
// HELPERS
// ============================================================
function normalizeTags(incoming, existing = []) {
  if (incoming === undefined) return Array.isArray(existing) ? existing : [];
  if (Array.isArray(incoming)) return incoming.map(t => t.trim()).filter(Boolean);
  if (typeof incoming === 'string') return incoming.split(',').map(t => t.trim()).filter(Boolean);
  return Array.isArray(existing) ? existing : [];
}

// ============================================================
// ERROR HANDLER
// ============================================================
// MS-4.7: Structured error handler — always returns consistent JSON
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const level = status >= 500 ? '\u2717 SERVER' : '\u26a0 CLIENT';
  console.error(`[${level}] reqId=${req.requestId} ${req.method} ${req.path} → ${err.message}`);
  if (err.errors) console.error('  Validation:', JSON.stringify(err.errors));
  res.status(status).json({
    code: status,
    message: err.message || 'Internal Server Error',
    errors: err.errors || [],
    requestId: req.requestId,
  });
});

// MS-7.8: Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    questionsLoaded: questionMap.size,
    companiesIndexed: companyIndex.size,
    progressRecords: progressMap.size,
    analyticsCached: analyticsCache !== null,
    timestamp: new Date().toISOString(),
  });
});

// MS-7.9: Startup orphan cleanup
function cleanupOrphans() {
  let removed = 0;
  for (const id of progressMap.keys()) {
    if (!questionMap.has(id)) {
      progressMap.delete(id);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`\u26a0 Removed ${removed} orphaned progress records (questions no longer exist)`);
  }
}

// ── Startup sequence ─────────────────────────────────────────────────────
const startTime = Date.now();
loadGlobalQuestions();
loadProgress();
cleanupOrphans();
const loadMs = Date.now() - startTime;

const server = app.listen(PORT, () => {
  console.log(`\n\u{1F680} Mock Server \u2192 http://localhost:${PORT}`);
  console.log(`   ${questionMap.size.toLocaleString()} questions | ${companyIndex.size.toLocaleString()} companies | ${progressMap.size} progress records`);
  console.log(`   Startup: ${loadMs}ms | OpenAPI contract enforced`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

// MS-7.7: Graceful shutdown
function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal} — flushing writes and exiting...`);
  clearTimeout(_saveTimer);
  // Flush any pending progress write synchronously before exit
  const obj = Object.fromEntries(progressMap);
  try { fs.writeFileSync(PROGRESS_DATA_PATH, JSON.stringify(obj, null, 2)); } catch {}
  server.close(() => {
    console.log('[SHUTDOWN] Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000); // force exit after 5s
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
