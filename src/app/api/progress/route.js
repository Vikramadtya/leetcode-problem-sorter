import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockProgress } from '@/lib/mockDb';

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

export async function GET(request) {
  try {
    if (!hasDb && !isMockMode) return NextResponse.json({ progress: {} });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ progress: {} });
    }

    const userId = session.user.id;
    let progressRecords = [];

    if (isMockMode) {
      progressRecords = mockProgress.filter(p => p.userId === userId);
    } else {
      progressRecords = await prisma.progress.findMany({ where: { userId } });
    }

    const progressMap = {};
    progressRecords.forEach(p => {
      progressMap[p.questionId] = {
        solved: p.solved,
        revise: p.revise,
        dateSolved: p.dateSolved,
        confidenceLevel: p.confidenceLevel,
        nextRevisionDate: p.nextRevisionDate,
        tags: p.tags,
        notes: p.notes,
        pattern: p.pattern,
        timeSpent: p.timeSpent,
        attempts: p.attempts
      };
    });

    return NextResponse.json({ progress: progressMap });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!hasDb && !isMockMode) return NextResponse.json({ error: 'Database not configured' }, { status: 501 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, updates } = await request.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const userId = session.user.id;

    if (isMockMode) {
      const existingIdx = mockProgress.findIndex(p => p.userId === userId && p.questionId === id);
      if (existingIdx >= 0) {
        mockProgress[existingIdx] = { ...mockProgress[existingIdx], ...updates, updatedAt: new Date() };
        if (updates.dateSolved !== undefined) mockProgress[existingIdx].dateSolved = updates.dateSolved ? new Date(updates.dateSolved) : null;
        if (updates.confidenceLevel !== undefined) mockProgress[existingIdx].confidenceLevel = updates.confidenceLevel;
        if (updates.nextRevisionDate !== undefined) mockProgress[existingIdx].nextRevisionDate = updates.nextRevisionDate ? new Date(updates.nextRevisionDate) : null;
        if (updates.tags !== undefined) mockProgress[existingIdx].tags = updates.tags;
        if (updates.notes !== undefined) mockProgress[existingIdx].notes = updates.notes;
        if (updates.pattern !== undefined) mockProgress[existingIdx].pattern = updates.pattern;
        if (updates.timeSpent !== undefined) mockProgress[existingIdx].timeSpent = updates.timeSpent;
        if (updates.attempts !== undefined) mockProgress[existingIdx].attempts = updates.attempts;
      } else {
        mockProgress.push({
          userId,
          questionId: id,
          solved: updates.solved || false,
          revise: updates.revise || false,
          dateSolved: updates.dateSolved ? new Date(updates.dateSolved) : null,
          confidenceLevel: updates.confidenceLevel ?? null,
          nextRevisionDate: updates.nextRevisionDate ? new Date(updates.nextRevisionDate) : null,
          tags: updates.tags ?? null,
          notes: updates.notes ?? null,
          pattern: updates.pattern ?? null,
          timeSpent: updates.timeSpent ?? null,
          attempts: updates.attempts ?? 1,
          updatedAt: new Date()
        });
      }
      return NextResponse.json({ success: true, isMock: true });
    } else {
      // For updates that increment attempts, we'd ideally use Prisma's increment,
      // but passing attempts directly also works since client tracks it.
      await prisma.progress.upsert({
        where: {
          userId_questionId: { userId, questionId: id }
        },
        update: updates,
        create: {
          userId,
          questionId: id,
          solved: updates.solved || false,
          revise: updates.revise || false,
          dateSolved: updates.dateSolved ? new Date(updates.dateSolved) : null,
          confidenceLevel: updates.confidenceLevel ?? null,
          nextRevisionDate: updates.nextRevisionDate ? new Date(updates.nextRevisionDate) : null,
          tags: updates.tags ?? null,
          notes: updates.notes ?? null,
          pattern: updates.pattern ?? null,
          timeSpent: updates.timeSpent ?? null,
          attempts: updates.attempts ?? 1
        }
      });
      return NextResponse.json({ success: true });
    }

  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
