'use client';

import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useMerchantMaster, useUpdateMerchantMaster } from '@/lib/hooks/useMerchantMaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Store, Regex, Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import type {
  MerchantMasterNamePatternRule,
  MerchantMasterRuleType,
  MerchantMasterUpiRule,
} from '@/types';
import { cn } from '@/lib/utils';
import {
  MerchantMasterRuleDialog,
  type RuleDialogKind,
} from '@/components/merchant-master/merchant-master-rule-dialog';

const TYPE_FILTER_ALL = '__all__';
const CATEGORY_FILTER_ALL = '__all__';

const typeBadgeVariant = (type: MerchantMasterRuleType) => {
  if (type === 'Savings') return 'success' as const;
  if (type === 'Want') return 'secondary' as const;
  return 'outline' as const;
};

type TabKey = 'upi' | 'patterns';

function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    return typeof msg === 'string' ? msg : err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

function findUpiIndex(rows: MerchantMasterUpiRule[], row: MerchantMasterUpiRule) {
  return rows.findIndex(
    (r) =>
      r.match === row.match &&
      r.systemCategoryName === row.systemCategoryName &&
      r.type === row.type
  );
}

function findPatternIndex(
  rows: MerchantMasterNamePatternRule[],
  row: MerchantMasterNamePatternRule
) {
  return rows.findIndex(
    (r) =>
      r.pattern === row.pattern &&
      r.systemCategoryName === row.systemCategoryName &&
      r.type === row.type
  );
}

