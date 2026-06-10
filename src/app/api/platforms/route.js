import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { mockPlatforms } from '@/lib/mockDb';

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasDb = !!process.env.DATABASE_URL;
const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let items = [];
    if (isMockMode) {
      items = mockPlatforms.filter(p => p.userId === session.user.id);
    } else {
      items = await prisma.platform.findMany({ where: { userId: session.user.id } });
    }

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let newItem;
    if (isMockMode) {
      newItem = { id: `mock-pl-${Date.now()}`, userId: session.user.id, name, description, createdAt: new Date() };
      mockPlatforms.push(newItem);
    } else {
      newItem = await prisma.platform.create({
        data: { userId: session.user.id, name, description }
      });
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
  }
}
