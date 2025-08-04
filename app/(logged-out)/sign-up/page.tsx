import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" redirectUrl="/projects" />
    </div>
  );
}
