'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  formatIdentifierLabel,
  getPrimaryIdentifier,
} from '@/lib/merchant-profiles/utils';
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { useMergeMerchantProfiles } from '@/lib/hooks/useMerchantProfiles';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, GitMerge, Loader2, Search } from 'lucide-react';

interface MerchantProfileMergeDialogProps {
  merchants: MerchantProfile[];
  systemCategories: SystemCategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSurvivorId?: string | null;
  initialDuplicateIds?: string[];
}

const formatMerchantOption = (merchant: MerchantProfile) => {
  const identifier = getPrimaryIdentifier(merchant);
  const idPart = identifier ? ` · ${formatIdentifierLabel(identifier)}` : ' · no payment ID';
  const name =
    merchant.canonicalName.length > 48
      ? `${merchant.canonicalName.slice(0, 48)}…`
      : merchant.canonicalName;
  return `${name}${idPart}`;
};

const merchantMatchesQuery = (merchant: MerchantProfile, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const identifier = getPrimaryIdentifier(merchant);
  const haystack = [
    merchant.canonicalName,
    merchant.upiId,
    merchant.accountNumber,
    identifier?.value,
    merchant.identifiers?.map((item) => item.value).join(' '),
    merchant.aliases?.map((alias) => alias.rawName).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
};

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Request failed.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed.';
};

