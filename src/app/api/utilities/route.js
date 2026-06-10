import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockPatterns, mockPlatforms, mockTags } from '@/lib/mockDb';

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;

    let patterns = [], platforms = [], tags = [];
    if (isMockMode) {
      patterns = mockPatterns.filter(p => p.userId === userId);
      platforms = mockPlatforms.filter(p => p.userId === userId);
      tags = mockTags.filter(p => p.userId === userId);
    } else {
      [patterns, platforms, tags] = await Promise.all([
        prisma.pattern.findMany({ where: { userId } }),
        prisma.platform.findMany({ where: { userId } }),
        prisma.tag.findMany({ where: { userId } })
      ]);
    }

    return NextResponse.json({
      patterns,
      platforms,
      tags,
      approaches: [{ name: 'Iterative' }, { name: 'Recursive' }, { name: 'Two Pointers' }, { name: 'Sliding Window' }, { name: 'Dynamic Programming' }],
      difficulties: [{ name: 'Easy' }, { name: 'Medium' }, { name: 'Hard' }],
      statuses: [{ name: 'Solved' }, { name: 'Attempted' }, { name: 'Revise' }],
      confidences: [{ name: '1', description: 'Low' }, { name: '2' }, { name: '3', description: 'Medium' }, { name: '4' }, { name: '5', description: 'High' }]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch utilities' }, { status: 500 });
  }
}
