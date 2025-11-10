'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  if (!authApi.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}

