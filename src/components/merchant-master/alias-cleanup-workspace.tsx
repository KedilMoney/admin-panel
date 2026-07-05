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
type RowDecision = Exclude<MerchantAliasCleanupCorrection['decision'], 'skip'>;
type WorkspaceStep = 'intro' | 'review' | 'done';

type RowState = {
  selected: boolean;
  decision: RowDecision;
  customName: string;
  remember: boolean;
};

const PAGE_SIZE = 40;

const FILTER_LABELS: Record<CleanupFilter, string> = {
  all: 'All',
  update: 'Renames',
  merge: 'Duplicates',
  delete: 'Junk',
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

function actionLabel(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return 'Remove junk';
  if (action.type === 'merge') return 'Merge duplicate';
  return 'Rename';
}

function effectiveSuggestedAlias(
  action: MerchantAliasCleanupAction,
  decision: RowDecision
): string {
  if (decision === 'force_delete' || action.type === 'delete') return '— remove —';
  return action.sanitizedName ?? '—';
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
    decision: 'accept',
    customName: action.sanitizedName ?? action.rawName,
    remember: false,
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
      corrections.push({
        aliasId: id,
        decision: 'skip',
        remember: state.remember,
      });
      continue;
    }

    if (state.decision === 'accept') continue;

    corrections.push({
      aliasId: id,
      decision: state.decision,
      customName: state.decision === 'custom_name' ? state.customName.trim() : undefined,
      remember: state.remember || state.decision === 'keep_original',
    });
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
        actionLabel(action),
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

  const allFilteredSelected =
    filteredChanges.length > 0 &&
    filteredChanges.every((action) => rowStates[actionId(action)]?.selected);

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((action) => rowStates[actionId(action)]?.selected);

  const selectedRemoveCount = useMemo(() => {
    return selectedChanges.filter(
      (action) => rowStates[actionId(action)]?.decision === 'force_delete'
    ).length;
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

    setError('');
    setSuccessMessage('');
    const appliedCount = selectedChanges.length;
    const corrections = buildCorrections(changes, rowStates);

    try {
      await aliasCleanup.mutateAsync({
        apply: true,
        corrections,
      });

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
        setSuccessMessage(`Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. No remaining proposed changes.`);
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
        ...(current[id] ?? { selected: false, decision: 'accept', customName: '', remember: false }),
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

  const togglePageSelection = () => {
    setSelectionForActions(pageItems, !allPageSelected);
  };

  const markActionsAsRemoveJunk = (actions: MerchantAliasCleanupAction[]) => {
    setRowStates((current) => {
      const next = { ...current };
      for (const action of actions) {
        const id = actionId(action);
        next[id] = {
          ...(next[id] ?? createRowState(action)),
          selected: true,
          decision: 'force_delete',
        };
      }
      return next;
    });
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
            Nothing is applied until you select rows. Search by merchant keyword, bulk-select the
            matches you trust, apply that batch, then repeat for the next merchant group.
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
              Apply {selectedChanges.length} selected change
              {selectedChanges.length === 1 ? '' : 's'}
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
              <CardTitle>2. Select</CardTitle>
              <CardDescription>
                Search by merchant keyword and select only the rows you want to change in this
                batch.
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
                  Select rows to include in the next apply batch. Override the system action
                  when a suggested rename is still junk — choose &quot;Remove junk alias&quot;
                  to delete it instead.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {selectedChanges.length} selected for apply
                  </Badge>
                  {selectedRemoveCount > 0 ? (
                    <Badge variant="destructive">{selectedRemoveCount} marked remove junk</Badge>
                  ) : null}
                  <Badge variant="outline">{changes.length} total proposed</Badge>
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
                      placeholder="Search merchant or alias, e.g. SANTHIGI"
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
                    Clear filtered selection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pageItems.length === 0}
                    onClick={togglePageSelection}
                  >
                    {allPageSelected ? 'Clear this page' : `Select this page (${pageItems.length})`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filteredChanges.length === 0}
                    onClick={() => markActionsAsRemoveJunk(filteredChanges)}
                  >
                    Mark filtered as remove junk
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedChanges.length === 0}
                    onClick={() => markActionsAsRemoveJunk(selectedChanges)}
                  >
                    Mark selected as remove junk
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={changes.length === 0}
                    onClick={() => setSelectionForActions(changes, false)}
                  >
                    Clear all
                  </Button>
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
                        <TableHead>Action</TableHead>
                        <TableHead>Current alias</TableHead>
                        <TableHead>Suggested alias</TableHead>
                        <TableHead>Why</TableHead>
                        <TableHead>If selected</TableHead>
                        <TableHead>Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-10 text-center text-[var(--muted-foreground)]">
                            No rows match this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageItems.map((action) => {
                          const id = actionId(action);
                          const state = rowStates[id] ?? createRowState(action);
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
                                {state.selected && state.decision === 'force_delete' ? (
                                  <Badge variant="destructive">Remove junk</Badge>
                                ) : (
                                  actionLabel(action)
                                )}
                              </TableCell>
                              <TableCell className="max-w-[280px] break-all font-mono text-xs">
                                {action.rawName}
                              </TableCell>
                              <TableCell className="max-w-[220px] break-all font-mono text-xs">
                                {effectiveSuggestedAlias(action, state.decision)}
                              </TableCell>
                              <TableCell className="max-w-[220px] text-xs text-[var(--muted-foreground)]">
                                {reasonText(action)}
                              </TableCell>
                              <TableCell>
                                <select
                                  className="w-full rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50"
                                  value={state.decision}
                                  disabled={!state.selected}
                                  onChange={(event) =>
                                    updateRow(id, {
                                      decision: event.target.value as RowDecision,
                                      remember: event.target.value === 'keep_original',
                                    })
                                  }
                                >
                                  <option value="accept">Accept suggestion</option>
                                  <option value="force_delete">Remove junk alias</option>
                                  <option value="keep_original">Keep original alias</option>
                                  <option value="custom_name">Use custom name</option>
                                </select>
                              </TableCell>
                              <TableCell>
                                {!state.selected ? (
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    Not in batch
                                  </span>
                                ) : state.decision === 'force_delete' ? (
                                  <span className="text-xs text-red-700">Will delete alias</span>
                                ) : state.decision === 'custom_name' ? (
                                  <Input
                                    value={state.customName}
                                    onChange={(event) =>
                                      updateRow(id, { customName: event.target.value })
                                    }
                                    className="font-mono text-xs"
                                  />
                                ) : state.decision === 'keep_original' ? (
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    Protected on apply
                                  </span>
                                ) : (
                                  <span className="text-xs text-[var(--muted-foreground)]">—</span>
                                )}
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
