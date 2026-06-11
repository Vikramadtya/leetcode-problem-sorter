const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'tacker.db'));
const GLOBAL_DATA_PATH = path.join(__dirname, 'data', 'global_questions.json');

const rawQuestions = JSON.parse(fs.readFileSync(GLOBAL_DATA_PATH, 'utf8'));

db.transaction(() => {
  db.prepare('DELETE FROM question_company_frequencies').run();

  const insertCompanyFreq = db.prepare(`
    INSERT INTO question_company_frequencies (question_id, company_slug, time_period, frequency) VALUES (?, ?, ?, ?)
  `);

  Object.values(rawQuestions).forEach(q => {
    const id = String(q.ID || q.id);
    const companies = q.companies || {};

    if (!Array.isArray(companies)) {
      for (const [companyName, periods] of Object.entries(companies)) {
        const c = String(companyName).toLowerCase().trim();
        for (const [period, freq] of Object.entries(periods)) {
           insertCompanyFreq.run(id, c, period, parseFloat(freq) || 0);
        }
      }
    } else {
      // It's still an array?? Let's hope not.
      companies.forEach(company => {
        const c = String(company).toLowerCase().trim();
        insertCompanyFreq.run(id, c, 'all', 0);
      });
    }
  });
})();

console.log('Successfully updated question_company_frequencies.');
