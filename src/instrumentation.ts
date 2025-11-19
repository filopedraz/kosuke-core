import * as Sentry from '@sentry/nextjs';

/**
 * Validates required environment variables at runtime startup
 * This runs after build but before the application serves requests
 */
function validateEnvironmentVariables() {
  const ghostEnabled = process.env.GHOST_ADMIN_API_KEY_ENABLED !== 'false';
  const slackEnabled = process.env.SLACK_WEBHOOK_URL_ENABLED !== 'false';
  const sentryEnabled = process.env.SENTRY_ENABLED !== 'false';

  const requiredEnvVars = [
    // Database
    { key: 'POSTGRES_URL', description: 'PostgreSQL database connection URL' },
    { key: 'POSTGRES_DB', description: 'PostgreSQL database name' },
    { key: 'POSTGRES_USER', description: 'PostgreSQL database user' },
    { key: 'POSTGRES_PASSWORD', description: 'PostgreSQL database password' },
    { key: 'POSTGRES_HOST', description: 'PostgreSQL database host' },
    { key: 'POSTGRES_PORT', description: 'PostgreSQL database port' },

    // Clerk Authentication
    { key: 'CLERK_SECRET_KEY', description: 'Clerk secret key for authentication' },

    // AI Provider
    { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude AI' },
    { key: 'AGENT_MAX_TURNS', description: 'Maximum number of agent conversation turns' },

    // Docker Configuration
    { key: 'HOST_WORKSPACE_DIR', description: 'Host workspace directory path' },

    // GitHub Configuration
    { key: 'TEMPLATE_REPOSITORY', description: 'GitHub template repository' },
    { key: 'PREVIEW_DEFAULT_IMAGE', description: 'Default Docker image for previews' },
    { key: 'GITHUB_APP_ID', description: 'GitHub App ID for authentication' },
    { key: 'GITHUB_APP_PRIVATE_KEY', description: 'GitHub App private key' },
    { key: 'GITHUB_APP_INSTALLATION_ID', description: 'GitHub App installation ID' },

    // Projects & Sessions
    { key: 'PROJECTS_BASE_PATH', description: 'Base path for projects directory' },
    { key: 'SESSION_BRANCH_PREFIX', description: 'Git branch prefix for sessions' },
    { key: 'PROJECTS_DIR', description: 'Projects directory name' },

    // Digital Ocean Spaces (Storage)
    { key: 'S3_REGION', description: 'Digital Ocean Spaces region' },
    { key: 'S3_ENDPOINT', description: 'Digital Ocean Spaces endpoint URL' },
    { key: 'S3_BUCKET', description: 'Digital Ocean Spaces bucket name' },
    { key: 'S3_ACCESS_KEY_ID', description: 'Digital Ocean Spaces access key' },
    { key: 'S3_SECRET_ACCESS_KEY', description: 'Digital Ocean Spaces secret key' },

    // Domain Configuration
    { key: 'MAIN_DOMAIN', description: 'Main application domain' },
    { key: 'PREVIEW_BASE_DOMAIN', description: 'Base domain for preview deployments' },
    { key: 'TRAEFIK_ENABLED', description: 'Enable Traefik reverse proxy' },
    { key: 'PREVIEW_PORT_RANGE_START', description: 'Preview port range start' },
    { key: 'PREVIEW_PORT_RANGE_END', description: 'Preview port range end' },
    { key: 'PREVIEW_HEALTH_PATH', description: 'Preview health check path' },
    { key: 'PREVIEW_NETWORK', description: 'Docker network for previews' },
    { key: 'PREVIEW_CONTAINER_NAME_PREFIX', description: 'Docker container name prefix' },

    // Monitoring
    ...(sentryEnabled
      ? [{ key: 'SENTRY_AUTH_TOKEN', description: 'Sentry authentication token' }]
      : []),

    // Conditionally required based on feature flags
    ...(ghostEnabled
      ? [{ key: 'GHOST_ADMIN_API_KEY', description: 'Ghost CMS admin API key' }]
      : []),
    ...(slackEnabled
      ? [{ key: 'SLACK_WEBHOOK_URL', description: 'Slack webhook URL for notifications' }]
      : []),
  ];

  const missingVars = requiredEnvVars.filter(({ key }) => !process.env[key]);

  if (missingVars.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missingVars.map(({ key, description }) => `  - ${key}: ${description}`),
      '\nPlease add these to your environment variables before starting the application.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  console.log('✅ All required environment variables are present');
}

export async function register() {
  console.log('📊 Instrumentation register() called');

  // Validate environment variables on server startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnvironmentVariables();
  }

  // Initialize Sentry in production if DSN is available
  if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    console.log('📊 Initializing Sentry...');
    try {
      if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('../sentry.server.config');
      } else if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config');
      }
      console.log('✅ Sentry ready');
    } catch (error) {
      console.error('❌ Sentry init failed:', error);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
