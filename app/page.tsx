import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect('/projects');
  } else {
    redirect('/waitlist');
  }
}
