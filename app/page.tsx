import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/internal/user';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/projects');
  } else {
    redirect('/waitlist');
  }
}
