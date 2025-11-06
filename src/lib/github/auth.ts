import { createClerkClient } from '@clerk/nextjs/server';

// Initialize Clerk client with environment variables
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

/**
 * Get GitHub access token for the authenticated user
 * Since all users sign up via GitHub, this should always return a token
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const user = await clerk.users.getUser(userId);

    // Find GitHub external account (should always exist for our users)
    // Note: Clerk SDK uses camelCase 'externalAccounts' and 'oauth_github' provider
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      return null;
    }

    // Get the access token using Clerk's OAuth token endpoint
    try {
      const endpoint = `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_github`;

      const tokenResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();

        // Handle array response (Clerk returns an array of tokens)
        let token = null;

        if (Array.isArray(tokenData) && tokenData.length > 0) {
          // Response is an array - take the first token
          const tokenObj = tokenData[0];
          token = tokenObj.token || tokenObj.access_token || tokenObj.oauth_access_token;
        } else {
          // Response is an object - try direct access
          token = tokenData.token || tokenData.access_token || tokenData.oauth_access_token;
        }

        if (token) {
          return token;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get GitHub user information for the authenticated user
 * Since all users sign up via GitHub, this should always return info
 */
export async function getUserGitHubInfo(userId: string): Promise<{
  githubUsername: string;
  githubId: string;
  connectedAt: Date;
} | null> {
  try {
    const user = await clerk.users.getUser(userId);

    // Find GitHub external account using Clerk SDK
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      return null;
    }

    return {
      githubUsername: githubAccount.username || '',
      githubId: githubAccount.externalId,
      connectedAt: new Date(githubAccount.verification?.expireAt || Date.now()),
    };
  } catch {
    return null;
  }
}
