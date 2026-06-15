import fs from 'fs';

const file = 'src/lib/api/apiClient.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { logger }')) {
  content = content.replace(
    "import axios from 'axios';",
    "import axios from 'axios';\nimport { logger } from '../logger';"
  );
}

content = content.replace(/console\.error\(\`?\[API\]/g, "logger.error(`[API]");
content = content.replace(/console\.warn\(\`?\[API\]/g, "logger.warn(`[API]");
content = content.replace(/console\.error\(\'\[API\]/g, "logger.error('[API]");
content = content.replace(/console\.warn\(\'\[API\]/g, "logger.warn('[API]");

fs.writeFileSync(file, content, 'utf8');
console.log('Updated logger in apiClient.js');
