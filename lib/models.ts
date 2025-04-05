import { getUserSubscription } from '@/lib/actions/subscription';
import { SUBSCRIPTION_TIERS, LLM } from '@/lib/constants';
import { isScriptEnvironment } from '@/lib/environment';

// Add proper type definitions for the AI models
export type ModelName = string;

/**
 * Get the model configuration based on user subscription tier
 * Note: We use the same Gemini Pro 2.5 model for all tiers, only the usage limits differ
 */
export async function getModelForUser() {
  // If called from a script context (CLI), bypass the user check
  if (isScriptEnvironment()) {
    console.log(`Called from script context, using premium tier`);
    return {
      provider: 'google',
      model: LLM.DEFAULT_MODEL, // Using the same model for all tiers
      tier: SUBSCRIPTION_TIERS.PREMIUM,
    };
  }

  // Normal web request flow - get user subscription
  const subscription = await getUserSubscription();
  const tier = subscription?.product?.tier || SUBSCRIPTION_TIERS.FREE;

  console.log(`User has subscription tier: ${tier}`);

  // Return the model with the user's tier (same model, different tier for limits)
  const modelConfig = {
    provider: 'google',
    model: LLM.DEFAULT_MODEL, // Using the same model for all tiers
    tier,
  };

  console.log(`Using model configuration:`, modelConfig);
  return modelConfig;
}

/**
 * Get the message limit for a user based on their subscription tier
 */
export async function getUserMessageLimit() {
  const subscription = await getUserSubscription();
  const tier = subscription?.product?.tier || SUBSCRIPTION_TIERS.FREE;

  // Map the tier to the corresponding key in LLM.MESSAGE_LIMITS
  const tierKey = tier.toLowerCase() as keyof typeof LLM.MESSAGE_LIMITS;
  return LLM.MESSAGE_LIMITS[tierKey] || LLM.MESSAGE_LIMITS.free;
}

/**
 * Check if a user has reached their message limit
 */
export async function hasReachedMessageLimit(userId: number): Promise<boolean> {
  try {
    const userModel = await getModelForUser();
    const limit = await getUserMessageLimit();
    const count = await getPremiumMessageCount(userId);

    const hasReached = count >= limit;
    console.log(
      `Message limit check for user ${userId}: count=${count}, limit=${limit}, hasReached=${hasReached}, tier=${userModel.tier}`
    );

    if (hasReached) {
      console.log(
        `⚠️ User ${userId} has reached their message limit (${count}/${limit}) for tier ${userModel.tier}`
      );
      // Return a specific error that can be used to trigger an upgrade modal
      throw new Error('PREMIUM_LIMIT_REACHED');
    }

    // If hasn't reached limit, allow the message
    return false;
  } catch (error) {
    if (error instanceof Error && error.message === 'PREMIUM_LIMIT_REACHED') {
      // Propagate the specific premium limit error
      throw error;
    }

    console.error(`Error checking message limit for user ${userId}:`, error);
    // If there's an error checking the limit, assume they haven't reached it
    return false;
  }
}

/**
 * Get count of messages sent by a specific user
 * Counts all user messages regardless of model type
 */
export async function getPremiumMessageCount(userId: number): Promise<number> {
  try {
    console.log(`Counting messages for user ${userId}`);

    // Import necessary modules
    const { eq, sql, and } = await import('drizzle-orm');
    const { db } = await import('@/lib/db/drizzle');
    const { chatMessages } = await import('@/lib/db/schema');

    // Count messages where userId matches and role is 'user'
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.role, 'user')));

    const count = result?.count || 0;
    console.log(`Found ${count} messages for user ${userId}`);
    return count;
  } catch (error) {
    console.error(`Error counting messages for user ${userId}:`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return 0; // Return 0 on error as a safe default
  }
}
