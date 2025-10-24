import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallback() {
  // Handle the redirect flow after OAuth signin
  return <AuthenticateWithRedirectCallback />;
}
