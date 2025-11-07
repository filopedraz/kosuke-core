import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center px-4 flex-1">
      <SignUp />
    </div>
  );
}
