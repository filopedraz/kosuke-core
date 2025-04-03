import { Suspense } from 'react';

import { Login } from '../../../components/auth/login-form';

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" />
    </Suspense>
  );
}
