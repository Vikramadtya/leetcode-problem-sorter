import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockCustomQuestions } from '@/lib/mockDb';

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

export async function GET(request) {
  try {
    if (!hasDb && !isMockMode) return NextResponse.json({ questions: [] });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ questions: [] });
    }

    const userId = session.user.id;
    let customQs = [];

    if (isMockMode) {
      customQs = mockCustomQuestions.filter(q => q.userId === userId);
    } else {
      customQs = await prisma.customQuestion.findMany({ where: { userId } });
    }

    // Map to global format
    const formatted = customQs.map(q => ({
      ID: q.id,
      Title: q.title,
      'Title Link': q.link || '#',
      Difficulty: q.difficulty,
      Platform: q.platform || 'Custom',
      pattern: q.pattern || null,
      'Acceptance %': 'N/A',
      'Frequency %': 'N/A',
      isCustom: true
    }));

    return NextResponse.json({ questions: formatted });
  } catch (error) {
    console.error('Error fetching custom questions:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!hasDb && !isMockMode) return NextResponse.json({ error: 'Database not configured' }, { status: 501 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, title, link, difficulty, platform, pattern, confidenceLevel, timeTaken } = await request.json();
    if (!title || !difficulty) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const userId = session.user.id;
    let newQ = null;

    if (isMockMode) {
      const qId = id || `custom-${Date.now()}`;
      newQ = {
        id: qId,
        userId,
        title,
        link,
        difficulty,
        platform: platform || 'Custom',
        pattern: pattern || null,
        createdAt: new Date()
      };
      mockCustomQuestions.push(newQ);
      
      if (confidenceLevel) {
        const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 };
        const days = intervals[confidenceLevel] || 7;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);
        
        mockProgress.push({
          userId,
          questionId: qId,
          solved: true,
          revise: false,
          dateSolved: new Date(),
          confidenceLevel: confidenceLevel,
          nextRevisionDate: nextDate,
          attempts: 1,
          timeSpent: timeTaken ? timeTaken * 60 : 0,
          tags: null,
          notes: null,
          pattern: pattern || null,
          updatedAt: new Date()
        });
      }
    } else {
      newQ = await prisma.customQuestion.create({
        data: {
          id: id || undefined, // Use explicit ID if provided, otherwise auto-generate
          userId,
          title,
          link,
          difficulty,
          platform: platform || 'Custom',
          pattern: pattern || null
        }
      });
      
      if (confidenceLevel) {
        const intervals = { 1: 1, 2: 3, 3: 7, 4: 14 };
        const days = intervals[confidenceLevel] || 7;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);
        
        await prisma.progress.create({
          data: {
            userId,
            questionId: newQ.id,
            solved: true,
            revise: false,
            dateSolved: new Date(),
            confidenceLevel: confidenceLevel,
            nextRevisionDate: nextDate,
            attempts: 1,
            timeSpent: timeTaken ? timeTaken * 60 : 0,
            pattern: pattern || null
          }
        });
      }
    }

    return NextResponse.json({ 
      question: {
        ID: newQ.id,
        Title: newQ.title,
        'Title Link': newQ.link || '#',
        Difficulty: newQ.difficulty,
        Platform: newQ.platform,
        'Acceptance %': 'N/A',
        'Frequency %': 'N/A',
        isCustom: true
      } 
    });
  } catch (error) {
    console.error('Error adding custom question:', error);
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
  }
}
