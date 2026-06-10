import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockProgress, mockCustomQuestions } from '@/lib/mockDb';
import fs from 'fs';
import path from 'path';

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

let cachedGlobalData = null;

function getGlobalData() {
  if (cachedGlobalData) return cachedGlobalData;
  try {
    const dataPath = path.join(process.cwd(), '.data', 'global_questions.json');
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, 'utf8');
      cachedGlobalData = JSON.parse(fileContents);
      return cachedGlobalData;
    }
  } catch (error) {
    console.error("Could not load global_questions.json");
  }
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    let userProgress = [];
    let customQuestionsRaw = [];

    if (isMockMode) {
      userProgress = mockProgress.filter(p => p.userId === userId);
      customQuestionsRaw = mockCustomQuestions.filter(q => q.userId === userId);
    } else {
      [userProgress, customQuestionsRaw] = await Promise.all([
        prisma.progress.findMany({ where: { userId } }),
        prisma.customQuestion.findMany({ where: { userId } })
      ]);
    }

    // Convert customQuestions into the unified format
    const customQuestions = customQuestionsRaw.map(q => ({
      ID: q.id,
      Title: q.title,
      URL: q.link,
      Difficulty: q.difficulty,
      Platform: q.platform,
      pattern: q.pattern,
      'Acceptance %': '-',
      'Frequency %': '-',
      isCustom: true
    }));

    // Find all global questions the user has interacted with
    const interactedIds = new Set(userProgress.map(p => p.questionId));
    let interactedGlobalQuestions = [];
    
    const globalData = getGlobalData();
    if (globalData) {
      // Find them in global data
      // To optimize, create a lookup or iterate once
      const allQuestionsMap = new Map();
      Object.values(globalData).forEach(q => {
        const id = q.ID || q.id;
        const title = q.Title || q.title || '';
        const difficulty = q.Difficulty || q.difficulty;
        
        if (!allQuestionsMap.has(String(id))) {
          // Map to match the unified format expectations
          allQuestionsMap.set(String(id), {
            ID: id,
            Title: title,
            URL: q['Leetcode Question Link'] || q.URL || (title ? `https://leetcode.com/problems/${title.toLowerCase().replace(/ /g, '-')}/` : ''),
            Difficulty: difficulty,
            Platform: 'LeetCode',
            'Acceptance %': q['Acceptance %'] || '-',
            'Frequency %': q['Frequency %'] || '-'
          });
        }
      });

      interactedIds.forEach(id => {
        if (allQuestionsMap.has(String(id))) {
          interactedGlobalQuestions.push(allQuestionsMap.get(String(id)));
        }
      });
    }

    // Merge custom and interacted global questions
    const unifiedQuestions = [...customQuestions, ...interactedGlobalQuestions];

    return NextResponse.json({ questions: unifiedQuestions });
  } catch (error) {
    console.error('Tracker API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracker data', details: error.message }, { status: 500 });
  }
}
