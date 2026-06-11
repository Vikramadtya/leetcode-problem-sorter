const fs = require('fs');
let content = fs.readFileSync('mock-server/db.js', 'utf8');

// 1. Schema update
content = content.replace(/progress_id TEXT,\n\s*tag TEXT,\n\s*FOREIGN KEY\(progress_id\) REFERENCES progress\(id\) ON DELETE CASCADE/, 'progress_id TEXT,\n    tag_id TEXT,\n    FOREIGN KEY(progress_id) REFERENCES progress(id) ON DELETE CASCADE,\n    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE');

// 2. move predefined data to the top of seedDatabase
// Find the block from `// Seed basic metadata` to `console.log('Seeding complete.');`
const metaBlockRegex = /\/\/ Seed basic metadata[\s\S]*?(?=console\.log\('Seeding complete\.'\);)/;
const metaBlock = content.match(metaBlockRegex)[0];

// Remove it from the bottom
content = content.replace(metaBlockRegex, '');

// Insert it right after `if (count.totalCount > 0) return;`
content = content.replace(/if \(count\.totalCount > 0\) return;\n/, 'if (count.totalCount > 0) return;\n\n  ' + metaBlock.trim() + '\n\n');

// 3. update insertTag
content = content.replace(/INSERT INTO progress_tags \(progress_id, tag\) VALUES \(\?, \?\)/, 'INSERT INTO progress_tags (progress_id, tag_id) VALUES (?, ?)');

// 4. update loop
content = content.replace(/for \(const t of tags\) {\n\s*insertTag\.run\(uuid, t\);\n\s*}/, `for (const t of tags) {
            let tagId;
            const existingTag = db.prepare('SELECT id FROM tags WHERE lower(name) = ?').get(t.toLowerCase());
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              tagId = 'tag-' + randomUUID();
              db.prepare('INSERT INTO tags (id, name, description) VALUES (?, ?, ?)').run(tagId, t, '');
            }
            insertTag.run(uuid, tagId);
          }`);

fs.writeFileSync('mock-server/db.js', content);
