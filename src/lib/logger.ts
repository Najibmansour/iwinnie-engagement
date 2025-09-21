interface LogContext {
  [key: string]: any;
}

interface ErrorWithStack extends Error {
  stack?: string;
  code?: string;
  statusCode?: number;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const baseLog = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      return `${baseLog} | Context: ${JSON.stringify(context, null, 2)}`;
    }

    return baseLog;
  }

  info(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('info', message, context);
    console.log(formattedMessage);
    // Force flush for Vercel
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(formattedMessage + '\n');
    }
  }

  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage);
    // Force flush for Vercel
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(formattedMessage + '\n');
    }
  }

  error(message: string, error?: ErrorWithStack | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        statusCode: (error as any).statusCode
      };
    } else if (error) {
      errorContext.error = error;
    }

    const formattedMessage = this.formatMessage('error', message, errorContext);
    console.error(formattedMessage);
    // Force flush for Vercel
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(formattedMessage + '\n');
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // API-specific logging methods
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...context
    });
  }

  apiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    const message = `API Response: ${method} ${url} - ${status}`;

    const responseContext: LogContext = {
      type: 'api_response',
      method,
      url,
      status,
      ...context
    };

    if (duration !== undefined) {
      responseContext.duration_ms = duration;
    }

    if (level === 'error') {
      this.error(message, undefined, responseContext);
    } else if (level === 'warn') {
      this.warn(message, responseContext);
    } else {
      this.info(message, responseContext);
    }
  }

  // Cloudflare R2 specific logging
  r2Operation(operation: string, bucket: string, key?: string, context?: LogContext): void {
    this.info(`R2 Operation: ${operation}`, {
      type: 'r2_operation',
      operation,
      bucket,
      key,
      ...context
    });
  }

  r2Error(operation: string, error: ErrorWithStack | unknown, bucket: string, key?: string, context?: LogContext): void {
    this.error(`R2 Operation Failed: ${operation}`, error, {
      type: 'r2_error',
      operation,
      bucket,
      key,
      ...context
    });
  }

  // Environment and configuration logging
  configError(component: string, missingVars: string[], context?: LogContext): void {
    this.error(`Configuration Error in ${component}`, undefined, {
      type: 'config_error',
      component,
      missing_variables: missingVars,
      ...context
    });
  }

  startup(message: string, context?: LogContext): void {
    this.info(`Startup: ${message}`, {
      type: 'startup',
      ...context
    });
  }
}

export const logger = new Logger();