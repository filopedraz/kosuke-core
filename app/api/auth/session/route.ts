import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';

export async function GET() {
  try {
    const { userId } = auth();
    const user = await currentUser();

    return NextResponse.json(
      {
        user: user ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
        } : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch session',
      },
      { status: 500 }
    );
  }
}
