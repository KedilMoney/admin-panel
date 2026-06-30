'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateMerchantProfile,
  useMerchantProfiles,
  useRunMerchantMergeJob,
} from '@/lib/hooks/useMerchantProfiles';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  formatIdentifierLabel,
  formatVerificationLevel,
  getIdentifierCount,
  getPrimaryIdentifier,
  getTopAliases,
  getVerificationTone,
  hasPaymentIdentifiers,
  needsReview,
  parseMerchantTags,
  VERIFICATION_LEVELS,
  type VerificationLevelFilter,
} from '@/lib/merchant-profiles/utils';
import { cn, formatDateTime } from '@/lib/utils';
import type { MerchantProfile } from '@/types';
import {
  AlertCircle,
  ChevronDown,
  GitMerge,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { MerchantProfileMergeDialog } from '@/components/merchant-profiles/merchant-profile-merge-dialog';
import { MerchantProfileWorkspace } from '@/components/merchant-profiles/merchant-profile-workspace';
import { DuplicateMerchantsCard } from '@/components/merchant-profiles/duplicate-merchants-card';
import { findDuplicateMerchantGroups } from '@/lib/merchant-profiles/duplicateGroups';

type MerchantProfileFormState = {
  canonicalName: string;
  systemCategoryId: string;
  upiId: string;
  accountNumber: string;
  confidence: string;
};

const INITIAL_FORM: MerchantProfileFormState = {
  canonicalName: '',
  systemCategoryId: '',
  upiId: '',
  accountNumber: '',
  confidence: '0.95',
};

const trustRowClass: Record<ReturnType<typeof getVerificationTone>, string> = {
  trusted: 'border-l-green-500',
  high: 'border-l-blue-500',
  medium: 'border-l-amber-500',
  low: 'border-l-red-500',
};

const buildPayload = (form: MerchantProfileFormState) => ({
  canonicalName: form.canonicalName.trim(),
  systemCategoryId: form.systemCategoryId,
  upiId: form.upiId.trim() || null,
  accountNumber: form.accountNumber.trim() || null,
  confidence: Number(form.confidence),
});

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Unable to save merchant profile.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'Unable to save merchant profile.';
};

