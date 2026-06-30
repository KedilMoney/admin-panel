'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import { GitMerge, Loader2 } from 'lucide-react';

interface MerchantProfileMergeDialogProps {
  merchants: MerchantProfile[];
  systemCategories: SystemCategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSurvivorId?: string | null;
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
}: MerchantProfileMergeDialogProps) {
  const [survivorId, setSurvivorId] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [systemCategoryId, setSystemCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const mergeProfiles = useMergeMerchantProfiles();

  useEffect(() => {
    if (open && initialSurvivorId) {
      setSurvivorId(initialSurvivorId);
    }
  }, [open, initialSurvivorId]);

  const survivor = useMemo(
    () => merchants.find((merchant) => merchant.id === survivorId),
    [merchants, survivorId]
  );
  const duplicate = useMemo(
    () => merchants.find((merchant) => merchant.id === duplicateId),
    [merchants, duplicateId]
  );

  const categoriesConflict =
    survivor &&
    duplicate &&
    survivor.systemCategoryId !== duplicate.systemCategoryId;

  const resetForm = () => {
    setSurvivorId('');
    setDuplicateId('');
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!survivorId || !duplicateId) {
      setFormError('Choose both a survivor profile and a duplicate to merge.');
      return;
    }

    if (survivorId === duplicateId) {
      setFormError('Survivor and duplicate must be different profiles.');
      return;
    }

    if (categoriesConflict && !systemCategoryId) {
      setFormError('These profiles have different categories — pick the surviving category.');
      return;
    }

    try {
      const result = await mergeProfiles.mutateAsync({
        survivorId,
        duplicateId,
        systemCategoryId: categoriesConflict ? systemCategoryId : null,
      });
      setSuccessMessage(
        `Merged successfully. Survivor is now "${result.profile?.canonicalName ?? survivor?.canonicalName}" with all payment IDs and aliases combined.`
      );
      setDuplicateId('');
    } catch (error: unknown) {
      setFormError(formatSubmitError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge merchant profiles</DialogTitle>
          <DialogDescription>
            Use this when the same real-world merchant has multiple profiles (e.g. different UPI
            IDs). Pick which profile to keep — all payment IDs, aliases, and linked transactions
            move to it; the other profile is deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-[var(--border)] bg-[var(--accent)]/30 px-3 py-2 text-xs text-[var(--muted-foreground)]">
            <strong className="text-[var(--foreground)]">What users see:</strong> past transactions
            from the duplicate re-link to the survivor. Future payments on any merged UPI ID
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
            <Label>Merge this duplicate into survivor (removed)</Label>
            <Select value={duplicateId} onValueChange={setDuplicateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose duplicate">
                  {duplicate ? formatMerchantOption(duplicate) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {merchants
                  .filter((merchant) => merchant.id !== survivorId)
                  .map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {formatMerchantOption(merchant)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {categoriesConflict ? (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Category conflict: survivor is {survivor?.systemCategory.name}, duplicate is{' '}
                {duplicate?.systemCategory.name}. Pick the category for the merged profile.
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
            <Button type="submit" disabled={mergeProfiles.isPending}>
              {mergeProfiles.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitMerge className="mr-2 h-4 w-4" />
              )}
              Merge profiles
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
