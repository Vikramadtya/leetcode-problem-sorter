import { NextResponse } from 'next/server';

export async function GET() {
  const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasDb = !!process.env.DATABASE_URL;
  const isMockMode = process.env.NODE_ENV === 'development' && (!hasDb || !hasGoogleAuth);

  const authEnabled = (hasGoogleAuth && hasDb) || isMockMode;
  
  return NextResponse.json({ authEnabled, isMockMode });
}
