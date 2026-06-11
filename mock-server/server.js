const express = require('express');
const cors = require('cors');
const path = require('path');
const { randomUUID } = require('crypto');
const OpenApiValidator = require('express-openapi-validator');
const db = require('./db'); // SQLite db

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  req.requestId = randomUUID();
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const qs = Object.keys(req.query || {}).length ? ` ?${new URLSearchParams(req.query).toString()}` : '';
    const bodyStr = Object.keys(req.body || {}).length ? ` body=${JSON.stringify(req.body)}` : '';
    console.log(`[${level}] ${new Date().toISOString()} ${req.method} ${req.path}${qs} ${res.statusCode} ${ms}ms reqId=${req.requestId}${bodyStr}`);
  });
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '../api-contract/openapi.yaml'),
    validateRequests: true,
    validateResponses: false,
  })
);

function calcNextRevisionDate(confidenceLevel) {
  const getVal = (key, def) => parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || def, 10);
  const intervals = {
    1: getVal('srsLevel1', 1),
    2: getVal('srsLevel2', 3),
    3: getVal('srsLevel3', 7),
    4: getVal('srsLevel4', 14)
  };
  const days = intervals[Math.max(1, Math.min(4, confidenceLevel || 3))];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeTags(incoming, existing = []) {
  if (incoming === undefined) return Array.isArray(existing) ? existing : [];
  if (Array.isArray(incoming)) return incoming.map(t => t.trim()).filter(Boolean);
  if (typeof incoming === 'string') return incoming.split(',').map(t => t.trim()).filter(Boolean);
  return Array.isArray(existing) ? existing : [];
}

function parseJSON(str) {
  try { return JSON.parse(str); } catch { return []; }
}

function formatQuestion(row) {
  const companies = typeof row.companies === 'string' ? parseJSON(row.companies) : (Array.isArray(row.companies) ? row.companies : []);
  const tags = typeof row.tags === 'string' ? parseJSON(row.tags) : (Array.isArray(row.tags) ? row.tags : []);
  return {
    id: row.uuid,
    platformId: row.platformId,
    platform: row.platform,
    title: row.title,
    url: row.url,
    difficulty: row.difficulty,
    acceptanceRate: row.acceptanceRate,
    frequency: row.frequency,
    companies: companies,
    isCustom: !!row.isCustom,
    commentsCount: row.commentsCount || 0,
    progress: {
      status: row.status || 'Unsolved',
      dateSolved: row.dateSolved || null,
      confidenceLevel: row.confidenceLevel || null,
      nextRevisionDate: row.nextRevisionDate || null,
      revise: !!row.revise,
      attempts: row.attempts || 0,
      timeSpent: row.timeSpent || 0,
      notes: row.notes || '',
      tags: tags,
      pattern: row.pattern || '',
      solutionLink: row.solutionLink || '',
      important: !!row.important,
      isDueForRevision: !!row.revise || (row.nextRevisionDate ? new Date(row.nextRevisionDate) <= new Date() : false),
    }
  };
}

