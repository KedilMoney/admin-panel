'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { GitMerge, Loader2 } from 'lucide-react';

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
  const [survivorId, setSurvivorId] = useState('');
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [systemCategoryId, setSystemCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const mergeProfiles = useMergeMerchantProfiles();

  useEffect(() => {
    if (open) {
      if (initialSurvivorId) {
        setSurvivorId(initialSurvivorId);
      }
      if (initialDuplicateIds.length > 0) {
        setDuplicateIds(initialDuplicateIds.filter((id) => id !== initialSurvivorId));
      }
    }
  }, [open, initialSurvivorId, initialDuplicateIds]);

  useEffect(() => {
    setDuplicateIds((current) => current.filter((id) => id !== survivorId));
  }, [survivorId]);

  const survivor = useMemo(
    () => merchants.find((merchant) => merchant.id === survivorId),
    [merchants, survivorId]
  );

  const duplicateCandidates = useMemo(
    () => merchants.filter((merchant) => merchant.id !== survivorId),
    [merchants, survivorId]
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!survivorId) {
      setFormError('Choose a survivor profile to keep.');
      return;
    }

    if (duplicateIds.length === 0) {
      setFormError('Select at least one duplicate profile to merge in.');
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
      const survivorName = result.profile?.canonicalName ?? survivor?.canonicalName ?? 'profile';
      setSuccessMessage(
        `Merged ${result.mergedCount} duplicate profile${result.mergedCount === 1 ? '' : 's'} into "${survivorName}". All payment IDs, aliases, and transactions are now on the survivor.`
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
            Pick one profile to keep and select every duplicate to merge into it. Payment IDs,
            aliases, and linked transactions from all selected duplicates move to the survivor; the
            duplicate profiles are deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--accent)]/30 px-3 py-2 text-xs text-[var(--muted-foreground)]">
            <strong className="text-[var(--foreground)]">What users see:</strong> past transactions
            from every duplicate re-link to the survivor. Future payments on any merged UPI ID
            auto-categorize to the same merchant and category.
          </div>

          <div className="space-y-2">
            <Label>Keep this profile (survivor)</Label>
            <Select value={survivorId} onValueChange={setSurvivorId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose survivor">
                  {survivor ? formatMerchantOption(survivor) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {formatMerchantOption(merchant)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Merge these duplicates into survivor (removed)</Label>
              {duplicateIds.length > 0 ? (
                <Badge variant="secondary">{duplicateIds.length} selected</Badge>
              ) : null}
            </div>

            {!survivorId ? (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                Choose a survivor first.
              </p>
            ) : duplicateCandidates.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                No other profiles available to merge.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
                {duplicateCandidates.map((merchant) => {
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
                Pick the category for the merged survivor.
              </p>
              <Select value={systemCategoryId} onValueChange={setSystemCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Surviving category" />
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
