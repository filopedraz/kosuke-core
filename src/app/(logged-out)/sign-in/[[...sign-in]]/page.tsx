import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center px-4 flex-1">
      <SignIn />
    </div>
  );
}
