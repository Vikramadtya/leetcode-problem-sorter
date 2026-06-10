const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', '.data', 'questions');

try {
  if (!fs.existsSync(targetDir)) {
    console.log('Fetching questions data from GitHub...');
    fs.mkdirSync(path.join(__dirname, '..', '.data'), { recursive: true });
    execSync(`git clone https://github.com/Vikramadtya/leetcode-companywise-interview-questions "${targetDir}"`, { stdio: 'inherit' });
  } else {
    console.log('Updating questions data from GitHub...');
    execSync(`cd "${targetDir}" && git pull`, { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Failed to fetch data:', error);
  process.exit(1);
}

// Generate global questions index
try {
  const { parse } = require('csv-parse/sync');
  const questionsPath = path.join(__dirname, '..', '.data', 'questions');
  const globalQuestions = {};

  if (fs.existsSync(questionsPath)) {
    const companies = fs.readdirSync(questionsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);

    for (const company of companies) {
      const allCsvPath = path.join(questionsPath, company, 'all.csv');
      if (fs.existsSync(allCsvPath)) {
        const fileContent = fs.readFileSync(allCsvPath, 'utf-8');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        for (const record of records) {
          const id = record['ID']?.trim();
          if (!id) continue;

          if (!globalQuestions[id]) {
            globalQuestions[id] = {
              'ID': id,
              'Title': record['Title'] || record[' Title'] || '',
              'Difficulty': record['Difficulty'] || record[' Difficulty'] || 'Unknown',
              'Acceptance %': record['Acceptance %'] || record[' Acceptance %'] || '',
              'Frequency %': record['Frequency %'] || record[' Frequency %'] || '',
              'Leetcode Question Link': record['Leetcode Question Link'] || record[' Leetcode Question Link'] || '',
              companies: []
            };
          }
          if (!globalQuestions[id].companies.includes(company)) {
            globalQuestions[id].companies.push(company);
          }
        }
      }
    }

    const outputPath = path.join(__dirname, '..', '.data', 'global_questions.json');
    fs.writeFileSync(outputPath, JSON.stringify(globalQuestions, null, 2));
    console.log('Successfully generated global_questions.json');
  }
} catch (error) {
  console.error('Failed to generate global questions index:', error);
  // Do not fail the build if this fails, just log
}