// ============================================================
// GET /api/v1/questions
// ============================================================
app.get('/api/v1/questions', (req, res) => {
  const p = req.query;
  const conditions = [];
  const params = [];

  let companyField = 'q.frequency';
  let joinCompanyFreq = '';

  if (p.company && p.company !== 'all') {
    if (p.company.toLowerCase() === 'custom questions') {
      conditions.push(`q.isCustom = 1`);
    } else {
      const timePeriod = (p.timePeriod && p.timePeriod !== 'all') ? p.timePeriod : 'all';
      
      joinCompanyFreq = `
        INNER JOIN question_company_frequencies qcf 
        ON q.uuid = qcf.question_id 
        AND qcf.company_slug = ? 
        AND qcf.time_period = ?
      `;
      params.push(p.company.toLowerCase(), timePeriod);
      
      companyField = 'qcf.frequency';
    }
  }

  let selectQuery = `
    SELECT q.*, p.status, p.dateSolved, p.confidenceLevel, p.nextRevisionDate, p.revise, p.attempts, p.timeSpent, p.notes, p.pattern, p.solutionLink, p.important,
    ${companyField} as frequency,
    (SELECT json_group_array(DISTINCT company_slug) FROM question_company_frequencies WHERE question_id = q.uuid) as companies,
    (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags,
    (SELECT COUNT(*) FROM comments c WHERE c.question_id = q.uuid) as commentsCount
    FROM questions q
    LEFT JOIN progress p ON q.uuid = p.id
    ${joinCompanyFreq}
  `;

  if (p.difficulty && p.difficulty !== 'all') {
    conditions.push(`q.diffLower = ?`);
    params.push(p.difficulty.toLowerCase());
  }

  if (p.trackerMode === 'true') {
    conditions.push(`(p.status IN ('Solved', 'Attempted') OR p.important = 1 OR p.revise = 1 OR p.attempts > 0 OR q.isCustom = 1)`);
  }

  if (p.search) {
    const s = `%${p.search.toLowerCase()}%`;
    conditions.push(`(q.titleLower LIKE ? OR q.platformId LIKE ?)`);
    params.push(s, s);
  }

  if (p.status && p.status !== 'all') {
    if (p.status === 'Unsolved') {
      conditions.push(`(p.status IS NULL OR p.status = 'Unsolved')`);
    } else if (p.status === 'Added') {
      conditions.push(`q.isCustom = 1`);
    } else if (p.status === 'Favourites') {
      conditions.push(`p.important = 1`);
    } else {
      conditions.push(`p.status = ?`);
      params.push(p.status);
    }
  }

  if (p.tag) {
    conditions.push(`p.id IN (SELECT progress_id FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE lower(tg.name) LIKE ?)`);
    params.push(`%${p.tag.toLowerCase()}%`);
  }

  if (p.pattern && p.pattern !== 'all') {
    conditions.push(`lower(p.pattern) = ?`);
    params.push(p.pattern.toLowerCase());
  }

  if (p.hideSolved === 'true') {
    conditions.push(`(p.status IS NULL OR p.status != 'Solved')`);
  }

  if (p.starredOnly === 'true') {
    conditions.push(`p.important = 1`);
  }

  if (p.reviseFilter === 'true') {
    conditions.push(`(p.revise = 1 OR (p.nextRevisionDate IS NOT NULL AND p.nextRevisionDate <= datetime('now')) )`);
  }

  let whereClause = conditions.length > 0 ? `WHERE ` + conditions.join(' AND ') : '';
  
  let orderBy = `ORDER BY CAST(q.platformId AS INTEGER) ASC`; // default
  if (p.sortBy) {
    const dir = p.sortDirection === 'desc' ? 'DESC' : 'ASC';
    if (p.sortBy === 'difficulty') orderBy = `ORDER BY CASE q.diffLower WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END ${dir}`;
    else if (p.sortBy === 'id') orderBy = `ORDER BY CAST(q.platformId AS INTEGER) ${dir}`;
    else if (p.sortBy === 'title') orderBy = `ORDER BY q.titleLower ${dir}`;
    else if (p.sortBy === 'acceptanceRate') orderBy = `ORDER BY q.acceptanceRate ${dir}`;
    else if (p.sortBy === 'frequency') orderBy = `ORDER BY frequency ${dir}`;
    else if (p.sortBy === 'status') orderBy = `ORDER BY p.status ${dir}`;
    else if (p.sortBy === 'attempts') orderBy = `ORDER BY p.attempts ${dir}`;
    else if (p.sortBy === 'timeSpent') orderBy = `ORDER BY p.timeSpent ${dir}`;
    else if (p.sortBy === 'dateSolved') orderBy = `ORDER BY p.dateSolved ${dir}`;
    else if (p.sortBy === 'additionTime') orderBy = `ORDER BY q.rowid ${dir}`;
    else orderBy = `ORDER BY p.${p.sortBy} ${dir}`;
  }

  // Execute Count
  const countQuery = `SELECT COUNT(*) as totalCount FROM questions q LEFT JOIN progress p ON q.uuid = p.id ${joinCompanyFreq} ${whereClause}`;
  const totalCount = db.prepare(countQuery).get(...params).totalCount;

  // Pagination
  const page = Math.max(1, parseInt(p.page) || 1);
  const limit = Math.min(5000, parseInt(p.limit) || 50);
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const offset = (page - 1) * limit;

  selectQuery += ` ${whereClause} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
  
  const rows = db.prepare(selectQuery).all(...params);
  const data = rows.map(formatQuestion);

  res.json({ data, totalCount, page, totalPages });
});

// ============================================================
// GET /api/v1/progress/:id
// ============================================================
app.get('/api/v1/progress/:id', (req, res) => {
  const row = db.prepare(`
    SELECT p.*, (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags
    FROM progress p WHERE id = ?
  `).get(req.params.id);

  if (!row) {
    return res.json(formatQuestion({}).progress); // return default Unsolved
  }

  row.tags = parseJSON(row.tags);
  res.json(formatQuestion(row).progress); // cheat to format
});

// ============================================================
// PATCH /api/v1/progress/:id
// ============================================================
app.patch('/api/v1/progress/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;

  const qExists = db.prepare('SELECT 1 FROM questions WHERE uuid = ?').get(id);
  if (!qExists) {
    return res.status(404).json({ code: 404, message: `Question ${id} not found`, requestId: req.requestId });
  }

  upsertProgress(id, updates);
  
  const updated = db.prepare(`SELECT p.*, (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags FROM progress p WHERE id = ?`).get(id);
  updated.tags = parseJSON(updated.tags);
  res.json(formatQuestion(updated).progress);
});

// ============================================================
// POST /api/v1/progress/bulk
// ============================================================
app.post('/api/v1/progress/bulk', (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ code: 400, message: 'updates must be a non-empty array', requestId: req.requestId });
  }

  const results = [];
  let skipped = 0;

  db.transaction(() => {
    for (const item of updates) {
      const { id, ...fields } = item;
      if (!id) { skipped++; continue; }
      const qExists = db.prepare('SELECT 1 FROM questions WHERE uuid = ?').get(id);
      if (!qExists) { skipped++; continue; }

      upsertProgress(id, fields);
      const updated = db.prepare(`SELECT p.*, (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags FROM progress p WHERE id = ?`).get(id);
      updated.tags = parseJSON(updated.tags);
      results.push({ id, progress: formatQuestion(updated).progress });
    }
  })();

  res.json({ updated: results.length, skipped, results });
});

function upsertProgress(id, updates) {
  let existing = db.prepare(`SELECT * FROM progress WHERE id = ?`).get(id) || { attempts: 0, timeSpent: 0, important: 0, revise: 0, status: 'Unsolved' };
  let tagsObj = db.prepare(`SELECT tg.name FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = ?`).all(id).map(t => t.name);

  let newP = { ...existing };

  // Apply specific status transition rules
  if (updates.status === 'Unsolved') {
    Object.assign(newP, {
      status: 'Unsolved', dateSolved: null, confidenceLevel: null,
      nextRevisionDate: null, revise: 0, attempts: 0, timeSpent: 0,
      notes: '', pattern: '', solutionLink: '', important: 0
    });
    updates.tags = [];
  } else if (updates.status === 'Solved') {
    newP.status = 'Solved';
    newP.dateSolved = existing.dateSolved || new Date().toISOString();
    if (updates.confidenceLevel) newP.confidenceLevel = updates.confidenceLevel;
    else if (!existing.confidenceLevel) newP.confidenceLevel = 3;
    newP.nextRevisionDate = calcNextRevisionDate(newP.confidenceLevel);
    newP.attempts = updates.attempts !== undefined ? updates.attempts : Math.max(existing.attempts || 0, 1);
  } else if (updates.status === 'Attempted') {
    newP.status = 'Attempted';
    newP.attempts = updates.attempts !== undefined ? updates.attempts : Math.max(existing.attempts || 0, 1);
  }

  // Handle revise toggle explicitly
  if (updates.revise === true) {
    newP.revise = 1;
    if (updates.confidenceLevel) newP.confidenceLevel = updates.confidenceLevel;
    else if (!existing.confidenceLevel) newP.confidenceLevel = 3;
    newP.nextRevisionDate = updates.nextRevisionDate || calcNextRevisionDate(newP.confidenceLevel);
  } else if (updates.revise === false) {
    newP.revise = 0;
    newP.nextRevisionDate = null;
  }

  // Handle confidence change without explicit status change
  if (updates.confidenceLevel !== undefined && updates.status !== 'Unsolved' && existing.revise) {
    newP.confidenceLevel = updates.confidenceLevel;
    newP.nextRevisionDate = calcNextRevisionDate(updates.confidenceLevel);
  }

  // Safely merge any other direct updates
  const fieldsToMerge = ['attempts', 'timeSpent', 'notes', 'pattern', 'solutionLink', 'important', 'confidenceLevel'];
  for (const field of fieldsToMerge) {
    if (updates[field] !== undefined && updates.status !== 'Unsolved') {
      newP[field] = field === 'important' ? (updates[field] ? 1 : 0) : updates[field];
    }
  }

  db.prepare(`
    INSERT INTO progress (id, status, dateSolved, confidenceLevel, nextRevisionDate, revise, attempts, timeSpent, notes, pattern, solutionLink, important)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status, dateSolved=excluded.dateSolved, confidenceLevel=excluded.confidenceLevel,
      nextRevisionDate=excluded.nextRevisionDate, revise=excluded.revise, attempts=excluded.attempts,
      timeSpent=excluded.timeSpent, notes=excluded.notes, pattern=excluded.pattern,
      solutionLink=excluded.solutionLink, important=excluded.important
  `).run(id, newP.status, newP.dateSolved, newP.confidenceLevel, newP.nextRevisionDate, newP.revise, newP.attempts, newP.timeSpent, newP.notes, newP.pattern, newP.solutionLink, newP.important);

  if (updates.tags !== undefined) {
    // If frontend sends an array of objects, extract the names, else use as is
    const tagNames = updates.tags.map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
    const newTags = normalizeTags(tagNames, tagsObj);
    
    db.prepare(`DELETE FROM progress_tags WHERE progress_id = ?`).run(id);
    const insertTag = db.prepare(`INSERT INTO progress_tags (progress_id, tag_id) VALUES (?, ?)`);
    const selectTag = db.prepare(`SELECT id FROM tags WHERE lower(name) = ?`);
    const createTag = db.prepare(`INSERT INTO tags (id, name, description) VALUES (?, ?, ?)`);
    const { randomUUID } = require('crypto');

    for (const t of newTags) {
      let tagId;
      const existing = selectTag.get(t.toLowerCase());
      if (existing) {
        tagId = existing.id;
      } else {
        tagId = 'tag-' + randomUUID();
        createTag.run(tagId, t, '');
      }
      insertTag.run(id, tagId);
    }
  }
}

// ============================================================
// GET /api/v1/stats & /api/v1/analytics
// ============================================================

function computeAnalytics() {
  const baseStats = db.prepare(`
    SELECT
      COUNT(CASE WHEN p.status = 'Solved' THEN 1 END) as totalSolved,
      COUNT(CASE WHEN p.status = 'Attempted' THEN 1 END) as totalAttempted,
      COUNT(CASE WHEN p.revise = 1 OR (p.nextRevisionDate IS NOT NULL AND datetime(p.nextRevisionDate) <= datetime('now')) THEN 1 END) as totalRevise,
      COUNT(CASE WHEN p.important = 1 THEN 1 END) as totalFavourite,
      (SELECT COUNT(*) FROM questions) as totalQuestions
    FROM progress p
  `).get();

  const difficultyRows = db.prepare(`
    SELECT q.difficulty, COUNT(*) as count, SUM(p.timeSpent) as timeSpent
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.status = 'Solved'
    GROUP BY q.difficulty
  `).all();

  const diffs = { Easy: 0, Medium: 0, Hard: 0 };
  const avgTimePerDiff = [];
  for (const r of difficultyRows) {
    if (r.difficulty) {
      diffs[r.difficulty] = r.count;
      avgTimePerDiff.push({ name: r.difficulty, avgMinutes: Math.round(r.timeSpent / 60 / r.count) });
    }
  }

  // Activity Timeline (daily counts)
  const activityRows = db.prepare(`
    SELECT date(dateSolved) as dateStr, COUNT(*) as count
    FROM progress
    WHERE status = 'Solved' AND dateSolved IS NOT NULL
    GROUP BY date(dateSolved)
    ORDER BY dateStr ASC
  `).all();

  const activityTimeline = {};
  const problemsSolvedOverTime = [];
  activityRows.forEach(r => {
    activityTimeline[r.dateStr] = r.count;
    problemsSolvedOverTime.push({ date: r.dateStr, count: r.count });
  });

  // Calculate Streak
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

  // Weekly count and Daily count
  const todayStrCount = new Date().toISOString().split('T')[0];
  const sevenAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weeklyCount = activityRows.filter(r => r.dateStr >= sevenAgoStr).reduce((acc, r) => acc + r.count, 0);
  const dailyCount = activityRows.filter(r => r.dateStr === todayStrCount).reduce((acc, r) => acc + r.count, 0);

  // Top Companies
  const topCompanies = db.prepare(`
    SELECT qc.company_slug as name, COUNT(DISTINCT qc.question_id) as count
    FROM question_company_frequencies qc
    JOIN progress p ON qc.question_id = p.id
    WHERE p.status = 'Solved'
    GROUP BY qc.company_slug
    ORDER BY count DESC
    LIMIT 15
  `).all();

  // Pattern Mastery & Usage
  const patternMasteryRows = db.prepare(`
    SELECT pattern as name, 
           COUNT(CASE WHEN status = 'Solved' THEN 1 END) as solved,
           COUNT(*) as total
    FROM progress
    WHERE pattern IS NOT NULL AND pattern != ''
    GROUP BY pattern
    ORDER BY solved DESC
  `).all();
  
  const patternMasteryData = patternMasteryRows.map(r => ({
    name: r.name,
    solved: r.solved,
    score: r.total > 0 ? Math.round((r.solved / r.total) * 100) : 0
  })).slice(0, 10);
  
  const patternUsageFrequency = patternMasteryRows.map(r => ({ name: r.name, count: r.solved })).filter(r => r.count > 0);
  const problemsByPattern = patternMasteryRows.map(r => ({ name: r.name, count: r.total }));

  // Tags Frequency
  const tagsFrequency = db.prepare(`
    SELECT tg.name as name, COUNT(*) as count
    FROM progress_tags t
    JOIN progress p ON t.progress_id = p.id
    JOIN tags tg ON t.tag_id = tg.id
    WHERE p.status = 'Solved'
    GROUP BY tg.name
    ORDER BY count DESC
  `).all();

  const problemsByTag = db.prepare(`
    SELECT tg.name as name, COUNT(*) as count
    FROM progress_tags t
    JOIN tags tg ON t.tag_id = tg.id
    GROUP BY tg.name
    ORDER BY count DESC
  `).all();

  // Confidence vs Difficulty
  const confDiffRows = db.prepare(`
    SELECT q.difficulty, p.confidenceLevel, COUNT(*) as count
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.status = 'Solved' AND p.confidenceLevel IS NOT NULL
    GROUP BY q.difficulty, p.confidenceLevel
  `).all();
  
  const confDiffMap = { Easy: { level1: 0, level2: 0, level3: 0, level4: 0 }, Medium: { level1: 0, level2: 0, level3: 0, level4: 0 }, Hard: { level1: 0, level2: 0, level3: 0, level4: 0 } };
  confDiffRows.forEach(r => {
    if (confDiffMap[r.difficulty]) {
      confDiffMap[r.difficulty][`level${r.confidenceLevel}`] = r.count;
    }
  });
  const confidenceVsDifficulty = ['Easy', 'Medium', 'Hard'].map(d => ({ difficulty: d, ...confDiffMap[d] }));

  // Time Per Diff Over Time
  const timeDiffRows = db.prepare(`
    SELECT date(p.dateSolved) as dateStr, q.difficulty, AVG(p.timeSpent) as avgTime
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.status = 'Solved' AND p.timeSpent > 0 AND p.dateSolved IS NOT NULL
    GROUP BY dateStr, q.difficulty
    ORDER BY dateStr ASC
  `).all();

  const timeDiffMap = {};
  timeDiffRows.forEach(r => {
    if (!timeDiffMap[r.dateStr]) timeDiffMap[r.dateStr] = { date: r.dateStr, Easy: 0, Medium: 0, Hard: 0 };
    timeDiffMap[r.dateStr][r.difficulty] = Math.round(r.avgTime / 60);
  });
  const timePerDiffOverTime = Object.values(timeDiffMap);

  // Patterns most revised
  const patternsMostRevised = db.prepare(`
    SELECT pattern as name, COUNT(*) as count
    FROM progress
    WHERE pattern IS NOT NULL AND pattern != '' AND (revise = 1 OR (nextRevisionDate IS NOT NULL AND datetime(nextRevisionDate) <= datetime('now')))
    GROUP BY pattern
    ORDER BY count DESC
  `).all();

  // Confidence to Problem count
  const confidenceToProblemCount = db.prepare(`
    SELECT confidenceLevel as level, COUNT(*) as count
    FROM progress
    WHERE status = 'Solved' AND confidenceLevel IS NOT NULL
    GROUP BY confidenceLevel
    ORDER BY level ASC
  `).all();

  const revisionList = db.prepare(`
    SELECT q.uuid as id, q.title, q.difficulty, p.nextRevisionDate
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.revise = 1 OR (p.nextRevisionDate IS NOT NULL AND datetime(p.nextRevisionDate) <= datetime('now'))
    ORDER BY p.nextRevisionDate ASC
    LIMIT 20
  `).all();

  // MiniInsights: Recent Activity
  const recentActivity = db.prepare(`
    SELECT q.uuid as id, q.title, q.url, q.difficulty, p.dateSolved
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.status IN ('Solved', 'Attempted')
    ORDER BY p.dateSolved DESC
    LIMIT 3
  `).all();

  // MiniInsights: Upcoming Revisions (Top 3)
  const upcomingRevisions = db.prepare(`
    SELECT q.uuid as id, q.title, q.url, q.difficulty, p.nextRevisionDate
    FROM progress p JOIN questions q ON p.id = q.uuid
    WHERE p.revise = 1 OR (p.nextRevisionDate IS NOT NULL AND datetime(p.nextRevisionDate) <= datetime('now'))
    ORDER BY p.nextRevisionDate ASC
    LIMIT 3
  `).all();

  // MiniInsights: Top Patterns (Top 3)
  const topPatterns = patternMasteryRows
    .map(r => ({ pattern: r.name, count: r.solved }))
    .filter(r => r.count > 0)
    .slice(0, 3);

  return {
    totalSolved: baseStats.totalSolved,
    totalAttempted: baseStats.totalAttempted,
    totalQuestions: baseStats.totalQuestions,
    totalRevise: baseStats.totalRevise,
    totalFavourite: baseStats.totalFavourite,
    problemStatusOverview: [
      { name: 'Solved', count: baseStats.totalSolved },
      { name: 'Attempted', count: baseStats.totalAttempted },
      { name: 'Unsolved', count: baseStats.totalQuestions - baseStats.totalSolved - baseStats.totalAttempted }
    ],
    currentStreak,
    maxStreak,
    weeklyCount,
    dailyCount,
    activityTimeline,
    calendar: problemsSolvedOverTime,
    problemsSolvedOverTime,
    difficultyBreakdown: diffs,
    topCompanies,
    platformsBreakdown: [{ name: 'LeetCode', count: baseStats.totalSolved }], // Stub
    avgTimePerDiff,
    patternMasteryData,
    patternUsageFrequency,
    tagsFrequency,
    problemsByPattern,
    problemsByTag,
    confidenceVsDifficulty,
    timePerDiffOverTime,
    patternsMostRevised,
    confidenceToProblemCount,
    revisionList,
    recentActivity,
    upcomingRevisions,
    topPatterns,
    completionPercent: baseStats.totalQuestions > 0 ? ((baseStats.totalSolved / baseStats.totalQuestions) * 100).toFixed(1) : "0.0",
  };
}

app.get('/api/v1/stats', (req, res) => {
  const c = computeAnalytics();
  res.json({
    totalSolved: c.totalSolved,
    totalAttempted: c.totalAttempted,
    totalQuestions: c.totalQuestions,
    totalRevise: c.totalRevise,
    totalFavourite: c.totalFavourite,
    currentStreak: c.currentStreak,
    maxStreak: c.maxStreak,
    weeklyCount: c.weeklyCount,
    dailyCount: c.dailyCount,
    activityTimeline: c.activityTimeline,
    difficultyBreakdown: c.difficultyBreakdown,
    completionPercent: c.completionPercent,
    recentActivity: c.recentActivity,
    upcomingRevisions: c.upcomingRevisions,
    topPatterns: c.topPatterns,
  });
});

app.get('/api/v1/analytics', (req, res) => {
  res.json(computeAnalytics());
});

app.get('/api/v1/wrapup', (req, res) => {
  const sevenAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  
  const totalSolved = db.prepare(`SELECT COUNT(*) as count FROM progress WHERE status = 'Solved' AND date(dateSolved) >= ?`).get(sevenAgoStr).count;
  
  const totalSeconds = db.prepare(`SELECT SUM(timeSpent) as sum FROM progress WHERE status = 'Solved' AND date(dateSolved) >= ?`).get(sevenAgoStr).sum || 0;
  const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));
  
  const patternRow = db.prepare(`SELECT pattern, COUNT(*) as count FROM progress WHERE status = 'Solved' AND date(dateSolved) >= ? AND pattern IS NOT NULL AND pattern != '' GROUP BY pattern ORDER BY count DESC LIMIT 1`).get(sevenAgoStr);
  const topPattern = patternRow ? patternRow.pattern : "N/A";
  
  const activityRows = db.prepare(`SELECT date(dateSolved) as dateStr FROM progress WHERE status = 'Solved' AND date(dateSolved) >= ? GROUP BY date(dateSolved) ORDER BY dateStr ASC`).all(sevenAgoStr);
  let streak = 0, maxStreak = 0;
  for (let i = 0; i < activityRows.length; i++) {
    if (i === 0) { streak = 1; maxStreak = 1; }
    else {
      const diff = Math.round((new Date(activityRows[i].dateStr) - new Date(activityRows[i - 1].dateStr)) / 86400000);
      if (diff === 1) streak++;
      else streak = 1;
      if (streak > maxStreak) maxStreak = streak;
    }
  }

  res.json({ totalSolved, totalHours, topPattern, longestStreak: maxStreak });
});

app.post('/api/v1/extension/log', (req, res) => {
  const { title, link, difficulty, platform, timeTaken } = req.body;
  if (!title || !link || !difficulty || !platform || timeTaken == null) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  const uuid = randomUUID();
  const idStr = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  db.prepare(`INSERT INTO questions (uuid, platformId, platform, title, titleLower, url, difficulty, diffLower, acceptanceRate, frequency, isCustom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '-', 0, 1) ON CONFLICT(platformId, platform) DO NOTHING`).run(uuid, idStr, platform, title, title.toLowerCase(), link, difficulty, difficulty.toLowerCase());
  
  const row = db.prepare('SELECT uuid FROM questions WHERE platformId = ? AND platform = ?').get(idStr, platform);
  const qUuid = row ? row.uuid : uuid;
  
  upsertProgress(qUuid, { status: 'Solved', timeSpent: timeTaken });
  
  res.json({ message: "Logged" });
});

// ============================================================
// COMMENTS ENDPOINTS
// ============================================================
app.get('/api/v1/questions/:id/comments', (req, res) => {
  const id = req.params.id;
  const qExists = db.prepare('SELECT 1 FROM questions WHERE uuid = ?').get(id);
  if (!qExists) {
    return res.status(404).json({ code: 404, message: `Question ${id} not found`, requestId: req.requestId });
  }

  const comments = db.prepare('SELECT id, question_id, content, created_at FROM comments WHERE question_id = ? ORDER BY created_at ASC').all(id);
  res.json({ comments });
});

app.post('/api/v1/questions/:id/comments', (req, res) => {
  const id = req.params.id;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ code: 400, message: 'Content is required', requestId: req.requestId });
  }

  const qExists = db.prepare('SELECT 1 FROM questions WHERE uuid = ?').get(id);
  if (!qExists) {
    return res.status(404).json({ code: 404, message: `Question ${id} not found`, requestId: req.requestId });
  }

  const commentId = 'com-' + randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO comments (id, question_id, content, created_at) VALUES (?, ?, ?, ?)').run(commentId, id, content.trim(), createdAt);

  res.status(201).json({ id: commentId, question_id: id, content: content.trim(), created_at: createdAt });
});

// ============================================================
// GET /api/v1/comments (Global)
// ============================================================
app.get('/api/v1/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, q.title as questionTitle, q.diffLower as questionDifficulty, q.url as questionUrl, q.platformId
    FROM comments c
    JOIN questions q ON c.question_id = q.uuid
    ORDER BY c.created_at DESC
  `).all();
  
  res.json(comments);
});
app.put('/api/v1/comments/:id', (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ code: 400, message: 'Content is required', requestId: req.requestId });
  }
  const result = db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content.trim(), req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: 'Comment not found', requestId: req.requestId });
  }
  res.json({ id: req.params.id, content: content.trim() });
});

