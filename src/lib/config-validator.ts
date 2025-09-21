import { logger } from './logger';

interface EnvironmentConfig {
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
  CLOUDFLARE_R2_ENDPOINT: string;
  CLOUDFLARE_R2_BUCKET_NAME: string;
  CLOUDFLARE_R2_PUBLIC_URL: string;
}

export function validateEnvironmentConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredEnvVars: (keyof EnvironmentConfig)[] = [
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_BUCKET_NAME',
    'CLOUDFLARE_R2_PUBLIC_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  logger.startup('Environment configuration validation', {
    total_required_vars: requiredEnvVars.length,
    missing_vars_count: missingVars.length,
    missing_vars: missingVars,
    node_env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME
  });

  if (missingVars.length > 0) {
    logger.configError('startup', missingVars, {
      total_required: requiredEnvVars.length,
      available_vars: requiredEnvVars.filter(varName => process.env[varName])
    });
    return { isValid: false, missingVars };
  }

  logger.startup('All environment variables are properly configured', {
    configured_vars: requiredEnvVars.length
  });

  return { isValid: true, missingVars: [] };
}

export function logServerStartup() {
  logger.startup('Server initialization started', {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME,
    platform: process.platform,
    node_version: process.version
  });

  // Validate configuration on startup
  const configValidation = validateEnvironmentConfig();

  if (!configValidation.isValid) {
    logger.error('Server startup failed due to configuration errors', undefined, {
      missing_environment_variables: configValidation.missingVars,
      action_required: 'Set missing environment variables and restart'
    });
  } else {
    logger.startup('Server startup completed successfully', {
      all_configurations_valid: true
    });
  }

  return configValidation;
}