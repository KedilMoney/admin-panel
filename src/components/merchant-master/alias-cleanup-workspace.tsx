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
import {
  useMerchantProfiles,
  useRunMerchantAliasCleanup,
} from '@/lib/hooks/useMerchantProfiles';
import type {
  MerchantAliasCleanupAction,
  MerchantAliasCleanupCorrection,
  MerchantAliasCleanupResult,
} from '@/types';

type RowAction = 'system' | 'link' | 'rename' | 'delete' | 'keep';
type WorkspaceStep = 'intro' | 'review' | 'done';

type RowState = {
  selected: boolean;
  action: RowAction;
  renameTo: string;
  linkToMerchantId: string;
};

const PAGE_SIZE = 40;

const ACTION_OPTIONS: { value: RowAction; label: string }[] = [
  { value: 'system', label: 'Use system suggestion' },
  { value: 'link', label: 'Link to merchant' },
  { value: 'rename', label: 'Rename' },
  { value: 'delete', label: 'Delete alias' },
  { value: 'keep', label: 'Keep unchanged' },
];

function actionId(action: MerchantAliasCleanupAction): string {
  if (action.type === 'merge') return action.sourceAliasId ?? action.aliasId ?? action.rawName;
  return action.aliasId ?? action.rawName;
}

function systemSuggestionText(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return 'Delete this alias';
  if (action.type === 'merge') {
    return `Combine into "${action.sanitizedName ?? action.merchantName ?? 'canonical alias'}"`;
  }
  return `Rename to "${action.sanitizedName ?? '—'}"`;
}

function defaultRenameTo(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return '';
  return (action.sanitizedName ?? action.merchantName ?? '').trim();
}

function createRowState(action: MerchantAliasCleanupAction): RowState {
  return {
    selected: false,
    action: 'system',
    renameTo: defaultRenameTo(action),
    linkToMerchantId: '',
  };
}

