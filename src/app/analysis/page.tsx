'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAdminOnboarding,
  useCategoryUsage,
  useGroupUsage,
} from '@/lib/hooks/useAdmin';
import {
  adminApi,
  AutoCatQueueStatsData,
} from '@/lib/api/admin';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AnalysisPage() {
  const { data: onboardingUsers = [], isLoading: onboardingLoading, refetch: refetchOnboarding } = useAdminOnboarding();
  const { data: categoryUsage = [], isLoading: categoryUsageLoading, refetch: refetchCategoryUsage } = useCategoryUsage();
  const { data: groupUsage = [], isLoading: groupUsageLoading, refetch: refetchGroupUsage } = useGroupUsage();

  const [isDebugActionInProgress, setIsDebugActionInProgress] = useState(false);
  const [debugFeedback, setDebugFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [debugJobIds, setDebugJobIds] = useState<string[]>([]);
  const [debugJobStates, setDebugJobStates] = useState<Record<string, string>>({});
  const [debugQueueStats, setDebugQueueStats] = useState<AutoCatQueueStatsData | null>(null);

  const stats = useMemo(() => {
    const total = onboardingUsers.length;
    const completed = onboardingUsers.filter((user) => user.completed || user.onboardingCompleted).length;
    const abandoned = onboardingUsers.filter((user) => user.abandoned).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const usersWithDuration = onboardingUsers.filter(
      (user) => typeof user.totalDuration === 'number' && user.totalDuration > 0
    );
    const avgDurationSeconds =
      usersWithDuration.length > 0
        ? Math.round(
            usersWithDuration.reduce((acc, user) => acc + (user.totalDuration || 0), 0) /
              usersWithDuration.length
          )
        : 0;

    const stepCompletion = [1, 2, 3, 4].map((step) => {
      const completedCount = onboardingUsers.filter((user) => {
        if (step === 1) return user.step1Completed;
        if (step === 2) return user.step2Completed;
        if (step === 3) return user.step3Completed;
        return user.step4Completed;
      }).length;
      return {
        step,
        completedCount,
        percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      };
    });

    return { total, completed, abandoned, completionRate, avgDurationSeconds, stepCompletion };
  }, [onboardingUsers]);

  const refreshDebugQueueStats = useCallback(async () => {
    try {
      const queueStats = await adminApi.getAutoCatQueueStats();
      setDebugQueueStats(queueStats);
    } catch {
      // Non-blocking. Debug panel should keep running even if transiently unavailable.
    }
  }, []);

  const pollAutoCatJobs = useCallback(async (jobIds: string[]) => {
    if (jobIds.length === 0) return;

    const pending = new Set(jobIds);
    const maxAttempts = 120;

    for (let attempt = 0; attempt < maxAttempts && pending.size > 0; attempt++) {
      const current = Array.from(pending);
      const statuses = await Promise.all(
        current.map(async (jobId) => {
          try {
            const result = await adminApi.getAutoCatJobStatus(jobId);
            return { jobId, state: result.state };
          } catch {
            return { jobId, state: 'unknown' };
          }
        })
      );

      setDebugJobStates((prev) => {
        const next = { ...prev };
        statuses.forEach(({ jobId, state }) => {
          next[jobId] = state;
        });
        return next;
      });

      statuses.forEach(({ jobId, state }) => {
        if (state === 'completed' || state === 'failed') {
          pending.delete(jobId);
        }
      });

      if (pending.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }, []);

  const handleDebugClearAllCategoryPayee = async () => {
    try {
      setIsDebugActionInProgress(true);
      setDebugFeedback(null);
      const response = await adminApi.debugClearCategoryPayee();
      setDebugFeedback({
        type: 'success',
        message: `Reset category/payee for ${response.updatedCount} transactions`,
      });
      await refreshDebugQueueStats();
    } catch (error: any) {
      setDebugFeedback({
        type: 'error',
        message: error?.response?.data?.message || error?.message || 'Failed to clear category/payee',
      });
    } finally {
      setIsDebugActionInProgress(false);
    }
  };

  const handleDebugApplyAutoCategorizeAll = async () => {
    try {
      setIsDebugActionInProgress(true);
      setDebugFeedback(null);
      const response = await adminApi.debugAutoCategorizeAll();
      const jobIds = response.jobIds ?? (response.jobId ? [response.jobId] : []);

      if (response.mode === 'sync') {
        setDebugFeedback({
          type: 'success',
          message: `Auto-categorization completed for ${response.totalTransactions} transactions`,
        });
      } else {
        setDebugJobIds(jobIds);
        setDebugJobStates({});
        setDebugFeedback({
          type: 'info',
          message: `Queued ${response.totalTransactions} transactions across ${jobIds.length} job(s). Monitoring progress...`,
        });
        await refreshDebugQueueStats();
        await pollAutoCatJobs(jobIds);
        await refreshDebugQueueStats();
        setDebugFeedback({
          type: 'success',
          message: 'Auto-categorization jobs completed',
        });
      }
    } catch (error: any) {
      setDebugFeedback({
        type: 'error',
        message: error?.response?.data?.message || error?.message || 'Failed to auto-categorize transactions',
      });
    } finally {
      setIsDebugActionInProgress(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      refetchOnboarding(),
      refetchCategoryUsage(),
      refetchGroupUsage(),
      refreshDebugQueueStats(),
    ]);
  };

  const loading = onboardingLoading || categoryUsageLoading || groupUsageLoading;

  useEffect(() => {
    void refreshDebugQueueStats();
    const timer = setInterval(() => {
      void refreshDebugQueueStats();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshDebugQueueStats]);

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Insights</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Onboarding flow and user naming patterns
              </p>
            </div>
            <Button onClick={refreshAll} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Onboarding Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Abandoned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.abandoned}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgDurationSeconds}s</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Step Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.stepCompletion.map((step) => (
                  <div key={step.step} className="flex items-center justify-between rounded border p-3">
                    <div className="font-medium">Step {step.step}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {step.completedCount} users ({step.percent}%)
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category Names Used by Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Distinct Users</TableHead>
                      <TableHead>Total Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryUsage.slice(0, 30).map((row) => (
                      <TableRow key={row.normalizedName}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.distinctUsers}</TableCell>
                        <TableCell>{row.totalRecords}</TableCell>
                      </TableRow>
                    ))}
                    {categoryUsage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[var(--muted-foreground)]">
                          No category usage found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Group Names Used by Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Distinct Users</TableHead>
                      <TableHead>Total Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupUsage.slice(0, 30).map((row) => (
                      <TableRow key={row.normalizedName}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.distinctUsers}</TableCell>
                        <TableCell>{row.totalRecords}</TableCell>
                      </TableRow>
                    ))}
                    {groupUsage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[var(--muted-foreground)]">
                          No group usage found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction Auto-Categorization Debug</CardTitle>
                <Badge variant="secondary">Dynamic Queue Monitor</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleDebugClearAllCategoryPayee}
                  disabled={isDebugActionInProgress}
                >
                  {isDebugActionInProgress ? 'Processing...' : 'Clear All Category/Payee'}
                </Button>
                <Button
                  onClick={handleDebugApplyAutoCategorizeAll}
                  disabled={isDebugActionInProgress}
                >
                  {isDebugActionInProgress ? 'Processing...' : 'Apply Auto-Categorize to All'}
                </Button>
              </div>

              {debugFeedback && (
                <div
                  className={`rounded border px-3 py-2 text-sm ${
                    debugFeedback.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : debugFeedback.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                  }`}
                >
                  {debugFeedback.message}
                </div>
              )}

              <div className="rounded border px-3 py-2 text-sm">
                <div className="font-medium mb-1">Queue Status</div>
                {debugQueueStats ? (
                  <div className="text-[var(--muted-foreground)]">
                    waiting {debugQueueStats.waiting} | active {debugQueueStats.active} | completed{' '}
                    {debugQueueStats.completed} | failed {debugQueueStats.failed} | delayed{' '}
                    {debugQueueStats.delayed}
                  </div>
                ) : (
                  <div className="text-[var(--muted-foreground)]">Queue stats unavailable</div>
                )}
              </div>

              {debugJobIds.length > 0 && (
                <div className="rounded border px-3 py-2 text-sm">
                  <div className="font-medium mb-1">Recent Jobs</div>
                  <div className="text-[var(--muted-foreground)] break-all">
                    {debugJobIds
                      .map((jobId) => `${jobId}:${debugJobStates[jobId] || 'queued'}`)
                      .join(' | ')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
