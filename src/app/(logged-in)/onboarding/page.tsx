import { currentUser } from '@clerk/nextjs/server';
import OnboardingForm from './onboarding-form';

export default async function OnboardingPage() {
  const user = await currentUser();
  const firstName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
  const defaultWorkspaceName = `${firstName}'s Workspace`;

  return <OnboardingForm defaultWorkspaceName={defaultWorkspaceName} />;
}
