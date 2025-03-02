import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        firebaseConfigured: !!(
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_PRIVATE_KEY
        )
      }
    },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  );
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
} 