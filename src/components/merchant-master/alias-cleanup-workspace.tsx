'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRunMerchantAliasCleanup } from '@/lib/hooks/useMerchantProfiles';
import type {
  MerchantAliasCleanupAction,
  MerchantAliasCleanupCorrection,
  MerchantAliasCleanupResult,
} from '@/types';

type CleanupFilter = 'all' | 'update' | 'merge' | 'delete';
type RowActionChoice = 'merge' | 'rename' | 'delete' | 'keep';
type WorkspaceStep = 'intro' | 'review' | 'done';

type RowState = {
  selected: boolean;
  actionChoice: RowActionChoice;
  renameTo: string;
};

const PAGE_SIZE = 40;

const FILTER_LABELS: Record<CleanupFilter, string> = {
  all: 'All',
  update: 'Renames',
  merge: 'Duplicates',
  delete: 'Junk',
};

const ACTION_LABELS: Record<RowActionChoice, string> = {
  merge: 'Merge',
  rename: 'Rename',
  delete: 'Remove',
  keep: 'Keep original',
};

function actionId(action: MerchantAliasCleanupAction): string {
  if (action.type === 'merge') return action.sourceAliasId ?? action.aliasId ?? action.rawName;
  return action.aliasId ?? action.rawName;
}

function actionKind(action: MerchantAliasCleanupAction): CleanupFilter {
  if (action.type === 'merge') return 'merge';
  if (action.type === 'delete') return 'delete';
  return 'update';
}

function systemActionLabel(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return 'Remove';
  if (action.type === 'merge') return 'Merge';
  return 'Rename';
}

function defaultActionChoice(action: MerchantAliasCleanupAction): RowActionChoice {
  if (action.type === 'merge') return 'merge';
  if (action.type === 'delete') return 'delete';
  return 'rename';
}

function defaultRenameTo(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return '';
  return (action.sanitizedName ?? action.merchantName ?? '').trim();
}

function reasonText(action: MerchantAliasCleanupAction): string {
  const labels: Record<string, string> = {
    payment_reference: 'Payment reference number',
    upi_handle: 'UPI handle',
    bank_or_payment_noise: 'Bank/payment boilerplate',
    only_noise: 'No merchant name left',
    too_short: 'Too short',
    normalized: 'Formatting cleanup',
    admin_protected: 'Protected from a prior review',
    admin_corrected: 'Corrected by admin',
    admin_force_delete: 'Marked for removal by admin',
  };
  if (action.reasons.length === 0) return 'Looks like bank-statement noise';
  return action.reasons.map((reason) => labels[reason] ?? reason).join(' · ');
}

function createRowState(action: MerchantAliasCleanupAction): RowState {
  return {
    selected: false,
    actionChoice: defaultActionChoice(action),
    renameTo: defaultRenameTo(action),
  };
}

function formatSubmitError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unable to run alias cleanup.';
}

function buildCorrections(
  changes: MerchantAliasCleanupAction[],
  rowStates: Record<string, RowState>
): MerchantAliasCleanupCorrection[] {
  const corrections: MerchantAliasCleanupCorrection[] = [];

  for (const action of changes) {
    const id = actionId(action);
    const state = rowStates[id] ?? createRowState(action);

    if (!state.selected) {
      corrections.push({ aliasId: id, decision: 'skip' });
      continue;
    }

    if (state.actionChoice === 'keep') {
      corrections.push({ aliasId: id, decision: 'keep_original', remember: true });
      continue;
    }

    if (state.actionChoice === 'delete') {
      if (action.type !== 'delete') {
        corrections.push({ aliasId: id, decision: 'force_delete' });
      }
      continue;
    }

    if (state.actionChoice === 'merge') {
      continue;
    }

    if (state.actionChoice === 'rename') {
      const customName = state.renameTo.trim();
      if (!customName) continue;
      const systemName = defaultRenameTo(action);
      const systemChoice = defaultActionChoice(action);
      if (systemChoice === 'rename' && customName === systemName) continue;
      corrections.push({ aliasId: id, decision: 'custom_name', customName });
    }
  }

  return corrections;
}

