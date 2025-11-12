import { clerkService } from '@/lib/clerk';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingForm from './onboarding-form';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check if user already has any organizations
  const hasOrganizations = await clerkService.userHasOrganizations(userId);

  if (hasOrganizations) {
    redirect('/projects');
  }

  const user = await currentUser();
  const firstName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';
  const defaultWorkspaceName = `${firstName}'s Workspace`;

  return <OnboardingForm defaultWorkspaceName={defaultWorkspaceName} />;
}
