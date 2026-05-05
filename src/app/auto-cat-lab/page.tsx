'use client';

import { useCallback, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin';
import { CheckCircle2, Loader2, Play, RotateCcw, XCircle } from 'lucide-react';

type SuiteStatus = 'idle' | 'running' | 'passed' | 'failed';
type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface TestStep {
  key: string;
  title: string;
  description: string;
  status: StepStatus;
  details?: string;
}

const BASE_STEPS: TestStep[] = [
  {
    key: 'preflight',
    title: 'Preflight Queue Check',
    description: 'Verifies the queue stats endpoint is reachable before execution.',
    status: 'pending',
  },
  {
    key: 'reset',
    title: 'Reset Category/Payee',
    description: 'Calls debug clear-all endpoint to reset category and payee for transactions.',
    status: 'pending',
  },
  {
    key: 'apply',
    title: 'Apply Auto-Categorize All',
    description: 'Triggers full auto-categorization in forced async + recategorize mode.',
    status: 'pending',
  },
  {
    key: 'monitor',
    title: 'Monitor Job Lifecycle',
    description: 'Polls job status until completion or failure for all returned job IDs.',
    status: 'pending',
  },
  {
    key: 'postcheck',
    title: 'Post-Run Queue Snapshot',
    description: 'Reads queue stats at the end to confirm stable queue state.',
    status: 'pending',
  },
];

const formatTime = (date: Date) =>
  `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

const getStatusTone = (status: StepStatus) => {
  if (status === 'passed') return 'text-green-700';
  if (status === 'failed') return 'text-red-700';
  if (status === 'running') return 'text-blue-700';
  return 'text-[var(--muted-foreground)]';
};

export default function AutoCatLabPage() {
  const [suiteStatus, setSuiteStatus] = useState<SuiteStatus>('idle');
  const [steps, setSteps] = useState<TestStep[]>(BASE_STEPS);
  const [runStartedAt, setRunStartedAt] = useState<Date | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<Date | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [jobStates, setJobStates] = useState<Record<string, string>>({});
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [preflightSummary, setPreflightSummary] = useState<string | null>(null);
  const [postRunSummary, setPostRunSummary] = useState<string | null>(null);

  const updateStep = useCallback((key: string, patch: Partial<TestStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.key === key ? { ...step, ...patch } : step))
    );
  }, []);

  const resetSuite = useCallback(() => {
    setSuiteStatus('idle');
    setSteps(BASE_STEPS);
    setRunStartedAt(null);
    setRunFinishedAt(null);
    setRunError(null);
    setJobStates({});
    setJobIds([]);
    setPreflightSummary(null);
    setPostRunSummary(null);
  }, []);

  const suiteBadge = useMemo(() => {
    if (suiteStatus === 'passed') return <Badge className="bg-green-100 text-green-700">Passed</Badge>;
    if (suiteStatus === 'failed') return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
    if (suiteStatus === 'running') return <Badge className="bg-blue-100 text-blue-700">Running</Badge>;
    return <Badge variant="secondary">Idle</Badge>;
  }, [suiteStatus]);

  const runSuite = useCallback(async () => {
    setSuiteStatus('running');
    setSteps(BASE_STEPS.map((step) => ({ ...step, status: 'pending', details: undefined })));
    setRunStartedAt(new Date());
    setRunFinishedAt(null);
    setRunError(null);
    setJobStates({});
    setJobIds([]);
    setPreflightSummary(null);
    setPostRunSummary(null);

    try {
      updateStep('preflight', { status: 'running' });
      const preStats = await adminApi.getAutoCatQueueStats();
      const preSummary = `waiting ${preStats.waiting}, active ${preStats.active}, completed ${preStats.completed}, failed ${preStats.failed}, delayed ${preStats.delayed}`;
      setPreflightSummary(preSummary);
      updateStep('preflight', { status: 'passed', details: preSummary });

      updateStep('reset', { status: 'running' });
      const clearResult = await adminApi.debugClearCategoryPayee();
      updateStep('reset', {
        status: 'passed',
        details: `Reset ${clearResult.updatedCount} transactions (scope: ${clearResult.scope})`,
      });

      updateStep('apply', { status: 'running' });
      const applyResult = await adminApi.debugAutoCategorizeAll();
      const returnedJobIds = applyResult.jobIds ?? (applyResult.jobId ? [applyResult.jobId] : []);
      setJobIds(returnedJobIds);
      updateStep('apply', {
        status: 'passed',
        details:
          applyResult.mode === 'sync'
            ? `Completed synchronously for ${applyResult.totalTransactions} transactions`
            : `Queued ${applyResult.totalTransactions} transactions as ${returnedJobIds.length} jobs`,
      });

      if (applyResult.mode === 'sync' || returnedJobIds.length === 0) {
        updateStep('monitor', {
          status: 'skipped',
          details: 'Monitoring skipped because run completed synchronously.',
        });
      } else {
        updateStep('monitor', { status: 'running' });
        const pending = new Set(returnedJobIds);
        const maxAttempts = 120;
        const latestStates: Record<string, string> = {};

        for (let attempt = 0; attempt < maxAttempts && pending.size > 0; attempt++) {
          const currentJobIds = Array.from(pending);
          const statuses = await Promise.all(
            currentJobIds.map(async (jobId) => {
              try {
                const result = await adminApi.getAutoCatJobStatus(jobId);
                return { jobId, state: result.state };
              } catch {
                return { jobId, state: 'unknown' };
              }
            })
          );

          setJobStates((prev) => {
            const next = { ...prev };
            statuses.forEach(({ jobId, state }) => {
              next[jobId] = state;
              latestStates[jobId] = state;
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

        const hasFailures = returnedJobIds.some((id) => latestStates[id] === 'failed');
        if (hasFailures) {
          throw new Error('One or more auto-categorization jobs failed. Check job status table.');
        }

        updateStep('monitor', {
          status: 'passed',
          details: `All ${returnedJobIds.length} jobs completed successfully.`,
        });
      }

      updateStep('postcheck', { status: 'running' });
      const postStats = await adminApi.getAutoCatQueueStats();
      const postSummary = `waiting ${postStats.waiting}, active ${postStats.active}, completed ${postStats.completed}, failed ${postStats.failed}, delayed ${postStats.delayed}`;
      setPostRunSummary(postSummary);
      updateStep('postcheck', { status: 'passed', details: postSummary });

      setSuiteStatus('passed');
      setRunFinishedAt(new Date());
    } catch (error: any) {
      setSuiteStatus('failed');
      setRunFinishedAt(new Date());
      setRunError(error?.response?.data?.message || error?.message || 'E2E suite failed');
    }
  }, [updateStep]);

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Auto-Cat Lab — E2E Test Suite</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                End-to-end validation flow for transaction auto-categorization debug endpoints.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {suiteBadge}
              <Button onClick={runSuite} disabled={suiteStatus === 'running'}>
                {suiteStatus === 'running' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run E2E Suite
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetSuite} disabled={suiteStatus === 'running'}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Sample</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <p>
                Use this area to validate how the auto-categorization engine behaves for a specific
                real-world transaction descriptor before running the full E2E suite.
              </p>
              <div className="rounded border bg-[var(--muted)]/30 p-3">
                <p className="font-medium text-[var(--foreground)]">Recommended input format</p>
                <p className="mt-1">
                  Provide the raw bank descriptor exactly as it appears in source data (for example:
                  UPI/merchant/bank fragments), along with the transaction amount.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded border p-3">
                  <p className="font-medium text-[var(--foreground)]">When to use</p>
                  <p className="mt-1">
                    Use this for targeted checks, regression triage, and verifying merchant/tag
                    enrichment behavior before bulk execution.
                  </p>
                </div>
                <div className="rounded border p-3">
                  <p className="font-medium text-[var(--foreground)]">Expected outcome</p>
                  <p className="mt-1">
                    The result should indicate resolved merchant/category signals and whether the
                    decision came from cache, deterministic rules, or model-assisted inference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Started:</span>{' '}
                <span className="text-[var(--muted-foreground)]">
                  {runStartedAt ? formatTime(runStartedAt) : '-'}
                </span>
              </div>
              <div>
                <span className="font-medium">Finished:</span>{' '}
                <span className="text-[var(--muted-foreground)]">
                  {runFinishedAt ? formatTime(runFinishedAt) : '-'}
                </span>
              </div>
              {runError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {runError}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step, index) => (
                    <TableRow key={step.key}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{step.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 capitalize ${getStatusTone(step.status)}`}>
                          {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                          {step.status === 'passed' && <CheckCircle2 className="h-4 w-4" />}
                          {step.status === 'failed' && <XCircle className="h-4 w-4" />}
                          {step.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">{step.details || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Preflight Queue Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                {preflightSummary || 'Run suite to capture preflight queue stats.'}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Post-Run Queue Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                {postRunSummary || 'Run suite to capture post-run queue stats.'}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job Statuses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {jobIds.length === 0 ? (
                <div className="text-[var(--muted-foreground)]">No jobs yet. Run the suite first.</div>
              ) : (
                jobIds.map((jobId) => (
                  <div key={jobId} className="rounded border px-3 py-2">
                    <span className="font-mono text-xs">{jobId}</span>
                    <span className="ml-2 text-[var(--muted-foreground)]">
                      {jobStates[jobId] || 'queued'}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

