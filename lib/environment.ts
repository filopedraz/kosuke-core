/**
 * Types of runtime environments the application can be in
 */
export enum RuntimeEnvironment {
  /**
   * Running in a Next.js web request context where cookies/headers are available
   */
  WEB_REQUEST = 'web_request',

  /**
   * Running in a script/CLI context outside of the web request lifecycle
   */
  SCRIPT = 'script',
}

/**
 * Detects the current runtime environment
 *
 * This allows us to have different behavior when running in scripts vs web requests,
 * particularly for things like cookies/headers access which are only available in web requests.
 */
export function detectEnvironment(): RuntimeEnvironment {
  try {
    // If we're in a test environment, return SCRIPT
    if (process.env.NODE_ENV === 'test') {
      return RuntimeEnvironment.SCRIPT;
    }

    // If we're in Vercel, we're in a web request (except for CLI scripts)
    const isVercel = !!process.env.NEXT_PUBLIC_VERCEL_URL;

    // The most reliable way to detect if we're in a Next.js request context is to check
    // if headers() would throw - but we don't want to actually call it and cause errors.
    // Instead, we check for environment markers that indicate we're likely in a script.
    const scriptMarkers = [
      // Running via tsx or ts-node
      process.argv.some(arg => arg.includes('tsx') || arg.includes('ts-node')),
      // Direct script execution
      process.argv[1]?.includes('scripts/'),
      // Not in Vercel and in development
      !isVercel && process.env.NODE_ENV === 'development',
    ];

    return scriptMarkers.some(Boolean) ? RuntimeEnvironment.SCRIPT : RuntimeEnvironment.WEB_REQUEST;
  } catch (error) {
    // If anything goes wrong, assume script context as it's safer
    // (avoids errors when trying to access web request-only APIs)
    console.warn('Failed to detect environment, defaulting to SCRIPT:', error);
    return RuntimeEnvironment.SCRIPT;
  }
}

/**
 * Returns whether the current execution context is a script/CLI
 * rather than a Next.js web request
 */
export function isScriptEnvironment(): boolean {
  return detectEnvironment() === RuntimeEnvironment.SCRIPT;
}

/**
 * Returns whether the current execution context is a Next.js web request
 */
export function isWebRequestEnvironment(): boolean {
  return detectEnvironment() === RuntimeEnvironment.WEB_REQUEST;
}