function initRowStates(actions: MerchantAliasCleanupAction[]): Record<string, RowState> {
  const initialStates: Record<string, RowState> = {};
  for (const action of actions) {
    initialStates[actionId(action)] = createRowState(action);
  }
  return initialStates;
}

function availableActionChoices(action: MerchantAliasCleanupAction): RowActionChoice[] {
  const choices: RowActionChoice[] = ['rename', 'delete', 'keep'];
  if (action.type === 'merge') choices.unshift('merge');
  return choices;
}

function resultPreview(action: MerchantAliasCleanupAction, state: RowState): string {
  if (state.actionChoice === 'delete') return '— remove —';
  if (state.actionChoice === 'keep') return action.rawName;
  if (state.actionChoice === 'merge') return action.sanitizedName ?? '—';
  return state.renameTo.trim() || '—';
}

export function AliasCleanupWorkspace() {
  const aliasCleanup = useRunMerchantAliasCleanup();
  const [step, setStep] = useState<WorkspaceStep>('intro');
  const [report, setReport] = useState<MerchantAliasCleanupResult | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState<CleanupFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [bulkRenameValue, setBulkRenameValue] = useState('');

  const changes = useMemo(() => {
    if (!report) return [];
    return (
      report.changes ?? [
        ...report.samples.normalized,
        ...report.samples.merged,
        ...report.samples.deleted,
        ...report.samples.ambiguous,
      ]
    );
  }, [report]);

  const filteredChanges = useMemo(() => {
    const query = search.trim().toLowerCase();
    return changes.filter((action) => {
      if (filter !== 'all' && actionKind(action) !== filter) return false;
      if (!query) return true;
      const haystack = [
        action.merchantName,
        action.rawName,
        action.sanitizedName,
        systemActionLabel(action),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [changes, filter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredChanges.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filteredChanges.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const selectedChanges = useMemo(() => {
    return changes.filter((action) => rowStates[actionId(action)]?.selected);
  }, [changes, rowStates]);

  const filteredSelectedCount = useMemo(() => {
    return filteredChanges.filter((action) => rowStates[actionId(action)]?.selected).length;
  }, [filteredChanges, rowStates]);

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((action) => rowStates[actionId(action)]?.selected);

  const actionCounts = useMemo(() => {
    const counts = { merge: 0, rename: 0, delete: 0, keep: 0 };
    for (const action of selectedChanges) {
      const choice = rowStates[actionId(action)]?.actionChoice ?? defaultActionChoice(action);
      counts[choice] += 1;
    }
    return counts;
  }, [selectedChanges, rowStates]);

  const resetWorkspace = () => {
    setStep('intro');
    setReport(null);
    setError('');
    setSuccessMessage('');
    setFilter('all');
    setSearch('');
    setPage(0);
    setRowStates({});
    setBulkRenameValue('');
  };

  const runDryScan = async () => {
    setError('');
    setSuccessMessage('');
    try {
      const nextReport = await aliasCleanup.mutateAsync({ apply: false });
      const nextChanges =
        nextReport.changes ?? [
          ...nextReport.samples.normalized,
          ...nextReport.samples.merged,
          ...nextReport.samples.deleted,
        ];
      setRowStates(initRowStates(nextChanges));
      setReport(nextReport);
      setStep('review');
      setPage(0);
    } catch (failure) {
      setError(formatSubmitError(failure));
    }
  };

  const applyCleanup = async () => {
    if (!report) return;
    if (selectedChanges.length === 0) {
      setError('Select at least one row to apply.');
      return;
    }

    const invalidRename = selectedChanges.some((action) => {
      const state = rowStates[actionId(action)] ?? createRowState(action);
      return state.actionChoice === 'rename' && !state.renameTo.trim();
    });
    if (invalidRename) {
      setError('Selected rows set to Rename need a name. Fill in the New alias column or use bulk rename.');
      return;
    }

    setError('');
    setSuccessMessage('');
    const appliedCount = selectedChanges.length;
    const corrections = buildCorrections(changes, rowStates);

    try {
      await aliasCleanup.mutateAsync({ apply: true, corrections });

      const nextReport = await aliasCleanup.mutateAsync({ apply: false });
      const nextChanges =
        nextReport.changes ?? [
          ...nextReport.samples.normalized,
          ...nextReport.samples.merged,
          ...nextReport.samples.deleted,
        ];

      setReport(nextReport);
      setRowStates(initRowStates(nextChanges));
      setPage(0);

      if (nextChanges.length === 0) {
        setStep('done');
        setSuccessMessage(
          `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. No remaining proposed changes.`
        );
      } else {
        setStep('review');
        setSuccessMessage(
          `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. ${nextChanges.length} proposed change${nextChanges.length === 1 ? '' : 's'} still remain — search, select, and apply the next batch when ready.`
        );
      }
    } catch (failure) {
      setError(formatSubmitError(failure));
    }
  };

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRowStates((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { selected: false, actionChoice: 'rename', renameTo: '' }),
        ...patch,
      },
    }));
  };

  const setSelectionForActions = (actions: MerchantAliasCleanupAction[], selected: boolean) => {
    setRowStates((current) => {
      const next = { ...current };
      for (const action of actions) {
        const id = actionId(action);
        next[id] = { ...(next[id] ?? createRowState(action)), selected };
      }
      return next;
    });
  };

  const setBulkAction = (
    actions: MerchantAliasCleanupAction[],
    choice: RowActionChoice,
    options?: { renameTo?: string; useMerchantName?: boolean; select?: boolean }
  ) => {
    setRowStates((current) => {
      const next = { ...current };
      for (const action of actions) {
        const id = actionId(action);
        const base = next[id] ?? createRowState(action);
        const available = availableActionChoices(action);
        const resolvedChoice = available.includes(choice)
          ? choice
          : choice === 'merge'
            ? defaultActionChoice(action)
            : choice;

        let renameTo = base.renameTo;
        if (resolvedChoice === 'rename') {
          if (options?.useMerchantName) {
            renameTo = (action.merchantName ?? defaultRenameTo(action)).trim();
          } else if (options?.renameTo !== undefined) {
            renameTo = options.renameTo;
          }
        }

        next[id] = {
          ...base,
          selected: options?.select === false ? base.selected : true,
          actionChoice: resolvedChoice,
          renameTo,
        };
      }
      return next;
    });
  };

  const resetActionsToSystem = (actions: MerchantAliasCleanupAction[]) => {
    setRowStates((current) => {
      const next = { ...current };
      for (const action of actions) {
        const id = actionId(action);
        const base = next[id] ?? createRowState(action);
        next[id] = {
          ...base,
          actionChoice: defaultActionChoice(action),
          renameTo: defaultRenameTo(action),
        };
      }
      return next;
    });
  };

  const togglePageSelection = () => {
    setSelectionForActions(pageItems, !allPageSelected);
  };

  const applyBulkRenameValue = (actions: MerchantAliasCleanupAction[]) => {
    const name = bulkRenameValue.trim();
    if (!name) {
      setError('Enter a name in the bulk rename field first.');
      return;
    }
    setError('');
    setBulkAction(actions, 'rename', { renameTo: name, select: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/merchant-master"
            className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Merchant Profiles
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Alias cleanup</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
            Search a merchant, select rows, pick the action (Merge / Rename / Remove), and apply in
            small batches. Change the action when the system suggestion is wrong.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {step !== 'intro' ? (
            <Button variant="outline" onClick={resetWorkspace} disabled={aliasCleanup.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start over
            </Button>
          ) : null}
          {step === 'intro' ? (
            <Button onClick={runDryScan} disabled={aliasCleanup.isPending}>
              {aliasCleanup.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run dry scan
            </Button>
          ) : null}
          {step === 'review' ? (
            <Button
              onClick={applyCleanup}
              disabled={aliasCleanup.isPending || selectedChanges.length === 0}
            >
              {aliasCleanup.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Apply {selectedChanges.length} selected
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {step === 'intro' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>1. Scan</CardTitle>
              <CardDescription>
                Read every alias in the database and compare it against cleanup rules.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Pick actions</CardTitle>
              <CardDescription>
                Use the Action dropdown per row — or bulk-set Remove / Rename for many rows at once.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Apply in batches</CardTitle>
              <CardDescription>
                Apply selected rows, then continue with the next merchant group until done.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {report && step !== 'intro' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Scanned</CardDescription>
                <CardTitle className="text-3xl">{report.summary.scanned}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                Total aliases checked
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Already fine</CardDescription>
                <CardTitle className="text-3xl">{report.summary.kept}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                Left unchanged
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Proposed renames</CardDescription>
                <CardTitle className="text-3xl">{report.summary.normalized}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                Messy bank text cleaned up
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Duplicate merges</CardDescription>
                <CardTitle className="text-3xl">{report.summary.merged}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                Same merchant, multiple aliases
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Junk deletes</CardDescription>
                <CardTitle className="text-3xl">{report.summary.deleted}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted-foreground)]">
                Payment refs / pure noise
              </CardContent>
            </Card>
          </div>

          {(report.protectedCount ?? 0) > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              {report.protectedCount} aliases were skipped because you protected them in a previous
              cleanup run.
            </div>
          ) : null}

          {step === 'done' ? (
            <Card>
              <CardHeader>
                <CardTitle>Cleanup complete</CardTitle>
                <CardDescription>
                  {report.learnedCount
                    ? `${report.learnedCount} alias${report.learnedCount === 1 ? '' : 'es'} added to the protected list for future scans.`
                    : 'All proposed changes from the latest scan have been handled.'}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {step === 'review' ? (
            <Card>
              <CardHeader>
                <CardTitle>Review proposed changes</CardTitle>
                <CardDescription>
                  Change the Action column when the system is wrong. Pick Rename to type your own
                  name. Use bulk buttons to set Remove or Rename on all selected rows at once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedChanges.length} selected</Badge>
                  {actionCounts.delete > 0 ? (
                    <Badge variant="destructive">{actionCounts.delete} remove</Badge>
                  ) : null}
                  {actionCounts.rename > 0 ? (
                    <Badge variant="outline">{actionCounts.rename} rename</Badge>
                  ) : null}
                  {actionCounts.merge > 0 ? (
                    <Badge variant="outline">{actionCounts.merge} merge</Badge>
                  ) : null}
                  {actionCounts.keep > 0 ? (
                    <Badge variant="outline">{actionCounts.keep} keep</Badge>
                  ) : null}
                  <Badge variant="outline">{filteredChanges.length} matching filter</Badge>
                  {search.trim() ? (
                    <Badge variant="outline">
                      {filteredSelectedCount} selected in &quot;{search.trim()}&quot;
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(0);
                      }}
                      placeholder="Search merchant or alias, e.g. GROWW"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(FILTER_LABELS) as CleanupFilter[]).map((key) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={filter === key ? 'default' : 'outline'}
                        onClick={() => {
                          setFilter(key);
                          setPage(0);
                        }}
                      >
                        {FILTER_LABELS[key]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filteredChanges.length === 0}
                    onClick={() => setSelectionForActions(filteredChanges, true)}
                  >
                    Select all {filteredChanges.length} filtered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filteredChanges.length === 0}
                    onClick={() => setSelectionForActions(filteredChanges, false)}
                  >
                    Clear filtered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pageItems.length === 0}
                    onClick={togglePageSelection}
                  >
                    {allPageSelected ? 'Clear page' : `Select page (${pageItems.length})`}
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-sm font-medium">Bulk set action</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Selected ({selectedChanges.length}) or filtered ({filteredChanges.length}):
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedChanges.length === 0}
                      onClick={() => setBulkAction(selectedChanges, 'delete')}
                    >
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() =>
                        setBulkAction(selectedChanges, 'rename', { useMerchantName: true })
                      }
                    >
                      Rename to merchant name
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() => setBulkAction(selectedChanges, 'keep')}
                    >
                      Keep original
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() => resetActionsToSystem(selectedChanges)}
                    >
                      Reset to system
                    </Button>
                    <span className="mx-1 text-xs text-[var(--muted-foreground)]">|</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={filteredChanges.length === 0}
                      onClick={() => setBulkAction(filteredChanges, 'delete')}
                    >
                      Filtered → Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filteredChanges.length === 0}
                      onClick={() =>
                        setBulkAction(filteredChanges, 'rename', { useMerchantName: true })
                      }
                    >
                      Filtered → Rename to merchant name
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      value={bulkRenameValue}
                      onChange={(event) => setBulkRenameValue(event.target.value)}
                      placeholder="Same name for all selected, e.g. Groww"
                      className="max-w-xs font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0 || !bulkRenameValue.trim()}
                      onClick={() => applyBulkRenameValue(selectedChanges)}
                    >
                      Rename selected to this
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filteredChanges.length === 0 || !bulkRenameValue.trim()}
                      onClick={() => applyBulkRenameValue(filteredChanges)}
                    >
                      Rename filtered to this
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all rows on this page"
                            checked={allPageSelected}
                            onChange={togglePageSelection}
                          />
                        </TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead className="w-[120px]">Action</TableHead>
                        <TableHead>Current alias</TableHead>
                        <TableHead>New alias</TableHead>
                        <TableHead className="text-[var(--muted-foreground)]">System</TableHead>
                        <TableHead>Why</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-10 text-center text-[var(--muted-foreground)]"
                          >
                            No rows match this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageItems.map((action) => {
                          const id = actionId(action);
                          const state = rowStates[id] ?? createRowState(action);
                          const choices = availableActionChoices(action);
                          const systemDefault = defaultActionChoice(action);
                          const isOverridden = state.actionChoice !== systemDefault;

                          return (
                            <TableRow
                              key={id}
                              className={state.selected ? 'bg-emerald-50/40' : undefined}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${action.merchantName ?? 'merchant'} change`}
                                  checked={state.selected}
                                  onChange={(event) =>
                                    updateRow(id, { selected: event.target.checked })
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {action.merchantName ?? 'Unknown merchant'}
                              </TableCell>
                              <TableCell>
                                <select
                                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                  value={state.actionChoice}
                                  onChange={(event) => {
                                    const nextChoice = event.target.value as RowActionChoice;
                                    updateRow(id, {
                                      selected: true,
                                      actionChoice: nextChoice,
                                      renameTo:
                                        nextChoice === 'rename' && !state.renameTo.trim()
                                          ? defaultRenameTo(action)
                                          : state.renameTo,
                                    });
                                  }}
                                >
                                  {choices.map((choice) => (
                                    <option key={choice} value={choice}>
                                      {ACTION_LABELS[choice]}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>
                              <TableCell className="max-w-[240px] break-all font-mono text-xs">
                                {action.rawName}
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                {state.actionChoice === 'rename' ? (
                                  <Input
                                    value={state.renameTo}
                                    onChange={(event) =>
                                      updateRow(id, {
                                        selected: true,
                                        renameTo: event.target.value,
                                      })
                                    }
                                    className="font-mono text-xs"
                                    placeholder="Type alias name"
                                  />
                                ) : (
                                  <span
                                    className={`break-all font-mono text-xs ${
                                      state.actionChoice === 'delete'
                                        ? 'text-red-700'
                                        : 'text-[var(--muted-foreground)]'
                                    }`}
                                  >
                                    {resultPreview(action, state)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[140px] break-all font-mono text-xs text-[var(--muted-foreground)]">
                                <div>{systemActionLabel(action)}</div>
                                <div className="mt-0.5">
                                  {action.type === 'delete'
                                    ? '— remove —'
                                    : (action.sanitizedName ?? '—')}
                                </div>
                                {isOverridden ? (
                                  <Badge variant="outline" className="mt-1 text-[10px]">
                                    overridden
                                  </Badge>
                                ) : null}
                              </TableCell>
                              <TableCell className="max-w-[180px] text-xs text-[var(--muted-foreground)]">
                                {reasonText(action)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Showing {pageItems.length} of {filteredChanges.length} filtered rows · page{' '}
                    {currentPage + 1} of {pageCount}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 0}
                      onClick={() => setPage((value) => Math.max(0, value - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= pageCount - 1}
                      onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                    >
                      Next
                    </Button>
                    <Button
                      size="sm"
                      disabled={aliasCleanup.isPending || selectedChanges.length === 0}
                      onClick={applyCleanup}
                    >
                      Apply {selectedChanges.length} selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