app.delete('/api/v1/comments/:id', (req, res) => {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: 'Comment not found', requestId: req.requestId });
  }
  res.json({ message: 'Deleted successfully' });
});

// ============================================================
// SETTINGS ENDPOINTS
// ============================================================
app.get('/api/v1/settings', (req, res) => {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

app.patch('/api/v1/settings', (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  
  const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      stmt.run(key, String(value));
    }
  })();
  
  // Return the updated settings
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

// ============================================================
// Utilities
// ============================================================
app.get('/api/v1/utilities', (req, res) => {
  const patterns = db.prepare('SELECT id, name, description FROM patterns').all();
  const platforms = db.prepare('SELECT id, name, description FROM platforms').all();
  const tags = db.prepare('SELECT id, name, description FROM tags').all();
  res.json({
    difficulties: [{ id: 'diff-1', name: 'Easy' }, { id: 'diff-2', name: 'Medium' }, { id: 'diff-3', name: 'Hard' }],
    platforms, patterns, tags
  });
});

app.get('/api/v1/patterns', (req, res) => {
  res.json(db.prepare('SELECT id, name, description FROM patterns').all());
});
app.post('/api/v1/patterns', (req, res) => {
  const id = 'pat-' + Date.now();
  db.prepare('INSERT INTO patterns (id, name, description) VALUES (?, ?, ?)').run(id, req.body.name, req.body.description || '');
  res.status(201).json({ id, name: req.body.name, description: req.body.description || '' });
});
app.put('/api/v1/patterns/:id', (req, res) => {
  const result = db.prepare('UPDATE patterns SET name = ?, description = ? WHERE id = ?').run(req.body.name, req.body.description || '', req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Pattern not found' });
  res.json({ id: req.params.id, name: req.body.name, description: req.body.description || '' });
});
app.delete('/api/v1/patterns/:id', (req, res) => {
  const result = db.prepare('DELETE FROM patterns WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Pattern not found' });
  res.json({ message: 'Deleted successfully' });
});

app.get('/api/v1/platforms', (req, res) => {
  res.json(db.prepare('SELECT id, name, description FROM platforms').all());
});
app.post('/api/v1/platforms', (req, res) => {
  const id = 'plat-' + Date.now();
  db.prepare('INSERT INTO platforms (id, name, description) VALUES (?, ?, ?)').run(id, req.body.name, req.body.description || '');
  res.status(201).json({ id, name: req.body.name, description: req.body.description || '' });
});
app.put('/api/v1/platforms/:id', (req, res) => {
  const result = db.prepare('UPDATE platforms SET name = ?, description = ? WHERE id = ?').run(req.body.name, req.body.description || '', req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Platform not found' });
  res.json({ id: req.params.id, name: req.body.name, description: req.body.description || '' });
});
app.delete('/api/v1/platforms/:id', (req, res) => {
  const result = db.prepare('DELETE FROM platforms WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Platform not found' });
  res.json({ message: 'Deleted successfully' });
});

app.get('/api/v1/tags', (req, res) => {
  res.json(db.prepare('SELECT id, name, description FROM tags').all());
});
app.post('/api/v1/tags', (req, res) => {
  const id = 'tag-' + Date.now();
  db.prepare('INSERT INTO tags (id, name, description) VALUES (?, ?, ?)').run(id, req.body.name, req.body.description || '');
  res.status(201).json({ id, name: req.body.name, description: req.body.description || '' });
});
app.put('/api/v1/tags/:id', (req, res) => {
  const result = db.prepare('UPDATE tags SET name = ?, description = ? WHERE id = ?').run(req.body.name, req.body.description || '', req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Tag not found' });
  res.json({ id: req.params.id, name: req.body.name, description: req.body.description || '' });
});
app.delete('/api/v1/tags/:id', (req, res) => {
  db.prepare('DELETE FROM progress_tags WHERE tag_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ code: 404, message: 'Tag not found' });
  res.json({ message: 'Deleted successfully' });
});

app.get('/api/v1/companies', (req, res) => {
  const companies = db.prepare(`
    SELECT company_slug as name, company_slug as slug, COUNT(DISTINCT question_id) as count 
    FROM question_company_frequencies 
    GROUP BY company_slug 
    ORDER BY count DESC
  `).all();
  const customCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE isCustom = 1').get().count;
  res.json([{ name: 'Custom Questions', slug: 'custom questions', count: customCount }, ...companies]);
});

app.post('/api/v1/custom-questions', (req, res) => {
  const uuid = randomUUID();
  const platformId = req.body.platformId || req.body.id || 'custom-' + Date.now();
  const platform = req.body.platform || 'Custom';
  const difficulty = req.body.difficulty || 'Medium';
  const diffLower = difficulty.toLowerCase();

  db.prepare(`
    INSERT INTO questions (uuid, platformId, platform, title, titleLower, url, difficulty, diffLower, acceptanceRate, frequency, isCustom)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '-', 0, 1)
  `).run(uuid, platformId, platform, req.body.title, req.body.title.toLowerCase(), req.body.link || '', difficulty, diffLower);

  const confidenceLevel = req.body.confidenceLevel || null;
  const isSolved = !!confidenceLevel;
  
  const progress = {
    status: isSolved ? 'Solved' : 'Attempted',
    confidenceLevel,
    timeSpent: (req.body.timeTaken || 0) * 60,
    tags: normalizeTags(req.body.tags),
    pattern: req.body.pattern || '',
  };
  upsertProgress(uuid, progress);

  const row = db.prepare(`SELECT q.*, p.status, p.dateSolved, p.confidenceLevel, p.nextRevisionDate, p.revise, p.attempts, p.timeSpent, p.notes, p.pattern, p.solutionLink, p.important, (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags FROM questions q LEFT JOIN progress p ON q.uuid = p.id WHERE q.uuid = ?`).get(uuid);
  res.status(201).json({ success: true, question: formatQuestion(row) });
});

// ============================================================
// POST /api/v1/suggestions
// ============================================================
app.post('/api/v1/suggestions', (req, res) => {
  const { email, phone, note } = req.body;
  const suggId = 'sug-' + randomUUID();
  const createdAt = new Date().toISOString();
  
  db.prepare('INSERT INTO suggestions (id, email, phone, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(suggId, email || null, phone || null, note || null, createdAt);
  
  res.status(201).json({ id: suggId, message: 'Suggestion saved successfully' });
});

// Error Handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[ERR] reqId=${req.requestId} ${req.method} ${req.path} -> ${err.message}`);
  res.status(status).json({ code: status, message: err.message, errors: err.errors || [], requestId: req.requestId });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Mock Server SQLite \u2192 http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}`);
  db.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
