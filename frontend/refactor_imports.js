import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [oldStr, newStr] of replacements) {
    content = content.replaceAll(oldStr, newStr);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. App.jsx
replaceInFile('src/App.jsx', [
  ['./app/components/', './components/'],
  ['./app/page', './pages/Tracker'],
  ['./app/dashboard/page', './pages/Dashboard'],
  ['./app/explore/page', './pages/Explore'],
  ['./app/configuration/page', './pages/Configuration'],
  ['./app/comments/page', './pages/Comments'],
  ['./app/about/page', './pages/About'],
  ['./app/add/page', './pages/Add']
]);

// 2. main.jsx
replaceInFile('src/main.jsx', [
  ['./app/globals.css', './globals.css']
]);

// 3. Update paths in src/pages/*.jsx
const pages = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx'));
for (const page of pages) {
  if (page === 'Tracker.jsx') {
    replaceInFile(`src/pages/${page}`, [
      ['./components/', '../components/'],
      ['./page.module.css', './Tracker.module.css']
    ]);
  } else {
    replaceInFile(`src/pages/${page}`, [
      ['../../lib/', '../lib/'],
      ['../../contexts/', '../contexts/'],
      ['../../store/', '../store/'],
      ['../../config.json', '../config.json'],
      ['./page.module.css', `./${page.replace('.jsx', '.module.css')}`]
    ]);
  }
}

// 4. Update paths in src/components/*.jsx
const components = fs.readdirSync('src/components');
for (const comp of components) {
  if (comp.endsWith('.jsx') || comp.endsWith('.js')) {
    replaceInFile(`src/components/${comp}`, [
      ['../../lib/', '../lib/'],
      ['../../contexts/', '../contexts/'],
      ['../../store/', '../store/'],
      ['../../config.json', '../config.json'],
      ['../../hooks/', '../hooks/']
    ]);
  }
}

console.log('Imports refactored!');
