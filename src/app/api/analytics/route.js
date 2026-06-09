import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

let cachedGlobalQuestions = null;

export async function GET() {
  try {
    const hasDb = !!process.env.POSTGRES_PRISMA_URL;
    if (!hasDb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // 1. Fetch user progress
    const progressRecords = await prisma.progress.findMany({
      where: { userId }
    });

    // 2. Load global questions dictionary with in-memory caching
    if (!cachedGlobalQuestions) {
      const globalQuestionsPath = path.join(process.cwd(), '.data', 'global_questions.json');
      if (fs.existsSync(globalQuestionsPath)) {
        const fileContent = fs.readFileSync(globalQuestionsPath, 'utf-8');
        cachedGlobalQuestions = JSON.parse(fileContent);
      } else {
        cachedGlobalQuestions = {};
      }
    }
    const globalQuestions = cachedGlobalQuestions;

    // 3. Compute Analytics
    const analytics = {
      totalQuestions: Object.keys(globalQuestions).length,
      totalSolved: 0,
      totalRevise: 0,
      difficultyBreakdown: { Easy: 0, Medium: 0, Hard: 0 },
      topCompanies: {}, 
      activityTimeline: {}, // { 'YYYY-MM-DD': count }
      revisionList: [], // [{ id, title, difficulty }]
    };

    progressRecords.forEach(record => {
      const qData = globalQuestions[record.questionId];

      if (record.solved) {
        analytics.totalSolved++;
        
        if (qData) {
          // Difficulty
          const diff = qData.difficulty;
          if (analytics.difficultyBreakdown[diff] !== undefined) {
            analytics.difficultyBreakdown[diff]++;
          }

          // Companies
          qData.companies.forEach(company => {
            if (!analytics.topCompanies[company]) {
              analytics.topCompanies[company] = 0;
            }
            analytics.topCompanies[company]++;
          });
        }

        // Timeline
        if (record.dateSolved) {
          const dateStr = record.dateSolved.toISOString().split('T')[0];
          if (!analytics.activityTimeline[dateStr]) {
            analytics.activityTimeline[dateStr] = 0;
          }
          analytics.activityTimeline[dateStr]++;
        }
      }

      if (record.revise) {
        analytics.totalRevise++;
        if (qData) {
          analytics.revisionList.push({
            id: qData.id,
            title: qData.title,
            difficulty: qData.difficulty
          });
        }
      }
    });

    // Format activity timeline into an array sorted by date
    const formattedTimeline = Object.entries(analytics.activityTimeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Sort and slice top companies
    const sortedCompanies = Object.entries(analytics.topCompanies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({ 
      ...analytics,
      topCompanies: sortedCompanies,
      activityTimeline: formattedTimeline
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
