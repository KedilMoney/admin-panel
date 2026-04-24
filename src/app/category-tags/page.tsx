'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCategoryTags, useUpdateCategoryTags } from '@/lib/hooks/useAdmin';
import type { SystemCategoryTagRow } from '@/lib/api/admin';
import { RefreshCw, Save, Search, Undo2 } from 'lucide-react';

const parseTagInput = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(Boolean)
    )
  );

const tagsToInput = (tags: string[]): string => tags.join(', ');

export default function CategoryTagsPage() {
  const { data, isLoading, refetch } = useCategoryTags();
  const updateCategoryTags = useUpdateCategoryTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<SystemCategoryTagRow[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.categories) return;
    setDraft(data.categories.map((row) => ({ categoryName: row.categoryName, tags: [...row.tags] })));
    setValidationError(null);
  }, [data]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return draft;
    return draft.filter((row) => {
      const inName = row.categoryName.toLowerCase().includes(query);
      const inTags = row.tags.some((tag) => tag.includes(query));
      return inName || inTags;
    });
  }, [draft, searchQuery]);

  const totalTags = useMemo(
    () => draft.reduce((acc, row) => acc + row.tags.length, 0),
    [draft]
  );

  const hasChanges = useMemo(() => {
    const baseline = data?.categories || [];
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }, [draft, data]);

  const updateRowTags = (categoryName: string, value: string) => {
    setDraft((prev) =>
      prev.map((row) =>
        row.categoryName === categoryName ? { ...row, tags: parseTagInput(value) } : row
      )
    );
  };

  const handleReset = () => {
    if (!data?.categories) return;
    setDraft(data.categories.map((row) => ({ categoryName: row.categoryName, tags: [...row.tags] })));
    setValidationError(null);
  };

  const handleSave = async () => {
    if (!draft.length) {
      setValidationError('No category tags to save.');
      return;
    }

    const missing = draft.filter((row) => !row.categoryName.trim());
    if (missing.length) {
      setValidationError('Some rows have an invalid category name.');
      return;
    }

    try {
      setValidationError(null);
      await updateCategoryTags.mutateAsync(draft);
    } catch (error: any) {
      setValidationError(
        error?.response?.data?.message || error?.message || 'Failed to save category tags'
      );
    }
  };

  if (isLoading && !draft.length) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading category tags...</p>
            </div>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Category Tag Manager</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Manage keyword tags used for system category auto-matching.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                disabled={!hasChanges || updateCategoryTags.isPending}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} size="sm" disabled={!hasChanges || updateCategoryTags.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateCategoryTags.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">System Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draft.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTags}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Changes Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={hasChanges ? 'default' : 'secondary'}>
                  {hasChanges ? 'Unsaved changes' : 'No pending changes'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by category name or any tag"
                  className="pl-10"
                />
              </div>
              {validationError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{validationError}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">All Category Tags</CardTitle>
                <Badge variant="secondary">{filteredRows.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56">Category</TableHead>
                    <TableHead>Tags (comma separated)</TableHead>
                    <TableHead className="w-40">Tag Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.categoryName}>
                        <TableCell className="font-semibold">{row.categoryName}</TableCell>
                        <TableCell>
                          <Input
                            value={tagsToInput(row.tags)}
                            onChange={(e) => updateRowTags(row.categoryName, e.target.value)}
                            placeholder="Add tags separated by commas"
                            disabled={updateCategoryTags.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.tags.length}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-[var(--muted-foreground)]">
                        No category tags found for your search
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
