import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function createAPIError(message: string, statusCode: number = 500, code?: string): APIError {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

export function handleAPIError(error: unknown, context: {
  method: string;
  url: string;
  startTime?: number;
  additionalContext?: Record<string, any>;
}): NextResponse {
  const { method, url, startTime, additionalContext } = context;
  const duration = startTime ? Date.now() - startTime : undefined;

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode: string | undefined;

  if (error instanceof Error) {
    const apiError = error as APIError;
    statusCode = apiError.statusCode || 500;
    message = apiError.message;
    errorCode = apiError.code;

    // Log operational vs programming errors differently
    if (apiError.isOperational) {
      logger.warn(`Operational error: ${method} ${url}`, {
        error: {
          name: error.name,
          message: error.message,
          code: errorCode,
          stack: error.stack
        },
        ...additionalContext
      });
    } else {
      logger.error(`Programming error: ${method} ${url}`, error, additionalContext);
    }
  } else {
    logger.error(`Unknown error: ${method} ${url}`, error, additionalContext);
  }

  // Log the API response
  logger.apiResponse(method, url, statusCode, duration, {
    error: message,
    error_code: errorCode,
    ...additionalContext
  });

  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error ? {
        stack: error.stack,
        details: error
      } : {})
    },
    { status: statusCode }
  );
}

// Helper function to wrap API handlers with error handling
export function withErrorHandling(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;

    try {
      return await handler(request);
    } catch (error) {
      return handleAPIError(error, {
        method,
        url: url.pathname,
        startTime
      });
    }
  };
}