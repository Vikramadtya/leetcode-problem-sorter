import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockProgress } from '@/lib/mockDb';
import fs from 'fs';
import path from 'path';

let cachedGlobalQuestions = null;

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

export async function GET() {
  try {
    if (!hasDb && !isMockMode) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 501 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // 1. Fetch user progress
    let progressRecords = [];
    if (isMockMode) {
      progressRecords = mockProgress.filter(p => p.userId === userId);
    } else {
      progressRecords = await prisma.progress.findMany({ where: { userId } });
    }

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

    let customQs = [];
    if (isMockMode) {
      customQs = (global.mockCustomQuestions || []).filter(q => q.userId === userId);
    } else {
      customQs = await prisma.customQuestion.findMany({ where: { userId } });
    }

    const mergedQuestions = { ...globalQuestions };
    customQs.forEach(cq => {
      mergedQuestions[cq.id] = {
        id: cq.id,
        title: cq.title,
        difficulty: cq.difficulty,
        isCustom: true,
        platform: cq.platform || 'Custom',
        companies: [] // Custom qs don't map to global companies array
      };
    });

    // 3. Compute Analytics
    const analytics = {
      totalQuestions: Object.keys(globalQuestions).length + customQs.length,
      totalSolved: 0,
      totalRevise: 0,
      difficultyBreakdown: { Easy: 0, Medium: 0, Hard: 0 },
      topCompanies: {},
      platformsBreakdown: {},
      activityTimeline: {},
      revisionList: [],
      timeAnalytics: { Easy: { count: 0, total: 0 }, Medium: { count: 0, total: 0 }, Hard: { count: 0, total: 0 } },
      patternMastery: {}
    };

    progressRecords.forEach(record => {
      const qData = mergedQuestions[record.questionId];

      if (record.solved) {
        analytics.totalSolved++;
        
        if (qData) {
          // Difficulty
          const diff = qData.difficulty;
          if (analytics.difficultyBreakdown[diff] !== undefined) {
            analytics.difficultyBreakdown[diff]++;
          }

          // Time Analytics
          if (record.timeSpent > 0 && diff && analytics.timeAnalytics[diff]) {
            analytics.timeAnalytics[diff].total += record.timeSpent;
            analytics.timeAnalytics[diff].count++;
          }

          // Companies
          if (qData.companies) {
            qData.companies.forEach(company => {
              if (!analytics.topCompanies[company]) {
                analytics.topCompanies[company] = 0;
              }
              analytics.topCompanies[company]++;
            });
          }

          // Platforms
          let platform = 'LeetCode';
          if (qData.isCustom) {
            platform = qData.platform || 'Custom';
          }
          if (!analytics.platformsBreakdown[platform]) {
            analytics.platformsBreakdown[platform] = 0;
          }
          analytics.platformsBreakdown[platform]++;
        }

        // Timeline
        if (record.dateSolved) {
          const dateObj = record.dateSolved instanceof Date ? record.dateSolved : new Date(record.dateSolved);
          if (!isNaN(dateObj)) {
            const dateStr = dateObj.toISOString().split('T')[0];
            if (!analytics.activityTimeline[dateStr]) {
              analytics.activityTimeline[dateStr] = 0;
            }
            analytics.activityTimeline[dateStr]++;
          }
        }
      }

      // Pattern Mastery
      const pattern = record.pattern || (qData && qData.pattern);
      if (pattern && record.confidenceLevel !== null) {
        if (!analytics.patternMastery[pattern]) {
          analytics.patternMastery[pattern] = { totalConf: 0, count: 0 };
        }
        analytics.patternMastery[pattern].totalConf += record.confidenceLevel;
        analytics.patternMastery[pattern].count++;
      }

      const isDueForRevision = record.nextRevisionDate && new Date(record.nextRevisionDate) <= new Date();

      if (record.revise || isDueForRevision) {
        analytics.totalRevise++;
        if (qData) {
          analytics.revisionList.push({
            id: qData.id || qData.ID,
            title: qData.title || qData.Title,
            difficulty: qData.difficulty || qData.Difficulty
          });
        }
      }
    });

    // Calculate Streaks
    const dates = Object.keys(analytics.activityTimeline).sort();
    let currentStreak = 0;
    let maxStreak = 0;
    
    if (dates.length > 0) {
      let tempStreak = 1;
      let curr = new Date(dates[0]);
      
      for (let i = 1; i < dates.length; i++) {
        const next = new Date(dates[i]);
        const diffTime = Math.abs(next - curr);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          tempStreak = 1;
        }
        curr = next;
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      
      // Check if current streak is alive (solved today or yesterday)
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const lastDate = dates[dates.length - 1];
      if (lastDate === todayStr || lastDate === yesterdayStr) {
        currentStreak = tempStreak;
      }
    }

    // Weekly Goal (solved in last 7 days)
    let weeklyCount = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.entries(analytics.activityTimeline).forEach(([dateStr, count]) => {
      if (new Date(dateStr) >= sevenDaysAgo) {
        weeklyCount += count;
      }
    });

    // Format activity timeline
    const formattedTimeline = Object.entries(analytics.activityTimeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Averages for Time and Patterns
    const avgTimePerDiff = Object.entries(analytics.timeAnalytics).map(([diff, data]) => ({
      name: diff,
      avgMinutes: data.count > 0 ? Math.round((data.total / data.count) / 60) : 0
    }));

    const formattedPatterns = Object.entries(analytics.patternMastery)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        full_name: name,
        score: Math.round((data.totalConf / data.count) * 20) // scale to 100
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const sortedCompanies = Object.entries(analytics.topCompanies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const sortedPlatforms = Object.entries(analytics.platformsBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({ 
      ...analytics,
      topCompanies: sortedCompanies,
      platformsBreakdown: sortedPlatforms,
      activityTimeline: formattedTimeline,
      currentStreak,
      maxStreak,
      weeklyCount,
      avgTimePerDiff,
      patternMasteryData: formattedPatterns
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
