'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AliasCleanupWorkspace } from '@/components/merchant-master/alias-cleanup-workspace';

export default function AliasCleanupPage() {
  return (
    <AuthGuard>
      <AdminLayout>
        <AliasCleanupWorkspace />
      </AdminLayout>
    </AuthGuard>
  );
}
