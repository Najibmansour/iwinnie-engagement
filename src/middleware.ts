import { NextRequest, NextResponse } from 'next/server';
import { logger } from './lib/logger';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { method, url, headers } = request;
  const pathname = new URL(url).pathname;

  // Log incoming request
  logger.apiRequest(method, pathname, {
    user_agent: headers.get('user-agent'),
    referer: headers.get('referer'),
    ip: headers.get('x-forwarded-for') || headers.get('x-real-ip'),
    content_type: headers.get('content-type')
  });

  // Create a response and add logging to it
  const response = NextResponse.next();

  // Log response (this will execute after the API route handles the request)
  response.headers.set('x-request-start-time', startTime.toString());

  return response;
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
};