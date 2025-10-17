import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="absolute inset-0 top-14 flex items-center justify-center px-4">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" redirectUrl="/projects" />
    </div>
  );
}
