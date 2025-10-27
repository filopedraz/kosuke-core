import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="absolute inset-0 top-14 flex items-center justify-center px-4">
      <SignIn />
    </div>
  );
}
