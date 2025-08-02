import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return a default response
    // In the future, this would check actual subscription status
    return NextResponse.json({
      isUpgradable: true, // Always show upgrade option for now
      tier: 'free',
      hasActiveSubscription: false,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
  }
}
