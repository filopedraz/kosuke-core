import { Suspense } from 'react';

import { Login } from '../../../components/auth/login-form';

export default function SignInPage() {
  return (
    <Suspense>
      <Login mode="signin" />
    </Suspense>
  );
}
