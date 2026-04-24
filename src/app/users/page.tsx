'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useUserByEmail, useUsers } from '@/lib/hooks/useUsers';
import { useAdminOnboarding } from '@/lib/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Eye, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminOnboardingUser } from '@/lib/api/admin';

const getOnboardingStatus = (onboarding?: AdminOnboardingUser) => {
  if (!onboarding) {
    return { label: 'Not Started', variant: 'outline' as const };
  }

  if (onboarding.completed || onboarding.onboardingCompleted) {
    return { label: 'Completed', variant: 'success' as const };
  }

  if (onboarding.abandoned) {
    return { label: 'Abandoned', variant: 'destructive' as const };
  }

  return { label: 'In Progress', variant: 'warning' as const };
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) {
    return '-';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getStepProgress = (onboarding?: AdminOnboardingUser) => {
  if (!onboarding) {
    return '-';
  }

  return [1, 2, 3, 4]
    .map((step) => {
      const completed =
        step === 1
          ? onboarding.step1Completed
          : step === 2
            ? onboarding.step2Completed
            : step === 3
              ? onboarding.step3Completed
              : onboarding.step4Completed;

      return `${step}:${completed ? 'Done' : '-'}`;
    })
    .join(' ');
};

export default function UsersPage() {
  const { data: users = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const {
    data: onboardingUsers = [],
    isLoading: onboardingLoading,
    error: onboardingError,
    refetch: refetchOnboarding,
  } = useAdminOnboarding();
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const { data: userDetails } = useUserByEmail(selectedEmail, !!selectedEmail);
  const isLoading = usersLoading || onboardingLoading;
  const error = usersError || onboardingError;

  const onboardingByEmail = useMemo(() => {
    return new Map(
      onboardingUsers.map((onboarding) => [onboarding.email.toLowerCase(), onboarding])
    );
  }, [onboardingUsers]);

  const selectedOnboarding = selectedEmail
    ? onboardingByEmail.get(selectedEmail.toLowerCase())
    : undefined;

  const refreshAll = async () => {
    await Promise.all([refetchUsers(), refetchOnboarding()]);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">Error loading users. Please try again.</p>
            <Button onClick={() => refreshAll()} className="mt-2" size="sm">
              Retry
            </Button>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="mt-2 text-gray-600">Manage registered users and onboarding progress</p>
            </div>
            <Button onClick={() => refreshAll()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead>Current Step</TableHead>
                      <TableHead>Step Progress</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length > 0 ? (
                      users.map((user) => {
                        const onboarding = onboardingByEmail.get(user.email.toLowerCase());
                        const onboardingStatus = getOnboardingStatus(onboarding);

                        return (
                          <TableRow key={user.email}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              {user.firstName || user.lastName
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : '-'}
                            </TableCell>
                            <TableCell>{user.phone || '-'}</TableCell>
                            <TableCell>{user.createdAt ? formatDate(user.createdAt) : '-'}</TableCell>
                            <TableCell>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '-'}</TableCell>
                            <TableCell>
                              <Badge variant={onboardingStatus.variant}>{onboardingStatus.label}</Badge>
                            </TableCell>
                            <TableCell>{onboarding?.currentStep ?? '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">{getStepProgress(onboarding)}</TableCell>
                            <TableCell>{formatDuration(onboarding?.totalDuration)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedEmail(user.email)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedEmail && userDetails && (
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Username</p>
                    <p className="mt-1">{userDetails.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1">{userDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">First Name</p>
                    <p className="mt-1">{userDetails.firstName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Name</p>
                    <p className="mt-1">{userDetails.lastName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="mt-1">{userDetails.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created At</p>
                    <p className="mt-1">{userDetails.createdAt ? formatDate(userDetails.createdAt) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Login</p>
                    <p className="mt-1">{userDetails.lastLoginAt ? formatDate(userDetails.lastLoginAt) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Onboarding Status</p>
                    <p className="mt-1">
                      <Badge variant={getOnboardingStatus(selectedOnboarding).variant}>
                        {getOnboardingStatus(selectedOnboarding).label}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Step</p>
                    <p className="mt-1">{selectedOnboarding?.currentStep ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Step Progress</p>
                    <p className="mt-1">{getStepProgress(selectedOnboarding)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Onboarding Duration</p>
                    <p className="mt-1">{formatDuration(selectedOnboarding?.totalDuration)}</p>
                  </div>
                  {userDetails.details && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Details</p>
                      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(userDetails.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSelectedEmail('')}
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

