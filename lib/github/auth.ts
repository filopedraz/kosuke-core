import { auth, clerkClient } from '@clerk/nextjs/server';

export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const user = await clerkClient.users.getUser(userId);

    // Find GitHub external account
    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    return githubAccount?.accessToken || null;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    return null;
  }
}

export async function getUserGitHubInfo(userId: string): Promise<{
  githubUsername: string;
  githubId: string;
  connectedAt: Date;
} | null> {
  try {
    const user = await clerkClient.users.getUser(userId);

    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    if (!githubAccount) {
      return null;
    }

    return {
      githubUsername: githubAccount.username || '',
      githubId: githubAccount.externalId,
      connectedAt: new Date(githubAccount.verification?.expiresAt || githubAccount.createdAt),
    };
  } catch (error) {
    console.error('Error getting GitHub info:', error);
    return null;
  }
}

export async function disconnectGitHub(userId: string): Promise<void> {
  try {
    const user = await clerkClient.users.getUser(userId);

    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    if (githubAccount) {
      await clerkClient.users.deleteExternalAccount({
        userId,
        externalAccountId: githubAccount.id,
      });
    }
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    throw new Error('Failed to disconnect GitHub account');
  }
}