import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OnboardingForm from './onboarding-form';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check if user already has any organizations
  const client = await clerkClient();
  const organizationMemberships = await client.users.getOrganizationMembershipList({ userId });

  if (organizationMemberships.data.length > 0) {
    redirect('/projects');
  }

  const user = await currentUser();
  const firstName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'My';
  const defaultWorkspaceName = `${firstName}'s Workspace`;

  return <OnboardingForm defaultWorkspaceName={defaultWorkspaceName} />;
}
