const fs = require('fs');
let content = fs.readFileSync('mock-server/server.js', 'utf8');

// Revert accidental ?, ?, added by previous bad regex
content = content.replace(/VALUES \(\?, \?, \?, /g, 'VALUES (?, ');
content = content.replace(/VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/, 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

// For line 660: INSERT INTO questions (uuid, platformId, platform, title, difficulty, link)
// Needs to be: VALUES (?, ?, ?, ?, ?, ?)
content = content.replace(/INSERT INTO questions \(uuid, platformId, platform, title, difficulty, link\) VALUES \(\?, \?, \?, \?\) ON CONFLICT\(id\) DO NOTHING/, 'INSERT INTO questions (uuid, platformId, platform, title, difficulty, link) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(uuid) DO NOTHING');

fs.writeFileSync('mock-server/server.js', content);
