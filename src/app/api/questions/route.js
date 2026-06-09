import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Memory cache to prevent re-parsing CSVs
const questionsCache = new Map();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const period = searchParams.get('period') || 'all';

  if (!company || !period) {
    return NextResponse.json({ error: 'Missing company or period' }, { status: 400 });
  }

  // Security: Prevent path traversal
  const sanitizeRegex = /^[a-zA-Z0-9_-]+$/;
  if (!sanitizeRegex.test(company) || !sanitizeRegex.test(period)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const cacheKey = `${company}_${period}`;
  if (questionsCache.has(cacheKey)) {
    return NextResponse.json({ questions: questionsCache.get(cacheKey) });
  }

  const csvPath = path.join(process.cwd(), '.data', 'questions', company, `${period}.csv`);

  try {
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ questions: [] });
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Clean keys since CSV might have BOM or spaces like "Acceptance %"
    const cleanedRecords = records.map((record) => {
      const cleanRecord = {};
      for (const [key, value] of Object.entries(record)) {
        const cleanKey = key.trim().replace(/^[\uFEFF\xA0]+|[\uFEFF\xA0]+$/g, '');
        cleanRecord[cleanKey] = value;
      }
      return cleanRecord;
    });

    // Store in memory cache
    questionsCache.set(cacheKey, cleanedRecords);

    return NextResponse.json({ questions: cleanedRecords });
  } catch (error) {
    console.error('Error reading CSV:', error);
    return NextResponse.json({ error: 'Failed to read questions' }, { status: 500 });
  }
}
