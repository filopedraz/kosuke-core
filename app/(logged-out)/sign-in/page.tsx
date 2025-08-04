import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" redirectUrl="/projects" />
    </div>
  );
}
