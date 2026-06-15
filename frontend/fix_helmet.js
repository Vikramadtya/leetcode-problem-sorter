import fs from 'fs';

const pages = [
  'Tracker.jsx',
  'Dashboard.jsx',
  'Configuration.jsx',
  'Comments.jsx',
  'About.jsx',
  'Add.jsx'
];

for (const page of pages) {
  const filePath = `src/pages/${page}`;
  let content = fs.readFileSync(filePath, 'utf8');

  // We know the regex from before added Helmet after the first tag.
  // The structure is roughly:
  // return (
  //   <Component />
  //     <Helmet>...</Helmet>
  // );
  // Let's just manually replace using string matching.
  
  if (content.includes('/>\n      <Helmet>')) {
    content = content.replace(/return \(\s*<([a-zA-Z]+)[\s\S]*?\/>\n\s*<Helmet>.*?<\/Helmet>\n\s*\);/, (match) => {
      // Extract the exact helmet tag
      const helmetMatch = match.match(/<Helmet>.*?<\/Helmet>/)[0];
      const compMatch = match.match(/<([a-zA-Z]+)[\s\S]*?\/>/)[0];
      return `return (\n    <>\n      ${helmetMatch}\n      ${compMatch}\n    </>\n  );`;
    });
  } else if (content.includes('</main>\n      <Helmet>')) {
     content = content.replace(/return \(\s*<([a-zA-Z]+)[\s\S]*?<\/[a-zA-Z]+>\n\s*<Helmet>.*?<\/Helmet>\n\s*\);/, (match) => {
      const helmetMatch = match.match(/<Helmet>.*?<\/Helmet>/)[0];
      const compMatch = match.replace(/return \(\s*/, '').replace(/\n\s*<Helmet>.*?<\/Helmet>\n\s*\);/, '');
      return `return (\n    <>\n      ${helmetMatch}\n      ${compMatch}\n    </>\n  );`;
    });
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Fixed Helmet!');
