import { NextRequest, NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs';
import { createCheckoutSession } from '@/lib/stripe';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect('/sign-in');
    }

    const searchParams = request.nextUrl.searchParams;
    const priceId = searchParams.get('priceId');

    if (!priceId) {
      return NextResponse.json({ error: 'Missing price ID' }, { status: 400 });
    }

    // Get the current user
    const user = await getUser();
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'User not found or missing Stripe customer ID' },
        { status: 400 }
      );
    }

    // Set up success and cancel URLs
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${origin}/billing?success=true`;
    const cancelUrl = `${origin}/billing?canceled=true`;

    // Create checkout session
    const checkoutSession = await createCheckoutSession(
      user.stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl
    );

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    // Return the URL to redirect to
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
