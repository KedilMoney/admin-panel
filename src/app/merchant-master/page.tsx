'use client';

import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useMerchantMaster } from '@/lib/hooks/useMerchantMaster';
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
import { RefreshCw, Store, Regex, Layers } from 'lucide-react';
import type { MerchantMasterRuleType } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_FILTER_ALL = '__all__';
const CATEGORY_FILTER_ALL = '__all__';

const typeBadgeVariant = (type: MerchantMasterRuleType) => {
  if (type === 'Savings') return 'success' as const;
  if (type === 'Want') return 'secondary' as const;
  return 'outline' as const;
};

type TabKey = 'upi' | 'patterns';

export default function MerchantMasterPage() {
  const { data, isLoading, error, refetch, isFetching } = useMerchantMaster();
  const [tab, setTab] = useState<TabKey>('upi');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_FILTER_ALL);

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

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Merchant master
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
                Live rules from the API (<code className="rounded bg-[var(--accent)] px-1 py-0.5 text-xs">{meta.source}</code>
                ). Deploy a backend change to update this view — refresh or revisit the page to pull the latest.
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Dataset last updated: <span className="font-medium text-[var(--foreground)]">{meta.lastUpdated}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="shrink-0"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>

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
                Filter and search. UPI rules use plain substrings; name rules use case-insensitive regex.
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
                        <TableHead className="w-[32%]">UPI substring</TableHead>
                        <TableHead>System category</TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUpi.map((row, idx) => (
                        <TableRow key={`upi-${idx}-${row.match}-${row.systemCategoryName}`}>
                          <TableCell>
                            <code className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs font-mono">
                              {row.match}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{row.systemCategoryName}</TableCell>
                          <TableCell>
                            <Badge variant={typeBadgeVariant(row.type)}>{row.type}</Badge>
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
                        <TableHead className="min-w-[240px]">Regex pattern</TableHead>
                        <TableHead>System category</TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatterns.map((row, idx) => (
                        <TableRow key={`${idx}-${row.systemCategoryName}-${row.type}`}>
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
