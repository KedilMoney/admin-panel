'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useUsers } from '@/lib/hooks/useUsers';
import { useAdminOnboarding, useUserStats } from '@/lib/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';
import { Users, Activity, TrendingUp, CheckCircle, Eye, RefreshCw, Search } from 'lucide-react';
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
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getStepProgress = (onboarding?: AdminOnboardingUser) => {
  if (!onboarding) return '-';
  return [1, 2, 3, 4]
    .map((step) => {
      const completed =
        step === 1 ? onboarding.step1Completed
          : step === 2 ? onboarding.step2Completed
            : step === 3 ? onboarding.step3Completed
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
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useUserStats();

  const [selectedEmail, setSelectedEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isLoading = usersLoading || onboardingLoading;
  const error = usersError || onboardingError;

  const onboardingByEmail = useMemo(() => {
    return new Map(
      onboardingUsers.map((o) => [o.email.toLowerCase(), o])
    );
  }, [onboardingUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;

      const onboarding = onboardingByEmail.get(user.email.toLowerCase());
      const status = getOnboardingStatus(onboarding);
      return status.label.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [users, searchQuery, statusFilter, onboardingByEmail]);

  const selectedOnboarding = selectedEmail
    ? onboardingByEmail.get(selectedEmail.toLowerCase())
    : undefined;

  const refreshAll = async () => {
    await Promise.all([refetchUsers(), refetchOnboarding(), refetchStats()]);
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
              <p className="mt-2 text-gray-600">User metrics and activity overview</p>
            </div>
            <Button onClick={() => refreshAll()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.totalUsers ?? 0}
                </div>
                <p className="text-xs text-gray-500">
                  {statsLoading ? '...' : `+${stats?.newThisWeek ?? 0} this week`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <Activity className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.activeNow ?? 0}
                  </span>
                  {(stats?.activeNow ?? 0) > 0 && (
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {statsLoading
                    ? '...'
                    : stats?.lastLoginAt
                      ? `Last login: ${formatRelativeTime(stats.lastLoginAt)}`
                      : 'No logins yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DAU / WAU / MAU</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.dau ?? 0}
                </div>
                <p className="text-xs text-gray-500">
                  {statsLoading
                    ? '...'
                    : `WAU: ${stats?.wau ?? 0} · MAU: ${stats?.mau ?? 0}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Onboarding Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : `${stats?.onboardingCompletionRate ?? 0}%`}
                </div>
                <p className="text-xs text-gray-500">
                  {statsLoading
                    ? '...'
                    : `${stats?.onboardingCompletedCount ?? 0} of ${stats?.totalUsers ?? 0} completed`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>
                  All Users
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {filteredUsers.length !== users.length
                      ? `Showing ${filteredUsers.length} of ${users.length}`
                      : `${users.length} total`}
                  </span>
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[220px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in progress">In Progress</SelectItem>
                      <SelectItem value="not started">Not Started</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const onboarding = onboardingByEmail.get(user.email.toLowerCase());
                        const onboardingStatus = getOnboardingStatus(onboarding);
                        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

                        return (
                          <TableRow key={user.email}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.username}</p>
                                {fullName && (
                                  <p className="text-xs text-gray-500">{fullName}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell className="text-sm">{user.country || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {user.createdAt ? formatDate(user.createdAt) : '-'}
                            </TableCell>
                            <TableCell className="text-sm" title={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined}>
                              {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive !== false ? 'success' : 'destructive'}>
                                {user.isActive !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={onboardingStatus.variant}>
                                {onboardingStatus.label}
                              </Badge>
                            </TableCell>
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
                        <TableCell colSpan={8} className="text-center text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* User Detail Panel */}
          {selectedEmail && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Details</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSelectedEmail('')}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const user = users.find((u) => u.email === selectedEmail);
                  if (!user) return <p className="text-gray-500">User not found</p>;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Username</p>
                        <p className="mt-1">{user.username}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="mt-1">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="mt-1">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="mt-1">{user.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Country</p>
                        <p className="mt-1">{user.country || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Created At</p>
                        <p className="mt-1">{user.createdAt ? formatDateTime(user.createdAt) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Last Login</p>
                        <p className="mt-1">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1">
                          <Badge variant={user.isActive !== false ? 'success' : 'destructive'}>
                            {user.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Onboarding</p>
                        <p className="mt-1">
                          <Badge variant={getOnboardingStatus(selectedOnboarding).variant}>
                            {getOnboardingStatus(selectedOnboarding).label}
                          </Badge>
                        </p>
                      </div>
                      {selectedOnboarding && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Current Step</p>
                            <p className="mt-1">{selectedOnboarding.currentStep ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Step Progress</p>
                            <p className="mt-1">{getStepProgress(selectedOnboarding)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Duration</p>
                            <p className="mt-1">{formatDuration(selectedOnboarding.totalDuration)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
