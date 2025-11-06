import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center px-4 py-16 min-h-[600px]">
      <SignIn />
    </div>
  );
}