export default function MerchantMasterPage() {
  const { data, isLoading, error, refetch, isFetching } = useMerchantMaster();
  const updateMutation = useUpdateMerchantMaster();
  const [tab, setTab] = useState<TabKey>('upi');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_FILTER_ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogKind, setDialogKind] = useState<RuleDialogKind>('upi');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [dialogInitial, setDialogInitial] = useState<{
    primary: string;
    systemCategoryName: string;
    type: MerchantMasterRuleType;
  } | null>(null);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.upiSubstrings.forEach((r) => set.add(r.systemCategoryName));
    data.namePatterns.forEach((r) => set.add(r.systemCategoryName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredUpi = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.upiSubstrings.filter((row) => {
      if (typeFilter !== TYPE_FILTER_ALL && row.type !== typeFilter) return false;
      if (categoryFilter !== CATEGORY_FILTER_ALL && row.systemCategoryName !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        row.match.toLowerCase().includes(q) ||
        row.systemCategoryName.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
      );
    });
  }, [data, search, typeFilter, categoryFilter]);

  const filteredPatterns = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.namePatterns.filter((row) => {
      if (typeFilter !== TYPE_FILTER_ALL && row.type !== typeFilter) return false;
      if (categoryFilter !== CATEGORY_FILTER_ALL && row.systemCategoryName !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        row.pattern.toLowerCase().includes(q) ||
        row.systemCategoryName.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
      );
    });
  }, [data, search, typeFilter, categoryFilter]);

  const openCreate = useCallback(() => {
    setDialogMode('create');
    setEditIndex(null);
    setDialogInitial(null);
    setDialogKind(tab === 'upi' ? 'upi' : 'pattern');
    updateMutation.reset();
    setDialogOpen(true);
  }, [tab, updateMutation]);

  const openEditUpi = useCallback(
    (row: MerchantMasterUpiRule) => {
      if (!data) return;
      const idx = findUpiIndex(data.upiSubstrings, row);
      setDialogMode('edit');
      setDialogKind('upi');
      setEditIndex(idx);
      setDialogInitial({
        primary: row.match,
        systemCategoryName: row.systemCategoryName,
        type: row.type,
      });
      updateMutation.reset();
      setDialogOpen(true);
    },
    [data, updateMutation]
  );

  const openEditPattern = useCallback(
    (row: MerchantMasterNamePatternRule) => {
      if (!data) return;
      const idx = findPatternIndex(data.namePatterns, row);
      setDialogMode('edit');
      setDialogKind('pattern');
      setEditIndex(idx);
      setDialogInitial({
        primary: row.pattern,
        systemCategoryName: row.systemCategoryName,
        type: row.type,
      });
      updateMutation.reset();
      setDialogOpen(true);
    },
    [data, updateMutation]
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) updateMutation.reset();
    },
    [updateMutation]
  );

  const handleDialogSubmit = useCallback(
    (values: { primary: string; systemCategoryName: string; type: MerchantMasterRuleType }) => {
      if (!data) return;
      const upiSubstrings = [...data.upiSubstrings];
      const namePatterns = [...data.namePatterns];

      if (dialogKind === 'upi') {
        const row: MerchantMasterUpiRule = {
          match: values.primary,
          systemCategoryName: values.systemCategoryName,
          type: values.type,
        };
        if (dialogMode === 'edit' && editIndex !== null && editIndex >= 0) {
          upiSubstrings[editIndex] = row;
        } else {
          upiSubstrings.push(row);
        }
      } else {
        const row: MerchantMasterNamePatternRule = {
          pattern: values.primary,
          systemCategoryName: values.systemCategoryName,
          type: values.type,
        };
        if (dialogMode === 'edit' && editIndex !== null && editIndex >= 0) {
          namePatterns[editIndex] = row;
        } else {
          namePatterns.push(row);
        }
      }

      updateMutation.mutate(
        { upiSubstrings, namePatterns },
        { onSuccess: () => setDialogOpen(false) }
      );
    },
    [data, dialogKind, dialogMode, editIndex, updateMutation]
  );

  const deleteUpi = useCallback(
    (row: MerchantMasterUpiRule) => {
      if (!data) return;
      if (typeof window !== 'undefined' && !window.confirm('Delete this UPI substring rule?')) return;
      const idx = findUpiIndex(data.upiSubstrings, row);
      if (idx < 0) return;
      const upiSubstrings = data.upiSubstrings.filter((_, i) => i !== idx);
      updateMutation.mutate({ upiSubstrings, namePatterns: data.namePatterns });
    },
    [data, updateMutation]
  );

  const deletePattern = useCallback(
    (row: MerchantMasterNamePatternRule) => {
      if (!data) return;
      if (typeof window !== 'undefined' && !window.confirm('Delete this name pattern rule?')) return;
      const idx = findPatternIndex(data.namePatterns, row);
      if (idx < 0) return;
      const namePatterns = data.namePatterns.filter((_, i) => i !== idx);
      updateMutation.mutate({ upiSubstrings: data.upiSubstrings, namePatterns });
    },
    [data, updateMutation]
  );

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading merchant rules…</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  if (error || !data) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-800 dark:text-red-200">
            <p className="text-sm">Could not load merchant master data. Check admin access and API URL.</p>
            <Button onClick={() => refetch()} className="mt-3" size="sm" variant="outline">
              Retry
            </Button>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  const { meta } = data;
  const saveError =
    updateMutation.isError && !dialogOpen ? formatApiError(updateMutation.error) : null;

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <MerchantMasterRuleDialog
            open={dialogOpen}
            onOpenChange={handleDialogOpenChange}
            mode={dialogMode}
            kind={dialogKind}
            initial={dialogInitial}
            categories={categories}
            isSubmitting={updateMutation.isPending}
            errorMessage={
              updateMutation.isError ? formatApiError(updateMutation.error) : null
            }
            onSubmit={handleDialogSubmit}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Merchant master
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
                Rules used for Phase A auto-categorization (
                <code className="rounded bg-[var(--accent)] px-1 py-0.5 text-xs">{meta.source}</code>
                ). Edits are saved to the API and apply to new categorization runs (cached briefly on the
                server).
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Dataset last updated:{' '}
                <span className="font-medium text-[var(--foreground)]">{meta.lastUpdated}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="default" size="sm" onClick={openCreate} disabled={updateMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {tab === 'upi' ? 'Add UPI rule' : 'Add pattern'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {saveError && (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
              role="alert"
            >
              {saveError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">UPI substring rules</CardTitle>
                <Store className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{meta.upiSubstringCount}</div>
                <p className="text-xs text-[var(--muted-foreground)]">VPA / narration substrings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Name pattern rules</CardTitle>
                <Regex className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{meta.namePatternCount}</div>
                <p className="text-xs text-[var(--muted-foreground)]">Regex on description / beneficiary</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories in use</CardTitle>
                <Layers className="h-4 w-4 text-[var(--muted-foreground)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-[var(--muted-foreground)]">Distinct system categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Need / Want / Savings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="outline">Need</Badge>
                <Badge variant="secondary">Want</Badge>
                <Badge variant="success">Savings</Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Explore rules</CardTitle>
              <CardDescription>
                Filter and search. Create, edit, or delete rows; changes persist via PUT to the admin API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="merchant-search">
                    Search
                  </label>
                  <Input
                    id="merchant-search"
                    placeholder="Match, pattern, category, or type…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">Type</span>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All types">
                          {typeFilter === TYPE_FILTER_ALL ? 'All types' : typeFilter}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TYPE_FILTER_ALL}>All types</SelectItem>
                        <SelectItem value="Need">Need</SelectItem>
                        <SelectItem value="Want">Want</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">Category</span>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All categories">
                          {categoryFilter === CATEGORY_FILTER_ALL
                            ? 'All categories'
                            : categoryFilter}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CATEGORY_FILTER_ALL}>All categories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
                <button
                  type="button"
                  onClick={() => setTab('upi')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === 'upi'
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  UPI substrings ({filteredUpi.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('patterns')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === 'patterns'
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  Name patterns ({filteredPatterns.length})
                </button>
              </div>

              {tab === 'upi' ? (
                <div className="rounded-md border border-[var(--border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28%]">UPI substring</TableHead>
                        <TableHead>System category</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUpi.map((row) => (
                        <TableRow key={`upi-${row.match}-${row.systemCategoryName}-${row.type}`}>
                          <TableCell>
                            <code className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs font-mono">
                              {row.match}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{row.systemCategoryName}</TableCell>
                          <TableCell>
                            <Badge variant={typeBadgeVariant(row.type)}>{row.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Edit rule"
                                onClick={() => openEditUpi(row)}
                                disabled={updateMutation.isPending}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                                aria-label="Delete rule"
                                onClick={() => deleteUpi(row)}
                                disabled={updateMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredUpi.length === 0 && (
                    <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                      No rows match your filters.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-[var(--border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Regex pattern</TableHead>
                        <TableHead>System category</TableHead>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatterns.map((row) => (
                        <TableRow
                          key={`pat-${row.pattern.slice(0, 48)}-${row.systemCategoryName}-${row.type}`}
                        >
                          <TableCell>
                            <pre
                              className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md border border-[var(--border)] bg-[var(--accent)]/40 p-2 font-mono text-[11px] leading-relaxed"
                              title={row.pattern}
                            >
                              {row.pattern}
                            </pre>
                          </TableCell>
                          <TableCell className="align-top text-sm">{row.systemCategoryName}</TableCell>
                          <TableCell className="align-top">
                            <Badge variant={typeBadgeVariant(row.type)}>{row.type}</Badge>
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Edit rule"
                                onClick={() => openEditPattern(row)}
                                disabled={updateMutation.isPending}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                                aria-label="Delete rule"
                                onClick={() => deletePattern(row)}
                                disabled={updateMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredPatterns.length === 0 && (
                    <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                      No rows match your filters.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
