'use client';

import AppLogo from '@/components/shared/AppLogo';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <AppLogo />
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold">Create an Account</h1>
        <SignUpForm />
      </div>
    </main>
  );
}
