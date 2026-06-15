import fs from 'fs';

const file = 'src/store/useAppStore.js';
let content = fs.readFileSync(file, 'utf8');

// Replace log.info -> logger.info, etc.
content = content.replace(/log\.info/g, 'logger.info');
content = content.replace(/log\.warn/g, 'logger.warn');
content = content.replace(/log\.error/g, 'logger.error');

// Add toast.error after logger.error in catch blocks if not already there
// We can do this with a regex:
content = content.replace(/logger\.error\('([^']+)', error\);/g, (match, msg) => {
  return `${match}\n      toast.error('${msg.replace(/ failed:/, '')}: ' + (error.message || 'Unknown error'));`;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Updated logger in useAppStore.js');
