'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/lib/hooks/useUsers';
import { useBanks } from '@/lib/hooks/useBankMaster';
import { useCategories } from '@/lib/hooks/useCategories';
import { Users, Building2, FolderTree } from 'lucide-react';

export default function DashboardPage() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: banks, isLoading: banksLoading } = useBanks();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Overview of your system</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usersLoading ? '...' : users?.length || 0}
                </div>
                <p className="text-xs text-gray-500">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Banks</CardTitle>
                <Building2 className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {banksLoading ? '...' : banks?.length || 0}
                </div>
                <p className="text-xs text-gray-500">Bank master records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <FolderTree className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categoriesLoading ? '...' : categories?.groups?.reduce((acc, group) => acc + (group.categories?.length || 0), 0) || 0}
                </div>
                <p className="text-xs text-gray-500">Budget categories</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