export default function MerchantMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<VerificationLevelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSurvivorId, setMergeSurvivorId] = useState<string | null>(null);
  const [mergeDuplicateIds, setMergeDuplicateIds] = useState<string[]>([]);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const duplicatePanelRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<MerchantProfileFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [mergeMessage, setMergeMessage] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 400);
  const { data, isLoading, error, refetch, isFetching } = useMerchantProfiles(
    debouncedSearch.trim() || undefined
  );
  const createMerchant = useCreateMerchantProfile();
  const runMergeJob = useRunMerchantMergeJob();

  const merchants = useMemo(() => data?.merchants ?? [], [data]);
  const systemCategories = useMemo(() => data?.systemCategories ?? [], [data]);

  const filteredMerchants = useMemo(() => {
    return merchants.filter((merchant) => {
      if (reviewOnly && !needsReview(merchant.verificationLevel)) return false;
      if (verificationFilter !== 'all' && merchant.verificationLevel !== verificationFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && merchant.systemCategoryId !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [merchants, reviewOnly, verificationFilter, categoryFilter]);

  const selectedMerchant = useMemo(() => {
    if (!selectedId) return null;
    return merchants.find((merchant) => merchant.id === selectedId) ?? null;
  }, [merchants, selectedId]);

  const verificationFilterLabel =
    verificationFilter === 'all'
      ? 'All trust levels'
      : formatVerificationLevel(verificationFilter);

  const categoryFilterLabel =
    categoryFilter === 'all'
      ? 'All categories'
      : (systemCategories.find((category) => category.id === categoryFilter)?.name ?? 'Category');

  const duplicateGroups = useMemo(
    () => findDuplicateMerchantGroups(merchants),
    [merchants]
  );

  const summary = useMemo(
    () => ({
      total: merchants.length,
      needsReview: merchants.filter((merchant) => needsReview(merchant.verificationLevel)).length,
      confirmed: merchants.filter((merchant) =>
        ['user_confirmed', 'multi_user_confirmed'].includes(merchant.verificationLevel)
      ).length,
      withIdentifiers: merchants.filter(hasPaymentIdentifiers).length,
      duplicateGroups: duplicateGroups.length,
    }),
    [merchants, duplicateGroups]
  );

  const openMergeDialog = (survivorId: string | null = null, duplicateIds: string[] = []) => {
    setMergeSurvivorId(survivorId);
    setMergeDuplicateIds(duplicateIds);
    setIsMergeOpen(true);
  };

  const toggleDuplicatePanel = () => {
    if (summary.duplicateGroups === 0) return;
    setShowDuplicatePanel((current) => !current);
  };

  useEffect(() => {
    if (!showDuplicatePanel) return;
    duplicatePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showDuplicatePanel]);

  const openCreateDialog = () => {
    setForm(INITIAL_FORM);
    setFormError('');
    setIsDialogOpen(true);
  };

  const selectedCategory = useMemo(
    () => systemCategories.find((category) => category.id === form.systemCategoryId),
    [form.systemCategoryId, systemCategories]
  );

  const selectedCategoryLabel = selectedCategory
    ? `${selectedCategory.name} (${selectedCategory.type})`
    : undefined;

  const handleRunMergeJob = async () => {
    setMergeMessage('');
    try {
      const result = await runMergeJob.mutateAsync();
      setMergeMessage(
        `Merge job finished: ${result.mergedGroups} group(s) merged, ${result.deletedProfiles} duplicate profile(s) removed.`
      );
    } catch (mergeError: unknown) {
      setMergeMessage(formatSubmitError(mergeError));
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setForm(INITIAL_FORM);
    setFormError('');
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true);
      return;
    }
    closeDialog();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.canonicalName.trim()) {
      setFormError('Merchant name is required.');
      return;
    }
    if (!form.systemCategoryId) {
      setFormError('Please choose a system category.');
      return;
    }

    const confidence = Number(form.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      setFormError('Confidence must be between 0 and 1.');
      return;
    }

    try {
      await createMerchant.mutateAsync(buildPayload(form));
      closeDialog();
    } catch (submitError: unknown) {
      setFormError(formatSubmitError(submitError));
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading merchant profiles...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <AdminLayout>
          <Card>
            <CardHeader>
              <CardTitle>Merchant Profiles</CardTitle>
              <CardDescription>Unable to load merchant data right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetch()} size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Merchant Profiles</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted-foreground)]">
                Inspect auto-categorization data from production tables: canonical names,
                merchant_identifiers, aliases, taxonomy tags, and category votes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => openMergeDialog()}
                variant="outline"
                size="sm"
              >
                <GitMerge className="mr-2 h-4 w-4" />
                Merge profiles
              </Button>
              <Button
                onClick={handleRunMergeJob}
                variant="outline"
                size="sm"
                disabled={runMergeJob.isPending}
              >
                <GitMerge className={`mr-2 h-4 w-4 ${runMergeJob.isPending ? 'animate-pulse' : ''}`} />
                {runMergeJob.isPending ? 'Running merge…' : 'Run merge job'}
              </Button>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add merchant
              </Button>
            </div>
          </div>

          {mergeMessage ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm">
              {mergeMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total profiles</CardDescription>
                <CardTitle className="text-2xl">{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Needs review (LLM low/medium)</CardDescription>
                <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">
                  {summary.needsReview}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>User confirmed</CardDescription>
                <CardTitle className="text-2xl">{summary.confirmed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>With payment identifiers</CardDescription>
                <CardTitle className="text-2xl">{summary.withIdentifiers}</CardTitle>
              </CardHeader>
            </Card>
            <button
              type="button"
              onClick={toggleDuplicatePanel}
              disabled={summary.duplicateGroups === 0}
              className={cn(
                'rounded-xl border border-[var(--border)] bg-[var(--card)] text-left transition-colors',
                summary.duplicateGroups > 0 &&
                  'cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5',
                showDuplicatePanel && 'border-violet-500/50 bg-violet-500/10 ring-2 ring-violet-500/20',
                summary.duplicateGroups === 0 && 'cursor-default opacity-70'
              )}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span>Duplicate name groups</span>
                  {summary.duplicateGroups > 0 ? (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-violet-600 transition-transform dark:text-violet-400',
                        showDuplicatePanel && 'rotate-180'
                      )}
                    />
                  ) : null}
                </CardDescription>
                <CardTitle className="text-2xl text-violet-700 dark:text-violet-300">
                  {summary.duplicateGroups}
                </CardTitle>
                {summary.duplicateGroups > 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {showDuplicatePanel ? 'Showing all groups below' : 'Click to view all duplicates'}
                  </p>
                ) : null}
              </CardHeader>
            </button>
          </div>

          {showDuplicatePanel ? (
            <div ref={duplicatePanelRef}>
              <DuplicateMerchantsCard
                groups={duplicateGroups}
                expanded
                onClose={() => setShowDuplicatePanel(false)}
                onSelectMerchant={setSelectedId}
                onMergeGroup={(survivorId, duplicateIds) => openMergeDialog(survivorId, duplicateIds)}
              />
            </div>
          ) : null}

          <div
            className={cn(
              'grid gap-4',
              selectedId ? 'xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : 'xl:grid-cols-1'
            )}
          >
            <Card className="overflow-hidden">
              <CardHeader className="relative z-20 space-y-4 border-b border-[var(--border)] bg-[var(--background)] pb-4">
                <div>
                  <CardTitle className="text-lg">Browse profiles</CardTitle>
                  <CardDescription>
                    {filteredMerchants.length} shown
                    {searchQuery !== debouncedSearch ? ' · searching…' : ''}
                    {isFetching && searchQuery === debouncedSearch ? ' · updating…' : ''}
                  </CardDescription>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name, alias, UPI, account, category…"
                    className="pl-10"
                  />
                  {searchQuery !== debouncedSearch ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--muted-foreground)]">Trust level</Label>
                    <Select
                      value={verificationFilter}
                      onValueChange={(value) =>
                        setVerificationFilter(value as VerificationLevelFilter)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>{verificationFilterLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All trust levels</SelectItem>
                        {VERIFICATION_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatVerificationLevel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--muted-foreground)]">Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue>{categoryFilterLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {systemCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--muted-foreground)]">Quick filter</Label>
                    <Button
                      type="button"
                      variant={reviewOnly ? 'default' : 'outline'}
                      onClick={() => setReviewOnly((current) => !current)}
                      className="w-full justify-start"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Review queue only
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="max-h-[68vh] overflow-y-auto p-0">
                {filteredMerchants.length > 0 ? (
                  <div className="divide-y divide-[var(--border)]">
                    {filteredMerchants.map((merchant) => {
                      const primaryIdentifier = getPrimaryIdentifier(merchant);
                      const topAliases = getTopAliases(merchant, 2);
                      const tags = parseMerchantTags(merchant.tags);
                      const primaryTag = tags.find((tag) => tag.isPrimary) ?? tags[0];
                      const tone = getVerificationTone(merchant.verificationLevel);
                      const isSelected = merchant.id === selectedId;

                      return (
                        <button
                          key={merchant.id}
                          type="button"
                          onClick={() => setSelectedId(merchant.id)}
                          className={cn(
                            'w-full border-l-4 px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]/50',
                            trustRowClass[tone],
                            isSelected && 'bg-[var(--accent)]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate font-semibold">{merchant.canonicalName}</p>
                              <p className="truncate text-xs text-[var(--muted-foreground)]">
                                {merchant.systemCategory.name}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {merchant.confidence.toFixed(2)}
                            </Badge>
                          </div>

                          <div className="mt-2 space-y-2">
                            {primaryIdentifier ? (
                              <p className="truncate font-mono text-xs text-[var(--foreground)]">
                                {formatIdentifierLabel(primaryIdentifier)}
                              </p>
                            ) : (
                              <p className="text-xs text-[var(--muted-foreground)]">No payment ID</p>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="text-[10px]">
                                {formatVerificationLevel(merchant.verificationLevel)}
                              </Badge>
                              {primaryTag ? (
                                <Badge variant="outline" className="max-w-[140px] truncate text-[10px]">
                                  {primaryTag.value}
                                </Badge>
                              ) : null}
                              {topAliases.map((alias) => (
                                <Badge
                                  key={alias.id}
                                  variant="outline"
                                  className="max-w-[120px] truncate text-[10px]"
                                >
                                  {alias.rawName}
                                </Badge>
                              ))}
                            </div>

                            <p className="text-[11px] text-[var(--muted-foreground)]">
                              {merchant._count.aliases} aliases · {getIdentifierCount(merchant)} IDs ·{' '}
                              {merchant._count.transactions} txns · {formatDateTime(merchant.updatedAt)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
                    No merchant profiles match your filters.
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedId && selectedMerchant ? (
              <MerchantProfileWorkspace
                merchant={selectedMerchant}
                systemCategories={systemCategories}
                onClose={() => setSelectedId(null)}
                onMerge={(merchant) => openMergeDialog(merchant.id)}
              />
            ) : null}
          </div>
        </div>

        <MerchantProfileMergeDialog
          merchants={merchants}
          systemCategories={systemCategories}
          open={isMergeOpen}
          onOpenChange={(open) => {
            setIsMergeOpen(open);
            if (!open) {
              setMergeSurvivorId(null);
              setMergeDuplicateIds([]);
            }
          }}
          initialSurvivorId={mergeSurvivorId}
          initialDuplicateIds={mergeDuplicateIds}
        />

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create merchant profile</DialogTitle>
              <DialogDescription>
                Add a new canonical merchant. UPI/account fields sync into merchant_identifiers on
                save.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merchant-name">Canonical name</Label>
                <Input
                  id="merchant-name"
                  value={form.canonicalName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, canonicalName: event.target.value }))
                  }
                  placeholder="e.g. Vanakkam Cafe"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="merchant-upi">UPI ID (syncs to identifiers)</Label>
                  <Input
                    id="merchant-upi"
                    value={form.upiId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, upiId: event.target.value }))
                    }
                    placeholder="shop@okhdfcbank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant-account">Account number</Label>
                  <Input
                    id="merchant-account"
                    value={form.accountNumber}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accountNumber: event.target.value }))
                    }
                    placeholder="Optional bank account reference"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>System category</Label>
                  <Select
                    value={form.systemCategoryId}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, systemCategoryId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category">
                        {selectedCategoryLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {systemCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant-confidence">Confidence</Label>
                  <Input
                    id="merchant-confidence"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={form.confidence}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confidence: event.target.value }))
                    }
                  />
                </div>
              </div>

              {formError ? (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {formError}
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={createMerchant.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMerchant.isPending}>
                  {createMerchant.isPending ? 'Creating…' : 'Create merchant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
}
