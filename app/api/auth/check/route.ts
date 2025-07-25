import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';

export async function GET() {
  try {
    const { userId } = auth();
    const user = await currentUser();

    return NextResponse.json({
      authenticated: !!userId,
      user: user ? { 
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl
      } : null,
    });
  } catch (error) {
    console.error('Error checking authentication:', error);
    return NextResponse.json({ error: 'Failed to check authentication' }, { status: 500 });
  }
}