export function MerchantProfileMergeDialog({
  merchants,
  systemCategories,
  open,
  onOpenChange,
  initialSurvivorId = null,
  initialDuplicateIds = [],
}: MerchantProfileMergeDialogProps) {
  const [survivorId, setSurvivorId] = useState(initialSurvivorId ?? '');
  const [duplicateIds, setDuplicateIds] = useState<string[]>(() =>
    initialDuplicateIds.filter((id) => id !== initialSurvivorId)
  );
  const [systemCategoryId, setSystemCategoryId] = useState('');
  const [originalSearch, setOriginalSearch] = useState('');
  const [duplicateSearch, setDuplicateSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const mergeProfiles = useMergeMerchantProfiles();

  const survivor = useMemo(
    () => merchants.find((merchant) => merchant.id === survivorId),
    [merchants, survivorId]
  );

  const duplicateCandidates = useMemo(
    () => merchants.filter((merchant) => merchant.id !== survivorId),
    [merchants, survivorId]
  );

  const originalCandidates = useMemo(
    () => merchants.filter((merchant) => merchantMatchesQuery(merchant, originalSearch)),
    [merchants, originalSearch]
  );

  const filteredDuplicateCandidates = useMemo(
    () =>
      duplicateCandidates.filter((merchant) => merchantMatchesQuery(merchant, duplicateSearch)),
    [duplicateCandidates, duplicateSearch]
  );

  const selectedDuplicates = useMemo(
    () => merchants.filter((merchant) => duplicateIds.includes(merchant.id)),
    [merchants, duplicateIds]
  );

  const categoriesConflict = useMemo(() => {
    if (!survivor || selectedDuplicates.length === 0) return false;
    const categoryIds = new Set([
      survivor.systemCategoryId,
      ...selectedDuplicates.map((duplicate) => duplicate.systemCategoryId),
    ]);
    return categoryIds.size > 1;
  }, [survivor, selectedDuplicates]);

  const conflictingCategoryNames = useMemo(() => {
    if (!survivor) return [];
    const names = new Set<string>([survivor.systemCategory.name]);
    for (const duplicate of selectedDuplicates) {
      names.add(duplicate.systemCategory.name);
    }
    return [...names];
  }, [survivor, selectedDuplicates]);

  const resetForm = () => {
    setSurvivorId('');
    setDuplicateIds([]);
    setSystemCategoryId('');
    setOriginalSearch('');
    setDuplicateSearch('');
    setFormError('');
    setSuccessMessage('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const toggleDuplicate = (duplicateId: string) => {
    setDuplicateIds((current) =>
      current.includes(duplicateId)
        ? current.filter((id) => id !== duplicateId)
        : [...current, duplicateId]
    );
  };

  const selectOriginal = (merchantId: string) => {
    setSurvivorId(merchantId);
    setDuplicateIds((current) => current.filter((id) => id !== merchantId));
    setSystemCategoryId('');
  };

  const swapOriginalWithDuplicate = (nextOriginalId: string) => {
    if (!survivorId || !duplicateIds.includes(nextOriginalId)) return;
    setDuplicateIds((current) => current.map((id) => (id === nextOriginalId ? survivorId : id)));
    setSurvivorId(nextOriginalId);
    setSystemCategoryId('');
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!survivorId) {
      setFormError('Choose the original merchant to keep.');
      return;
    }

    if (duplicateIds.length === 0) {
      setFormError('Select at least one merchant to merge into the original.');
      return;
    }

    if (categoriesConflict && !systemCategoryId) {
      setFormError('These profiles have different categories — pick the surviving category.');
      return;
    }

    try {
      const result = await mergeProfiles.mutateAsync({
        survivorId,
        duplicateIds,
        systemCategoryId: categoriesConflict ? systemCategoryId : null,
      });
      const originalName = result.profile?.canonicalName ?? survivor?.canonicalName ?? 'profile';
      setSuccessMessage(
        `Merged ${result.mergedCount} profile${result.mergedCount === 1 ? '' : 's'} into original "${originalName}". All payment IDs, aliases, and transactions now point to the original merchant.`
      );
      setDuplicateIds([]);
    } catch (error: unknown) {
      setFormError(formatSubmitError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge merchant profiles</DialogTitle>
          <DialogDescription>
            Pick the original merchant to keep and select every merchant that should merge into it.
            Payment IDs, aliases, and linked transactions move to the original merchant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--accent)]/30 px-3 py-2 text-xs text-[var(--muted-foreground)]">
            <strong className="text-[var(--foreground)]">What users see:</strong> past transactions
            from every merged merchant re-link to the original. Future payments on any merged UPI ID
            auto-categorize to the original merchant and category.
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Original merchant to keep</Label>
              {survivor ? <Badge variant="secondary">{survivor.canonicalName}</Badge> : null}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search by name or UPI ID"
                value={originalSearch}
                onChange={(event) => setOriginalSearch(event.target.value)}
              />
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
              {originalCandidates.map((merchant) => {
                const selected = merchant.id === survivorId;
                const isDuplicate = duplicateIds.includes(merchant.id);
                return (
                  <label
                    key={merchant.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-[var(--accent)]',
                      selected && 'bg-[var(--accent)]/60'
                    )}
                  >
                    <input
                      type="radio"
                      name="original-merchant"
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--foreground)]"
                      checked={selected}
                      onChange={() => selectOriginal(merchant.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium leading-snug">
                        {merchant.canonicalName}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                        {formatMerchantOption(merchant)}
                        {isDuplicate ? ' · currently selected to merge' : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
              {originalCandidates.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--muted-foreground)]">
                  No merchant matches that name or UPI ID.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Merge these merchants into original</Label>
              {duplicateIds.length > 0 ? (
                <Badge variant="secondary">{duplicateIds.length} selected</Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2">
                <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search by name or UPI ID"
                  value={duplicateSearch}
                  onChange={(event) => setDuplicateSearch(event.target.value)}
                />
              </div>
              {survivorId && duplicateIds.length > 1 ? (
                <span className="text-xs text-[var(--muted-foreground)]">
                  Use Swap on a selected row.
                </span>
              ) : null}
            </div>

            {!survivorId ? (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                Choose the original merchant first, or select it from the search results above.
              </p>
            ) : duplicateCandidates.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                No other profiles available to merge.
              </p>
            ) : filteredDuplicateCandidates.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                No merchant matches that name or UPI ID.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
                {filteredDuplicateCandidates.map((merchant) => {
                  const checked = duplicateIds.includes(merchant.id);
                  return (
                    <label
                      key={merchant.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-[var(--accent)]',
                        checked && 'bg-[var(--accent)]/60'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--foreground)]"
                        checked={checked}
                        onChange={() => toggleDuplicate(merchant.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug">
                          {merchant.canonicalName}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                          {merchant.systemCategory.name}
                          {getPrimaryIdentifier(merchant)
                            ? ` · ${formatIdentifierLabel(getPrimaryIdentifier(merchant)!)}`
                            : ' · no payment ID'}
                          {' · '}
                          {merchant._count.aliases} aliases
                        </span>
                      </span>
                      {checked && survivorId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto shrink-0"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            swapOriginalWithDuplicate(merchant.id);
                          }}
                        >
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Swap
                        </Button>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {categoriesConflict ? (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Category conflict across selected profiles: {conflictingCategoryNames.join(', ')}.
                Pick the category for the merged original merchant.
              </p>
              <Select value={systemCategoryId} onValueChange={setSystemCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Category for original merchant" />
                </SelectTrigger>
                <SelectContent>
                  {systemCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {formError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            <Button
              type="submit"
              disabled={mergeProfiles.isPending || !survivorId || duplicateIds.length === 0}
            >
              {mergeProfiles.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="mr-2 h-4 w-4" />
              )}
              Merge {duplicateIds.length > 0 ? `${duplicateIds.length} ` : ''}
              profile{duplicateIds.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
