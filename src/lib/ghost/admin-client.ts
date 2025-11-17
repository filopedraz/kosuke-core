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
function getGhostAdminClient(): InstanceType<typeof GhostAdminAPI> {
  if (!ghostAdminClient) {
    if (!process.env.NEXT_PUBLIC_GHOST_URL) {
      throw new Error('NEXT_PUBLIC_GHOST_URL environment variable is not set');
    }

    if (!process.env.GHOST_ADMIN_API_KEY) {
      throw new Error('GHOST_ADMIN_API_KEY environment variable is not set');
    }

    ghostAdminClient = new GhostAdminAPI({
      url: process.env.NEXT_PUBLIC_GHOST_URL,
      key: process.env.GHOST_ADMIN_API_KEY,
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
): Promise<{ success: boolean; message: string; alreadySubscribed?: boolean }> {
  try {
    const client = getGhostAdminClient();

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
