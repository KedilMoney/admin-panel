'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
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
import { Badge } from '@/components/ui/badge';
import { useEnricherApply, useEnricherScan } from '@/lib/hooks/useEnricher';
import type { EnricherDomain, EnricherScanResult, EnricherSuggestion } from '@/types';

type RowState = {
  selected: boolean;
  customValue: string;
  useCustom: boolean;
};

const PAGE_SIZE = 25;

const DOMAIN_COPY: Record<
  EnricherDomain,
  { title: string; description: string; currentLabel: string; suggestedLabel: string }
> = {
  merchant: {
    title: 'Merchant names',
    description:
      'LLM analyzes noisy UPI/bank narrations and suggests clean merchant names (and tags when present).',
    currentLabel: 'Current merchant',
    suggestedLabel: 'Suggested merchant',
  },
  category: {
    title: 'Categorization',
    description:
      'Finds low-confidence or "Other" merchants and suggests a better system category.',
    currentLabel: 'Current category',
    suggestedLabel: 'Suggested category',
  },
  tag: {
    title: 'Tags',
    description:
      'Extracts short contextual tags from narration (e.g. Fruit, Tea) when profiles are missing them.',
    currentLabel: 'Current tags',
    suggestedLabel: 'Suggested tag',
  },
};

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function createRowState(suggestion: EnricherSuggestion): RowState {
  return {
    selected: false,
    customValue: suggestion.suggestedValue,
    useCustom: false,
  };
}

