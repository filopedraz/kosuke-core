import type { NewsletterSubscriptionResponse } from '@/lib/types/ghost';
import GhostAdminAPI from '@tryghost/admin-api';

// Type for Ghost member creation - based on @types/tryghost__admin-api
// The AddFunction requires an intersection with { [key: string]: string }
// so we use 'unknown' as a safe bridge type for the type assertion
interface GhostMemberPayload {
  email: string;
  name?: string;
  labels?: Array<{ name: string }>;
  subscribed?: boolean;
  newsletters?: Array<{ id?: string }>;
}

// Lazy initialization of Ghost Admin API client
let ghostAdminClient: InstanceType<typeof GhostAdminAPI> | null = null;

/**
 * Get or create the Ghost Admin API client
 * This is lazily initialized to avoid errors during build time
 */
function getGhostAdminClient(): InstanceType<typeof GhostAdminAPI> | null {
  const ghostUrl = process.env.NEXT_PUBLIC_GHOST_URL;
  const adminKey = process.env.GHOST_ADMIN_API_KEY;

  if (!ghostUrl || !adminKey) {
    console.warn('Ghost Admin API not configured. Newsletter subscriptions are disabled.');
    return null;
  }

  if (!ghostAdminClient) {
    ghostAdminClient = new GhostAdminAPI({
      url: ghostUrl,
      key: adminKey,
      version: 'v5.0',
    });
  }

  return ghostAdminClient;
}

/**
 * Subscribe a user to the newsletter
 * @param email - Email address to subscribe
 * @param name - Optional name
 * @returns Success status and message
 */
export async function subscribeToNewsletter(
  email: string,
  name?: string
): Promise<NewsletterSubscriptionResponse> {
  try {
    const client = getGhostAdminClient();
    if (!client) {
      return {
        success: false,
        unavailable: true,
        message: 'Newsletter subscriptions are not configured in this environment.',
      };
    }

    // Create member with immediate subscription (no email verification)
    const memberPayload: GhostMemberPayload = {
      email,
      name: name || undefined,
      labels: [{ name: 'website-subscriber' }],
      subscribed: true,
      newsletters: [],
    };
    await client.members.add(memberPayload as unknown as Parameters<typeof client.members.add>[0]);

    return {
      success: true,
      message: 'Successfully subscribed to newsletter!',
    };
  } catch (error: unknown) {
    // Handle already existing member
    if (error && typeof error === 'object' && 'type' in error) {
      const ghostError = error as { type?: string; message?: string };
      if (ghostError.type === 'ValidationError' && ghostError.message?.includes('already exists')) {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter!',
          alreadySubscribed: true,
        };
      }
    }

    console.error('Error subscribing to newsletter:', error);
    return {
      success: false,
      message: 'Failed to subscribe. Please try again later.',
    };
  }
}
