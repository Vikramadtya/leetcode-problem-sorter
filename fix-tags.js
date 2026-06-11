const fs = require('fs');
let content = fs.readFileSync('mock-server/server.js', 'utf8');

// 1. SELECT json_group_array(tag) -> SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id
const tagQuery = "(SELECT json_group_array(json_object('id', tg.id, 'name', tg.name, 'description', tg.description)) FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = p.id) as tags";

content = content.replace(/\(SELECT json_group_array\(tag\) FROM progress_tags WHERE progress_id = p\.id\) as tags/g, tagQuery);

// 2. p.id IN (SELECT progress_id FROM progress_tags WHERE lower(tag) LIKE ?)
content = content.replace(/p\.id IN \(SELECT progress_id FROM progress_tags WHERE lower\(tag\) LIKE \?\)/g, 'p.id IN (SELECT progress_id FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE lower(tg.name) LIKE ?)');

// 3. upsertProgress: let tagsObj = db.prepare(`SELECT tag FROM progress_tags WHERE progress_id = ?`).all(id).map(t => t.tag);
content = content.replace(/let tagsObj = db\.prepare\(`SELECT tag FROM progress_tags WHERE progress_id = \?`\)\.all\(id\)\.map\(t => t\.tag\);/g, "let tagsObj = db.prepare(`SELECT tg.name FROM progress_tags pt JOIN tags tg ON pt.tag_id = tg.id WHERE pt.progress_id = ?`).all(id).map(t => t.name);");

// 4. Analytics tags:
// const tagRows = db.prepare(`SELECT t.tag as name, COUNT(*) as count FROM progress_tags t JOIN progress p ON t.progress_id = p.id WHERE p.status = 'Solved' GROUP BY t.tag`).all();
// const allTags = db.prepare(`SELECT DISTINCT tag FROM progress_tags`).all().map(t => t.tag);
content = content.replace(/SELECT t\.tag as name, COUNT\(\*\) as count FROM progress_tags t JOIN progress p ON t\.progress_id = p\.id WHERE p\.status = 'Solved' GROUP BY t\.tag/g, "SELECT tg.name as name, COUNT(*) as count FROM progress_tags t JOIN tags tg ON t.tag_id = tg.id JOIN progress p ON t.progress_id = p.id WHERE p.status = 'Solved' GROUP BY tg.name");
content = content.replace(/SELECT DISTINCT tag FROM progress_tags/g, "SELECT DISTINCT name as tag FROM tags");

fs.writeFileSync('mock-server/server.js', content);
