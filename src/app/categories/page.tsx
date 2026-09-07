'use client';

import { Fragment, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCategoryReview, useCategoryReviewDiagnosis, useCategoryReviewSummary } from '@/lib/hooks/useAdmin';
import { suspectReasonLabel } from '@/lib/category-review/suspectLabels';
import { formatWhyPanel } from '@/lib/category-review/whyPanel';
import { buildCategoryReviewWorkbookBuffer, triggerWorkbookDownload } from '@/lib/category-review/writeXlsx';
import type { CategoryReviewItem } from '@/lib/category-review/types';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function WhyPanel({ item }: { item: CategoryReviewItem }) {
  const { data, isLoading, error } = useCategoryReviewDiagnosis(item.transactionId);
  const view = formatWhyPanel(item, data);

  if (isLoading) {
    return <p className="text-sm text-[var(--muted-foreground)]">Loading diagnosis…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">Could not load diagnosis.</p>;
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium text-[var(--foreground)]">{view.headline}</p>
      <p className="text-[var(--muted-foreground)]">
        {view.rung}
        {view.confidence != null ? ` · confidence ${view.confidence}` : ''}
        {view.shopName ? ` · shop ${view.shopName}` : ''}
      </p>
      {view.descriptor ? (
        <p className="break-all text-[var(--foreground)]">
          <span className="text-[var(--muted-foreground)]">Descriptor: </span>
          {view.descriptor}
        </p>
      ) : null}
      {view.patternCategory ? (
        <p>Merchant master category: {view.patternCategory}</p>
      ) : null}
      {view.mapping ? (
        <p>
          Mapping {view.mapping.categoryId ?? 'unknown'}
          {view.mapping.confirmed ? ' · confirmed' : ''}
          {view.mapping.userCorrected ? ' · user corrected' : ''}
        </p>
      ) : null}
      {view.crowd ? (
        <p>
          Profile {view.crowd.canonicalName ?? 'unknown'}
          {view.crowd.crowdPoints != null ? ` · ${view.crowd.crowdPoints} crowd points` : ''}
        </p>
      ) : null}
    </div>
  );
}

export default function CategoryReviewPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } =
    useCategoryReviewSummary();
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const categories = useMemo(() => summary?.categories ?? [], [summary]);
  const filteredCategories = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((row) => row.name.toLowerCase().includes(q));
  }, [categories, pickerQuery]);

  const selected = categories.find((row) => row.name === selectedName) ?? null;
  const { data: review, isLoading: reviewLoading, error: reviewError, refetch: refetchReview } =
    useCategoryReview(selectedName, 'suspect');
  const items = review?.items ?? [];

  const handleExport = async () => {
    if (!selectedName || items.length === 0) return;
    setExporting(true);
    try {
      const buffer = await buildCategoryReviewWorkbookBuffer({
        categoryName: selectedName,
        items,
        summary: {
          transactionCount: selected?.transactionCount ?? items.length,
          userCount: selected?.userCount ?? new Set(items.map((row) => row.userEmail)).size,
          suspectCount: selected?.suspectCount ?? items.filter((row) => row.suspectScore > 0).length,
        },
      });
      triggerWorkbookDownload(buffer, `category-review-${selectedName.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Category Review</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Read-only audit of auto-categorisation. Mistakes sort to the top. Nothing here can change a
                transaction.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void refetchSummary();
                  void refetchReview();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => void handleExport()} disabled={!selectedName || items.length === 0 || exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Filter category names"
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
              />
              {summaryLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading categories…</p>
              ) : summaryError ? (
                <p className="text-sm text-red-600">Could not load category summary.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Suspects</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((row) => (
                      <TableRow
                        key={row.name}
                        data-state={row.name === selectedName ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedName(row.name);
                          setExpandedId(null);
                        }}
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.transactionCount}</TableCell>
                        <TableCell>{row.userCount}</TableCell>
                        <TableCell>{row.suspectCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedName ? `${selectedName} transactions` : 'Select a category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedName ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Pick a category above to list every transaction across users.
                </p>
              ) : reviewLoading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading transactions…</p>
              ) : reviewError ? (
                <p className="text-sm text-red-600">Could not load transactions.</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No transactions in this category.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Descriptor</TableHead>
                      <TableHead>Decided by</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Merchant key</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <Fragment key={item.transactionId}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedId((current) =>
                              current === item.transactionId ? null : item.transactionId
                            )
                          }
                        >
                          <TableCell>{item.userEmail ?? '—'}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{formatInr(item.amount)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.descriptor}>
                            {item.descriptor}
                          </TableCell>
                          <TableCell>{item.decidedBy ?? '—'}</TableCell>
                          <TableCell>{item.confidence ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{item.merchantKey ?? '—'}</TableCell>
                        </TableRow>
                        {item.suspectReasons.length > 0 ? (
                          <TableRow key={`${item.transactionId}-reasons`}>
                            <TableCell colSpan={7}>
                              <div className="flex flex-wrap gap-2">
                                {item.suspectReasons.map((reason) => (
                                  <Badge key={reason} variant="warning">
                                    {suspectReasonLabel(reason)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                        {expandedId === item.transactionId ? (
                          <TableRow key={`${item.transactionId}-why`}>
                            <TableCell colSpan={7}>
                              <WhyPanel item={item} />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
              {selectedName && review && !reviewLoading ? (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {review.total} transaction{review.total === 1 ? '' : 's'}
                  {selected ? ` · ${selected.userCount} users · ${selected.suspectCount} suspects` : ''}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
