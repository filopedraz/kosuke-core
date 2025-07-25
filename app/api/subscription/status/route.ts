import { NextResponse } from 'next/server';

import { canUpgradeSubscription } from '@/lib/actions/subscription';
import { auth } from '@clerk/nextjs';

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ isUpgradable: false }, { status: 401 });
    }

    const isUpgradable = await canUpgradeSubscription();

    return NextResponse.json({ isUpgradable });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
  }
}
