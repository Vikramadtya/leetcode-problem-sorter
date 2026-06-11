const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'tacker.db');
// Ensure data dir exists
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// Turn on WAL mode for better performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT,
    titleLower TEXT,
    url TEXT,
    difficulty TEXT,
    diffLower TEXT,
    acceptanceRate TEXT,
    frequency REAL,
    isCustom INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS question_company_frequencies (
    question_id TEXT,
    company_slug TEXT,
    time_period TEXT,
    frequency REAL,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progress (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'Unsolved',
    dateSolved TEXT,
    confidenceLevel INTEGER,
    nextRevisionDate TEXT,
    revise INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    timeSpent INTEGER DEFAULT 0,
    notes TEXT,
    pattern TEXT,
    solutionLink TEXT,
    important INTEGER DEFAULT 0,
    FOREIGN KEY(id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progress_tags (
    progress_id TEXT,
    tag TEXT,
    FOREIGN KEY(progress_id) REFERENCES progress(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(diffLower);
  CREATE INDEX IF NOT EXISTS idx_qcf_company ON question_company_frequencies(company_slug);
  CREATE INDEX IF NOT EXISTS idx_qcf_period ON question_company_frequencies(time_period);
  CREATE INDEX IF NOT EXISTS idx_qcf_question ON question_company_frequencies(question_id);
  CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
`);

// Initialize settings
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dailyGoal', '2')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('weeklyGoal', '10')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('srsLevel1', '1')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('srsLevel2', '3')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('srsLevel3', '7')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('srsLevel4', '14')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maxFlashcards', '20')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('weekStart', '0')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('defaultDifficulty', 'Medium')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('defaultPlatform', 'LeetCode')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('heatmapTheme', 'green')`).run();

// Seeding logic
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
  if (count > 0) return; // Already seeded

  console.log('Seeding SQLite database from JSON files...');

  const GLOBAL_DATA_PATH = path.join(__dirname, 'data', 'global_questions.json');
  const PROGRESS_DATA_PATH = path.join(__dirname, 'data', 'user_progress.json');

  const insertQuestion = db.prepare(`
    INSERT INTO questions (id, title, titleLower, url, difficulty, diffLower, acceptanceRate, frequency, isCustom)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertCompanyFreq = db.prepare(`
    INSERT INTO question_company_frequencies (question_id, company_slug, time_period, frequency) VALUES (?, ?, ?, ?)
  `);

  if (fs.existsSync(GLOBAL_DATA_PATH)) {
    const rawQuestions = JSON.parse(fs.readFileSync(GLOBAL_DATA_PATH, 'utf8'));
    
    db.transaction(() => {
      Object.values(rawQuestions).forEach(q => {
        const id = String(q.ID || q.id);
        const difficulty = (q.Difficulty || q.difficulty || 'Medium');
        const diffLower = difficulty.toLowerCase();
        const frequency = parseFloat(q.globalFrequency) || 0;
        const companies = q.companies || {};

        insertQuestion.run(
          id,
          q.Title || q.title || '',
          (q.Title || q.title || '').toLowerCase(),
          q['Leetcode Question Link'] || q.URL || q.url || '',
          difficulty,
          diffLower,
          q['Acceptance %'] || q.acceptanceRate || '-',
          frequency,
          0 // isCustom
        );

        for (const [companyName, periods] of Object.entries(companies)) {
          const c = String(companyName).toLowerCase().trim();
          for (const [period, freq] of Object.entries(periods)) {
             insertCompanyFreq.run(id, c, period, parseFloat(freq) || 0);
          }
        }
      });
    })();
  }

  const insertProgress = db.prepare(`
    INSERT INTO progress (id, status, dateSolved, confidenceLevel, nextRevisionDate, revise, attempts, timeSpent, notes, pattern, solutionLink, important)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTag = db.prepare(`
    INSERT INTO progress_tags (progress_id, tag) VALUES (?, ?)
  `);

  if (fs.existsSync(PROGRESS_DATA_PATH)) {
    const rawProgress = JSON.parse(fs.readFileSync(PROGRESS_DATA_PATH, 'utf8'));
    
    db.transaction(() => {
      Object.entries(rawProgress).forEach(([id, p]) => {
        // Normalise tags
        let tags = [];
        if (Array.isArray(p.tags)) tags = p.tags;
        else if (typeof p.tags === 'string') tags = p.tags.split(',').map(t => t.trim()).filter(Boolean);
        
        // Clean legacy Unsolved states
        const isUnsolved = p.status === 'Unsolved' || !p.status;

        try {
          insertProgress.run(
            id,
            isUnsolved ? 'Unsolved' : p.status,
            isUnsolved ? null : (p.dateSolved || null),
            isUnsolved ? null : (p.confidenceLevel || null),
            isUnsolved ? null : (p.nextRevisionDate || null),
            isUnsolved ? 0 : (p.revise ? 1 : 0),
            isUnsolved ? 0 : (p.attempts || 0),
            isUnsolved ? 0 : (p.timeSpent || 0),
            p.notes || '',
            isUnsolved ? '' : (p.pattern || ''),
            isUnsolved ? '' : (p.solutionLink || ''),
            p.important ? 1 : 0
          );

          for (const t of tags) {
            insertTag.run(id, t);
          }
        } catch (e) {
          // If a progress entry references a non-existent question, foreign key constraint will fail.
          // We can ignore orphans.
          console.warn(`Warning: Skipping orphan progress for question ${id}`);
        }
      });
    })();
  }
  
  // Seed basic metadata
  const insertPattern = db.prepare('INSERT INTO patterns (id, name, description) VALUES (?, ?, ?)');
  const patternsData = [
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
  db.transaction(() => {
    for (const p of patternsData) insertPattern.run(p.id, p.name, p.description);
  })();

  const insertPlatform = db.prepare('INSERT INTO platforms (id, name, description) VALUES (?, ?, ?)');
  const platformsData = [
    { id: 'plat-1', name: 'LeetCode',   description: 'Popular competitive programming platform.' },
    { id: 'plat-2', name: 'HackerRank', description: 'Common for online assessments.' },
    { id: 'plat-3', name: 'Codeforces', description: 'Competitive programming contests.' },
  ];
  db.transaction(() => {
    for (const p of platformsData) insertPlatform.run(p.id, p.name, p.description);
  })();

  const insertTagMeta = db.prepare('INSERT INTO tags (id, name, description) VALUES (?, ?, ?)');
  const tagsData = [
    { id: 'tag-1', name: 'Array',       description: '' },
    { id: 'tag-2', name: 'String',      description: '' },
    { id: 'tag-3', name: 'Graph',       description: '' },
    { id: 'tag-4', name: 'Tree',        description: '' },
    { id: 'tag-5', name: 'Math',        description: '' },
    { id: 'tag-6', name: 'Hash Map',    description: '' },
    { id: 'tag-7', name: 'Recursion',   description: '' },
    { id: 'tag-8', name: 'Bit Masking', description: '' },
  ];
  db.transaction(() => {
    for (const t of tagsData) insertTagMeta.run(t.id, t.name, t.description);
  })();

  console.log('Seeding complete.');
}

seedDatabase();

module.exports = db;
