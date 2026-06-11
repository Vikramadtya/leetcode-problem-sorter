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

    const timePeriods = ['all', 'thirty-days', 'three-months', 'six-months', 'more-than-six-months'];

    for (const company of companies) {
      for (const timePeriod of timePeriods) {
        const csvPath = path.join(questionsPath, company, `${timePeriod}.csv`);
        if (fs.existsSync(csvPath)) {
          const fileContent = fs.readFileSync(csvPath, 'utf-8');
          const records = parse(fileContent, { columns: true, skip_empty_lines: true });

          for (const record of records) {
            const id = record['ID']?.trim();
            if (!id) continue;

            const freqStr = record['Frequency %'] || record[' Frequency %'] || '0';
            const freq = parseFloat(freqStr) || 0;

            if (!globalQuestions[id]) {
              globalQuestions[id] = {
                'ID': id,
                'Title': record['Title'] || record[' Title'] || '',
                'Difficulty': record['Difficulty'] || record[' Difficulty'] || 'Unknown',
                'Acceptance %': record['Acceptance %'] || record[' Acceptance %'] || '',
                'globalFrequency': freq,
                'Leetcode Question Link': record['Leetcode Question Link'] || record[' Leetcode Question Link'] || '',
                companies: {}
              };
            } else {
              // Track highest global frequency
              if (timePeriod === 'all' && freq > globalQuestions[id].globalFrequency) {
                globalQuestions[id].globalFrequency = freq;
              }
            }

            if (!globalQuestions[id].companies[company]) {
              globalQuestions[id].companies[company] = {};
            }
            
            globalQuestions[id].companies[company][timePeriod] = freq;
          }
        }
      }
    }

    const outputPath = path.join(__dirname, '..', '.data', 'global_questions.json');
    fs.writeFileSync(outputPath, JSON.stringify(globalQuestions, null, 2));
    
    // Also write to mock-server for the backend to use
    const mockServerOutputPath = path.join(__dirname, '..', '..', 'mock-server', 'data', 'global_questions.json');
    if (fs.existsSync(path.dirname(mockServerOutputPath))) {
      fs.writeFileSync(mockServerOutputPath, JSON.stringify(globalQuestions, null, 2));
    }
    
    console.log('Successfully generated global_questions.json');
  }
} catch (error) {
  console.error('Failed to generate global questions index:', error);
  // Do not fail the build if this fails, just log
}
