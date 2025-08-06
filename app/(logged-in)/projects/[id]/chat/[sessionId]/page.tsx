'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

interface SessionChatPageProps {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
}

export default function SessionChatPage({ params }: SessionChatPageProps) {
  // Unwrap promises using React.use()
  const { id, sessionId } = use(params);

  // Redirect to main project page with session info in search params
  // This allows the main page to know which session to show
  redirect(`/projects/${id}?session=${sessionId}`);
}
