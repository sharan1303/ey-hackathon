import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway deployment monitoring
 * Returns 200 OK if the application is running
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'voltura-pricing-agent'
    },
    { status: 200 }
  );
}
