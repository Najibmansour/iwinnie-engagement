import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  logger.info('Health check endpoint called', {
    timestamp: new Date().toISOString(),
    endpoint: '/api/health'
  });

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Server is running and logging is active'
  });
}