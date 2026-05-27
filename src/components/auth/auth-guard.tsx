'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!authApi.isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [router]);

  if (!mounted || !authApi.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}

