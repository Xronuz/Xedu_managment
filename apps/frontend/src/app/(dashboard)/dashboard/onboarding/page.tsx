'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy onboarding page — redirects to the new 7-step guided setup wizard.
 */
export default function OnboardingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/setup');
  }, [router]);

  return null;
}
