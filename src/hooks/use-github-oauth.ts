import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

const GITHUB_CONNECTING_KEY = 'github_oauth_connecting';
const GITHUB_CONNECTING_TIMESTAMP_KEY = 'github_oauth_connecting_timestamp';
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useGitHubOAuth() {
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const githubAccount = user?.externalAccounts?.find(
    account => account.verification?.strategy === 'oauth_github'
  );

  const isConnected = !!githubAccount;

  // Check localStorage on mount for persisted connecting state
  useEffect(() => {
    const storedConnecting = localStorage.getItem(GITHUB_CONNECTING_KEY);
    const timestamp = localStorage.getItem(GITHUB_CONNECTING_TIMESTAMP_KEY);

    if (storedConnecting === 'true' && timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);

      // Only clean up if timeout exceeded (NOT if connection completed)
      // We need to keep the connecting state until we manually clear it
      if (elapsed > CONNECTION_TIMEOUT) {
        localStorage.removeItem(GITHUB_CONNECTING_KEY);
        localStorage.removeItem(GITHUB_CONNECTING_TIMESTAMP_KEY);
        setIsConnecting(false);
      } else {
        // Restore connecting state
        setIsConnecting(true);
      }
    }
  }, []);

  const connectGitHub = useCallback(
    async (redirectUrl?: string) => {
      if (!user) return;

      setIsConnecting(true);

      // Persist connecting state
      localStorage.setItem(GITHUB_CONNECTING_KEY, 'true');
      localStorage.setItem(GITHUB_CONNECTING_TIMESTAMP_KEY, Date.now().toString());

      try {
        const externalAccount = await user.createExternalAccount({
          strategy: 'oauth_github',
          redirectUrl: redirectUrl || `${window.location.origin}${window.location.pathname}`,
        });

        const verification = externalAccount.verification;
        if (verification?.externalVerificationRedirectURL) {
          window.location.href = verification.externalVerificationRedirectURL.toString();
        } else {
          // Just reload Clerk user data, UI will update automatically
          await user.reload();
          localStorage.removeItem(GITHUB_CONNECTING_KEY);
          localStorage.removeItem(GITHUB_CONNECTING_TIMESTAMP_KEY);
          setIsConnecting(false);
        }
      } catch (error) {
        console.error('Failed to connect GitHub:', error);
        localStorage.removeItem(GITHUB_CONNECTING_KEY);
        localStorage.removeItem(GITHUB_CONNECTING_TIMESTAMP_KEY);
        setIsConnecting(false);
        throw error;
      }
    },
    [user]
  );

  const disconnectGitHub = useCallback(async () => {
    if (!user || !githubAccount?.id) return;

    setIsDisconnecting(true);
    try {
      const externalAccount = user.externalAccounts.find(acc => acc.id === githubAccount.id);
      if (externalAccount) {
        await externalAccount.destroy();
        await user.reload();
      }
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
      throw error;
    } finally {
      setIsDisconnecting(false);
    }
  }, [user, githubAccount]);

  const clearConnectingState = useCallback(() => {
    localStorage.removeItem(GITHUB_CONNECTING_KEY);
    localStorage.removeItem(GITHUB_CONNECTING_TIMESTAMP_KEY);
    setIsConnecting(false);
  }, []);

  return {
    isConnected,
    isConnecting,
    isDisconnecting,
    connectGitHub,
    disconnectGitHub,
    clearConnectingState,
    githubAccount,
  };
}
