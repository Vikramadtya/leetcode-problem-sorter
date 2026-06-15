import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

walk('./src').forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('[status, router]')) {
    content = content.replace(/\[status, router\]/g, '[status, navigate]');
    changed = true;
  }
  if (content.includes('[status, router, fetchStats]')) {
    content = content.replace(/\[status, router, fetchStats\]/g, '[status, navigate, fetchStats]');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed router dependency in', file);
  }
});
