import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Get or create PostHog server-side client
 * Use this for server-side tracking (API routes, Server Components, etc.)
 */
export function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    console.warn('PostHog API key not found. Server-side analytics will be disabled.');
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Capture an event on the server side
 */
export async function captureServerEvent(
  eventName: string,
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });

  // Flush the event immediately for API routes
  await client.shutdown();
}

/**
 * Identify a user on the server side
 */
export async function identifyServerUser(
  userId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId: userId,
    properties,
  });

  await client.shutdown();
}