function formatSubmitError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      axiosError.message ??
      'Request failed'
    );
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export function EnricherTabWorkspace({ domain }: { domain: EnricherDomain }) {
  const copy = DOMAIN_COPY[domain];
  const scan = useEnricherScan();
  const apply = useEnricherApply();

  const [report, setReport] = useState<EnricherScanResult | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const suggestions = report?.suggestions ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((row) => {
      const haystack = [
        row.rawDescriptor,
        row.currentValue,
        row.suggestedValue,
        row.currentMerchant,
        row.reasoning,
        row.issues.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, suggestions]);

  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const selectedSuggestions = suggestions.filter(
    (row) => rowStates[row.suggestionId]?.selected
  );

  const resetWorkspace = () => {
    setReport(null);
    setRowStates({});
    setSearch('');
    setPage(0);
    setError(null);
    setSuccessMessage(null);
  };

  const runScan = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const nextReport = await scan.mutateAsync({ domain, limit: 60 });
      setReport(nextReport);
      const nextStates: Record<string, RowState> = {};
      for (const row of nextReport.suggestions) {
        nextStates[row.suggestionId] = createRowState(row);
      }
      setRowStates(nextStates);
      setPage(0);
    } catch (err) {
      setError(formatSubmitError(err));
    }
  };

  const applySelected = async () => {
    if (!report) return;
    setError(null);
    setSuccessMessage(null);

    const decisions = selectedSuggestions.map((row) => {
      const state = rowStates[row.suggestionId];
      if (state?.useCustom && state.customValue.trim()) {
        return {
          suggestionId: row.suggestionId,
          action: 'custom' as const,
          customValue: state.customValue.trim(),
        };
      }
      return { suggestionId: row.suggestionId, action: 'accept' as const };
    });

    try {
      const result = await apply.mutateAsync({
        domain,
        suggestions: report.suggestions,
        decisions,
      });
      const sync = result.transactionSync;
      const syncNote = sync
        ? ` Synced ${sync.displayUpdated} displays, ${sync.categoriesUpdated} categories, ${sync.tagsRefreshed} tags.`
        : '';
      setSuccessMessage(
        `Applied ${result.applied} suggestion(s). Skipped ${result.skipped}.${syncNote}`
      );
      if (result.errors.length > 0) {
        setError(result.errors.map((row) => `${row.suggestionId}: ${row.message}`).join(' '));
      }
      await runScan();
    } catch (err) {
      setError(formatSubmitError(err));
    }
  };

  const toggleRow = (suggestionId: string, selected: boolean) => {
    setRowStates((prev) => ({
      ...prev,
      [suggestionId]: {
        ...(prev[suggestionId] ?? { customValue: '', useCustom: false, selected: false }),
        selected,
      },
    }));
  };

  const isPending = scan.isPending || apply.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{copy.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {report ? (
            <Button variant="outline" onClick={resetWorkspace} disabled={isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start over
            </Button>
          ) : null}
          <Button onClick={runScan} disabled={isPending}>
            {scan.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run scan
          </Button>
          {report ? (
            <Button
              onClick={applySelected}
              disabled={isPending || selectedSuggestions.length === 0}
            >
              {apply.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Apply {selectedSuggestions.length} selected
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

      {report ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Suggestions
            </CardTitle>
            <CardDescription>
              Scanned {report.summary.scanned} · {report.summary.suggested} to review ·{' '}
              {report.summary.skipped} unchanged
              {report.summary.llmUsed ? ' · LLM active' : ' · extractor fallback'}
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
                placeholder="Search merchant, raw text, issue…"
                className="pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No suggestions in this scan. Try again later as new messy merchants appear.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span>{selectedSuggestions.length} selected</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRowStates((prev) => {
                        const next = { ...prev };
                        for (const row of pageItems) {
                          next[row.suggestionId] = {
                            ...(next[row.suggestionId] ?? createRowState(row)),
                            selected: true,
                          };
                        }
                        return next;
                      });
                    }}
                  >
                    Select page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRowStates((prev) => {
                        const next = { ...prev };
                        for (const row of filtered) {
                          next[row.suggestionId] = {
                            ...(next[row.suggestionId] ?? createRowState(row)),
                            selected: false,
                          };
                        }
                        return next;
                      });
                    }}
                  >
                    Clear all
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Raw narration</TableHead>
                        <TableHead>{copy.currentLabel}</TableHead>
                        <TableHead>{copy.suggestedLabel}</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((row) => {
                        const state = rowStates[row.suggestionId] ?? createRowState(row);
                        return (
                          <TableRow key={row.suggestionId}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={state.selected}
                                onChange={(event) =>
                                  toggleRow(row.suggestionId, event.target.checked)
                                }
                                aria-label={`Select ${row.suggestionId}`}
                              />
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate font-mono text-xs" title={row.rawDescriptor}>
                                {row.rawDescriptor}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {row.issues.slice(0, 3).map((issue) => (
                                  <Badge key={issue} variant="outline" className="text-[10px]">
                                    {issue}
                                  </Badge>
                                ))}
                                <Badge variant="secondary" className="text-[10px]">
                                  {row.source}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{row.currentValue}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{row.suggestedValue}</p>
                                {row.suggestedTag ? (
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    + tag {row.suggestedTag}
                                  </p>
                                ) : null}
                                <label className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={state.useCustom}
                                    onChange={(event) =>
                                      setRowStates((prev) => ({
                                        ...prev,
                                        [row.suggestionId]: {
                                          ...state,
                                          useCustom: event.target.checked,
                                        },
                                      }))
                                    }
                                  />
                                  Custom
                                </label>
                                {state.useCustom ? (
                                  <Input
                                    value={state.customValue}
                                    onChange={(event) =>
                                      setRowStates((prev) => ({
                                        ...prev,
                                        [row.suggestionId]: {
                                          ...state,
                                          customValue: event.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>{formatConfidence(row.confidence)}</TableCell>
                            <TableCell className="max-w-sm text-xs text-[var(--muted-foreground)]">
                              {row.reasoning}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {pageCount > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((value) => Math.max(0, value - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Page {page + 1} of {pageCount}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page + 1 >= pageCount}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ready to scan</CardTitle>
            <CardDescription>
              Run a job to find messy {domain} data and get LLM-backed suggestions. Review and
              apply only what looks correct — fixes propagate to linked user transactions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
