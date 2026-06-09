import { NextResponse } from 'next/server';

export async function GET() {
  const authEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET && 
    process.env.POSTGRES_PRISMA_URL
  );
  
  return NextResponse.json({ authEnabled });
}
