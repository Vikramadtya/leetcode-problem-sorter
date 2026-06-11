const fs = require('fs');
let content = fs.readFileSync('mock-server/server.js', 'utf8');

// 1. formatQuestion
content = content.replace(/id: row\.id,/, 'id: row.uuid,\n    platformId: row.platformId,\n    platform: row.platform,');

// 2. all q.id in JOINs and SELECTs
content = content.replace(/q\.id = qcf\.question_id/g, 'q.uuid = qcf.question_id');
content = content.replace(/question_id = q\.id/g, 'question_id = q.uuid');
content = content.replace(/q\.id = p\.id/g, 'q.uuid = p.id');
content = content.replace(/p\.id = q\.id/g, 'p.id = q.uuid');

// 3. search by ID
content = content.replace(/q\.id LIKE \?/g, 'q.platformId LIKE ?');

// 4. sort by ID
content = content.replace(/CAST\(q\.id AS INTEGER\)/g, 'CAST(q.platformId AS INTEGER)');

// 5. custom questions POST API
content = content.replace(/const qExists = db.prepare\('SELECT 1 FROM questions WHERE id = \?'\).get\(newQ.id\);/g, "const qExists = db.prepare('SELECT 1 FROM questions WHERE platformId = ? AND platform = ?').get(newQ.platformId, newQ.platform);");
content = content.replace(/INSERT INTO questions \(id, /g, 'INSERT INTO questions (uuid, platformId, platform, ');
content = content.replace(/VALUES \(\?, /g, 'VALUES (?, ?, ?, ');
content = content.replace(/\.run\(\n\s*newQ\.id,/g, '.run(\n        newQ.id, // which is uuid\n        newQ.platformId,\n        newQ.platform,');

// Also update the check inside upsert/patch if there is any `SELECT 1 FROM questions WHERE id = ?`
content = content.replace(/SELECT 1 FROM questions WHERE id = \?/g, 'SELECT 1 FROM questions WHERE uuid = ?');
content = content.replace(/SELECT q\.\*.*WHERE q\.id = \?/g, match => match.replace('q.id = ?', 'q.uuid = ?'));

fs.writeFileSync('mock-server/server.js', content);
