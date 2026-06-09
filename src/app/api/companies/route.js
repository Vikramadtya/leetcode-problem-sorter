import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedCompanies = null;

export async function GET() {
  if (cachedCompanies) {
    return NextResponse.json({ companies: cachedCompanies });
  }

  const dirPath = path.join(process.cwd(), '.data', 'questions');
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const companies = entries
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);
    
    cachedCompanies = companies;
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error reading directories:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
