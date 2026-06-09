import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const hasDb = !!process.env.POSTGRES_PRISMA_URL;
    if (!hasDb) return NextResponse.json({ progress: {} });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ progress: {} });
    }

    const userId = session.user.id;
    const progressRecords = await prisma.progress.findMany({
      where: { userId }
    });

    const progressObj = {};
    progressRecords.forEach(record => {
      progressObj[record.questionId] = {
        solved: record.solved,
        revise: record.revise,
        dateSolved: record.dateSolved ? record.dateSolved.toISOString() : null,
      };
    });

    return NextResponse.json({ progress: progressObj });
  } catch (error) {
    console.error('Error reading progress:', error);
    return NextResponse.json({ error: 'Failed to read progress' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const hasDb = !!process.env.POSTGRES_PRISMA_URL;
    if (!hasDb) return NextResponse.json({ error: 'Database not configured' }, { status: 501 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: questionId, updates } = await request.json();
    const userId = session.user.id;

    const progress = await prisma.progress.upsert({
      where: {
        userId_questionId: {
          userId,
          questionId,
        }
      },
      update: {
        ...updates,
      },
      create: {
        userId,
        questionId,
        solved: updates.solved || false,
        revise: updates.revise || false,
        dateSolved: updates.dateSolved ? new Date(updates.dateSolved) : null,
      }
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
