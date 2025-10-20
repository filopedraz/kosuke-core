import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="absolute inset-0 top-14 flex items-center justify-center px-4">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" redirectUrl="/projects" />
    </div>
  );
}
