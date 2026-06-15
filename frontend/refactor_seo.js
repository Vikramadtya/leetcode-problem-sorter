import fs from 'fs';

const pages = [
  'Tracker.jsx',
  'Dashboard.jsx',
  'Configuration.jsx',
  'Comments.jsx',
  'About.jsx',
  'Add.jsx',
  'Explore.jsx'
];

for (const page of pages) {
  const filePath = `src/pages/${page}`;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace import
  content = content.replace(/import \{ Helmet \} from 'react-helmet-async';\n?/, "import SEO from '../components/SEO';\n");

  // Replace all Helmet blocks
  content = content.replace(/<Helmet>\s*<title>(.*?)<\/title>\s*<\/Helmet>/g, (match, title) => {
    return `<SEO title="${title}" />`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('SEO refactored!');