function formatSubmitError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    const apiMessage = axiosError.response?.data?.message ?? axiosError.response?.data?.error;
    if (apiMessage) return apiMessage;
  }
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
    if (!state.selected) continue;

    if (state.action === 'keep') {
      corrections.push({ aliasId: id, decision: 'keep_original', remember: true });
      continue;
    }

    if (state.action === 'system') {
      corrections.push({ aliasId: id, decision: 'accept' });
      continue;
    }

    if (state.action === 'delete') {
      if (action.type === 'delete') {
        corrections.push({ aliasId: id, decision: 'accept' });
      } else {
        corrections.push({ aliasId: id, decision: 'force_delete' });
      }
      continue;
    }

    if (state.action === 'link') {
      if (!state.linkToMerchantId) continue;
      corrections.push({
        aliasId: id,
        decision: 'assign_to_merchant',
        targetMerchantProfileId: state.linkToMerchantId,
      });
      continue;
    }

    if (state.action === 'rename') {
      const customName = state.renameTo.trim();
      if (!customName) continue;
      const systemName = defaultRenameTo(action);
      if (action.type === 'update' && customName === systemName) {
        corrections.push({ aliasId: id, decision: 'accept' });
      } else {
        corrections.push({ aliasId: id, decision: 'custom_name', customName });
      }
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

export function AliasCleanupWorkspace() {
  const aliasCleanup = useRunMerchantAliasCleanup();
  const [step, setStep] = useState<WorkspaceStep>('intro');
  const [report, setReport] = useState<MerchantAliasCleanupResult | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [merchantSearch, setMerchantSearch] = useState('');
  const [bulkMerchantId, setBulkMerchantId] = useState('');
  const [bulkRenameValue, setBulkRenameValue] = useState('');

  const { data: merchantData } = useMerchantProfiles(merchantSearch || undefined);
  const merchants = merchantData?.merchants ?? [];

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
    if (!query) return changes;
    return changes.filter((action) => {
      const haystack = [action.merchantName, action.rawName, action.sanitizedName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [changes, search]);

  const pageCount = Math.max(1, Math.ceil(filteredChanges.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = filteredChanges.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const selectedChanges = useMemo(() => {
    return changes.filter((action) => rowStates[actionId(action)]?.selected);
  }, [changes, rowStates]);

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((action) => rowStates[actionId(action)]?.selected);

  const merchantNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const merchant of merchants) {
      map.set(merchant.id, merchant.canonicalName);
    }
    return map;
  }, [merchants]);

  const resetWorkspace = () => {
    setStep('intro');
    setReport(null);
    setError('');
    setSuccessMessage('');
    setSearch('');
    setPage(0);
    setRowStates({});
    setMerchantSearch('');
    setBulkMerchantId('');
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
      setError('Select at least one row first.');
      return;
    }

    const invalidLink = selectedChanges.some((action) => {
      const state = rowStates[actionId(action)] ?? createRowState(action);
      return state.action === 'link' && !state.linkToMerchantId;
    });
    if (invalidLink) {
      setError('Some selected rows are set to "Link to merchant" but no merchant is chosen.');
      return;
    }

    const invalidRename = selectedChanges.some((action) => {
      const state = rowStates[actionId(action)] ?? createRowState(action);
      return state.action === 'rename' && !state.renameTo.trim();
    });
    if (invalidRename) {
      setError('Some selected rows are set to Rename but the name is empty.');
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
        setSuccessMessage(`Done. Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}.`);
      } else {
        setStep('review');
        setSuccessMessage(
          `Applied ${appliedCount} change${appliedCount === 1 ? '' : 's'}. ${nextChanges.length} still left — continue when ready.`
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
        ...(current[id] ?? {
          selected: false,
          action: 'system',
          renameTo: '',
          linkToMerchantId: '',
        }),
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
    action: RowAction,
    extras?: { renameTo?: string; linkToMerchantId?: string }
  ) => {
    setRowStates((current) => {
      const next = { ...current };
      for (const row of actions) {
        const id = actionId(row);
        const base = next[id] ?? createRowState(row);
        next[id] = {
          ...base,
          selected: true,
          action,
          renameTo:
            action === 'rename'
              ? (extras?.renameTo ?? base.renameTo ?? defaultRenameTo(row))
              : base.renameTo,
          linkToMerchantId:
            action === 'link'
              ? (extras?.linkToMerchantId ?? base.linkToMerchantId)
              : base.linkToMerchantId,
        };
      }
      return next;
    });
  };

  const togglePageSelection = () => {
    setSelectionForActions(pageItems, !allPageSelected);
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
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Search aliases, select the rows you want, choose what to do, then apply. To attach
            aliases to an existing merchant like Amazon, use &quot;Link to merchant&quot;.
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
              Scan aliases
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

      {report && step !== 'intro' ? (
        <>
          {(report.protectedCount ?? 0) > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-[var(--muted-foreground)]">
              <ShieldCheck className="h-4 w-4" />
              {report.protectedCount} aliases skipped (protected from earlier runs).
            </div>
          ) : null}

          {step === 'done' ? (
            <Card>
              <CardHeader>
                <CardTitle>All done</CardTitle>
                <CardDescription>No more proposed changes from the latest scan.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {step === 'review' ? (
            <Card>
              <CardHeader>
                <CardTitle>Fix aliases</CardTitle>
                <CardDescription>
                  {report.summary.normalized} renames, {report.summary.merged} duplicates,{' '}
                  {report.summary.deleted} junk — {changes.length} total to review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(0);
                    }}
                    placeholder="Search e.g. GROWW or Amazon"
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filteredChanges.length === 0}
                    onClick={() => setSelectionForActions(filteredChanges, true)}
                  >
                    Select all {filteredChanges.length} shown
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filteredChanges.length === 0}
                    onClick={() => setSelectionForActions(filteredChanges, false)}
                  >
                    Clear selection
                  </Button>
                  <Button size="sm" variant="outline" onClick={togglePageSelection}>
                    {allPageSelected ? 'Clear this page' : 'Select this page'}
                  </Button>
                  <span className="self-center text-sm text-[var(--muted-foreground)]">
                    {selectedChanges.length} selected
                  </span>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium">Bulk action for selected rows</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--muted-foreground)]">
                        Link to merchant
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={merchantSearch}
                          onChange={(event) => setMerchantSearch(event.target.value)}
                          placeholder="Search merchant e.g. Amazon"
                          className="w-48 text-sm"
                        />
                        <select
                          className="rounded-md border bg-background px-2 py-2 text-sm min-w-[160px]"
                          value={bulkMerchantId}
                          onChange={(event) => setBulkMerchantId(event.target.value)}
                        >
                          <option value="">Pick merchant…</option>
                          {merchants.map((merchant) => (
                            <option key={merchant.id} value={merchant.id}>
                              {merchant.canonicalName}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedChanges.length === 0 || !bulkMerchantId}
                          onClick={() =>
                            setBulkAction(selectedChanges, 'link', {
                              linkToMerchantId: bulkMerchantId,
                            })
                          }
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--muted-foreground)]">Rename to</label>
                      <div className="flex gap-2">
                        <Input
                          value={bulkRenameValue}
                          onChange={(event) => setBulkRenameValue(event.target.value)}
                          placeholder="New alias name"
                          className="w-48 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedChanges.length === 0 || !bulkRenameValue.trim()}
                          onClick={() =>
                            setBulkAction(selectedChanges, 'rename', {
                              renameTo: bulkRenameValue.trim(),
                            })
                          }
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() => setBulkAction(selectedChanges, 'delete')}
                    >
                      Delete selected aliases
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() => setBulkAction(selectedChanges, 'keep')}
                    >
                      Keep selected unchanged
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedChanges.length === 0}
                      onClick={() => setBulkAction(selectedChanges, 'system')}
                    >
                      Use system suggestion
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all on page"
                            checked={allPageSelected}
                            onChange={togglePageSelection}
                          />
                        </TableHead>
                        <TableHead>Current merchant</TableHead>
                        <TableHead>Alias text</TableHead>
                        <TableHead className="w-[180px]">What to do</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-[var(--muted-foreground)]">
                            No matches.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageItems.map((action) => {
                          const id = actionId(action);
                          const state = rowStates[id] ?? createRowState(action);
                          const linkedName = state.linkToMerchantId
                            ? merchantNameById.get(state.linkToMerchantId)
                            : undefined;

                          return (
                            <TableRow
                              key={id}
                              className={state.selected ? 'bg-muted/30' : undefined}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={state.selected}
                                  onChange={(event) =>
                                    updateRow(id, { selected: event.target.checked })
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {action.merchantName ?? 'Unknown'}
                              </TableCell>
                              <TableCell className="max-w-[320px] break-all font-mono text-xs">
                                {action.rawName}
                              </TableCell>
                              <TableCell>
                                <select
                                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                                  value={state.action}
                                  onChange={(event) =>
                                    updateRow(id, {
                                      selected: true,
                                      action: event.target.value as RowAction,
                                    })
                                  }
                                >
                                  {ACTION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>
                              <TableCell className="text-sm">
                                {state.action === 'system' ? (
                                  <span className="text-[var(--muted-foreground)]">
                                    {systemSuggestionText(action)}
                                  </span>
                                ) : null}
                                {state.action === 'link' ? (
                                  <select
                                    className="w-full max-w-[220px] rounded-md border bg-background px-2 py-1 text-sm"
                                    value={state.linkToMerchantId}
                                    onChange={(event) =>
                                      updateRow(id, {
                                        selected: true,
                                        linkToMerchantId: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Pick merchant…</option>
                                    {merchants.map((merchant) => (
                                      <option key={merchant.id} value={merchant.id}>
                                        {merchant.canonicalName}
                                      </option>
                                    ))}
                                  </select>
                                ) : null}
                                {state.action === 'link' && linkedName ? (
                                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                    Will link to {linkedName}
                                  </p>
                                ) : null}
                                {state.action === 'rename' ? (
                                  <Input
                                    value={state.renameTo}
                                    onChange={(event) =>
                                      updateRow(id, {
                                        selected: true,
                                        renameTo: event.target.value,
                                      })
                                    }
                                    className="mt-1 font-mono text-xs"
                                    placeholder="New name"
                                  />
                                ) : null}
                                {state.action === 'delete' ? (
                                  <span className="text-[var(--muted-foreground)]">
                                    Alias will be deleted
                                  </span>
                                ) : null}
                                {state.action === 'keep' ? (
                                  <span className="text-[var(--muted-foreground)]">
                                    No change
                                  </span>
                                ) : null}
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
                    Page {currentPage + 1} of {pageCount} · {filteredChanges.length} rows
                  </p>
                  <div className="flex gap-2">
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
