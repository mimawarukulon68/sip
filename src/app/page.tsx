"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { checkActiveSession } from '@/lib/session-utils';
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        // Check if user already has an active session (remember me)
        const session = await checkActiveSession();

        if (session && session.user) {
          // User is already logged in, redirect to dashboard
          router.replace('/dashboard');
          return;
        }

        // No active session, show login form
        setShowLogin(true);
      } catch (error) {
        console.error('Session check error:', error);
        // Show login form on error
        setShowLogin(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkExistingSession();
  }, [router]);

  // Show loading skeleton while checking session
  if (isChecking) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </main>
    );
  }

  // Show login form if no active session
  if (showLogin) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <LoginForm />
      </main>
    );
  }

  // This should not be reached, but just in case
  return null;
}
