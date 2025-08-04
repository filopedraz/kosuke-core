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
    console.log('Getting GitHub token for user:', userId);

    const user = await clerk.users.getUser(userId);
    console.log('User external accounts:', {
      count: user.externalAccounts?.length || 0,
      providers: user.externalAccounts?.map(acc => acc.provider) || [],
    });

    // Find GitHub external account (should always exist for our users)
    // Note: Clerk SDK uses camelCase 'externalAccounts' and 'oauth_github' provider
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      console.warn(
        `No GitHub account found for user ${userId} - this should not happen with GitHub-only signup`
      );
      return null;
    }

    console.log('GitHub account found:', {
      id: githubAccount.id,
      provider: githubAccount.provider,
      username: githubAccount.username,
      providerUserId: githubAccount.externalId,
      approvedScopes: githubAccount.approvedScopes,
    });

    // Get the access token using Clerk's OAuth token endpoint
    try {
      const endpoint = `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_github`;
      console.log('Fetching OAuth token from:', endpoint);

      const tokenResponse = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        console.log('OAuth token response received');

        // Handle array response (Clerk returns an array of tokens)
        let token = null;

        if (Array.isArray(tokenData) && tokenData.length > 0) {
          // Response is an array - take the first token
          const tokenObj = tokenData[0];
          token = tokenObj.token || tokenObj.access_token || tokenObj.oauth_access_token;
          console.log('Found token in array response:', {
            hasToken: !!token,
            scopes: tokenObj.scopes,
            provider: tokenObj.provider,
          });
        } else {
          // Response is an object - try direct access
          token = tokenData.token || tokenData.access_token || tokenData.oauth_access_token;
        }

        if (token) {
          console.log('✅ OAuth token retrieved successfully, length:', token.length);
          return token;
        } else {
          console.warn(
            'Token field not found in response. Available fields:',
            Object.keys(tokenData)
          );
          return null;
        }
      } else {
        const errorText = await tokenResponse.text();
        console.warn('Failed to retrieve OAuth token:', tokenResponse.status, errorText);
        return null;
      }
    } catch (tokenError) {
      console.error('Error retrieving OAuth token:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('Error getting GitHub token:', error);
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
    console.log('Getting GitHub info for user:', userId);

    const user = await clerk.users.getUser(userId);
    console.log('User external accounts:', {
      count: user.externalAccounts?.length || 0,
      accounts:
        user.externalAccounts?.map(acc => ({
          provider: acc.provider,
          id: acc.id,
          username: acc.username,
          externalId: acc.externalId,
        })) || [],
    });

    // Find GitHub external account using Clerk SDK
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (!githubAccount) {
      console.warn(
        `No GitHub account found for user ${userId} - this should not happen with GitHub-only signup`
      );
      return null;
    }

    return {
      githubUsername: githubAccount.username || '',
      githubId: githubAccount.externalId,
      connectedAt: new Date(githubAccount.verification?.expireAt || Date.now()),
    };
  } catch (error) {
    console.error('Error getting GitHub info:', error);
    return null;
  }
}

/**
 * Disconnect GitHub account
 * WARNING: This will effectively sign the user out since GitHub is required for Kosuke
 */
export async function disconnectGitHub(userId: string): Promise<void> {
  try {
    console.log('Disconnecting GitHub for user:', userId);

    const user = await clerk.users.getUser(userId);

    // Find GitHub external account using Clerk SDK
    const githubAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_github'
    );

    if (githubAccount) {
      // Use Clerk SDK to disconnect external account
      await clerk.users.deleteUserExternalAccount({
        userId,
        externalAccountId: githubAccount.id,
      });
      console.log('GitHub account disconnected successfully');
    } else {
      console.warn('No GitHub account found to disconnect');
    }
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    throw new Error('Failed to disconnect GitHub account');
  }
}

/**
 * Check if user has valid GitHub connection with required scopes
 * Validates the token by making a GitHub API call and checking scopes
 */
export async function hasRequiredGitHubScopes(userId: string): Promise<boolean> {
  try {
    const token = await getGitHubToken(userId);
    if (!token) {
      console.log('No GitHub token available');
      return false;
    }

    // Verify token and scopes by making a GitHub API call
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      console.log('GitHub token is valid');

      // Check the OAuth scopes in the response headers
      const scopes = response.headers.get('x-oauth-scopes') || '';
      const requiredScopes = ['repo', 'workflow', 'admin:repo_hook', 'user:email', 'read:user'];

      console.log('Available scopes:', scopes);
      console.log('Required scopes:', requiredScopes.join(', '));

      // Check if all required scopes are present
      const hasAllScopes = requiredScopes.every(
        scope => scopes.includes(scope) || scopes.includes('repo') // 'repo' includes many sub-scopes
      );

      if (hasAllScopes) {
        console.log('All required GitHub scopes are present');
        return true;
      } else {
        console.warn('Missing required GitHub scopes');
        return false;
      }
    } else {
      console.error('GitHub API call failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error checking GitHub scopes:', error);
    return false;
  }
}

/**
 * Test GitHub API connectivity and get user details
 * Useful for debugging and validation
 */
export async function testGitHubApiConnection(userId: string): Promise<{
  success: boolean;
  userInfo?: {
    login: string;
    id: number;
    name: string | null;
    public_repos: number;
    followers: number;
    [key: string]: unknown;
  };
  error?: string;
}> {
  try {
    const token = await getGitHubToken(userId);
    if (!token) {
      return { success: false, error: 'No GitHub token available' };
    }

    // Make a test API call to get user information
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      console.log('GitHub API connection successful:', {
        login: userInfo.login,
        id: userInfo.id,
        name: userInfo.name,
        publicRepos: userInfo.public_repos,
        followers: userInfo.followers,
      });

      return { success: true, userInfo };
    } else {
      const errorText = await response.text();
      console.error('GitHub API call failed:', response.status, errorText);
      return { success: false, error: `GitHub API error: ${response.status}` };
    }
  } catch (error) {
    console.error('Error testing GitHub API connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
