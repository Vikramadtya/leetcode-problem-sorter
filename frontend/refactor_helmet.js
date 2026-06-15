import fs from 'fs';

const pages = [
  { file: 'Tracker.jsx', title: 'Tacker | Problem Tracker' },
  { file: 'Dashboard.jsx', title: 'Dashboard | Tacker' },
  { file: 'Explore.jsx', title: 'Explore Problems | Tacker' },
  { file: 'Configuration.jsx', title: 'Configuration | Tacker' },
  { file: 'Comments.jsx', title: 'Community Comments | Tacker' },
  { file: 'About.jsx', title: 'About Tacker' },
  { file: 'Add.jsx', title: 'Add Custom Problem | Tacker' }
];

for (const page of pages) {
  const filePath = `src/pages/${page.file}`;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('import { Helmet }')) {
    content = `import { Helmet } from 'react-helmet-async';\n` + content;
    
    // Find the return statement and wrap/insert Helmet.
    // It's safer to just inject it right after the first HTML tag returned.
    // Regex: find the first `<div`, `<main`, `<section` after `return (` or `return`
    content = content.replace(/(return\s*\(\s*<[a-zA-Z]+[^>]*>)/, (match) => {
      return `${match}\n      <Helmet><title>${page.title}</title></Helmet>`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log('Helmet added to pages!');
