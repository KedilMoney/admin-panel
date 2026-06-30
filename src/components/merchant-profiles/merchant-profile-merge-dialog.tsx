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
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { useMergeMerchantProfiles } from '@/lib/hooks/useMerchantProfiles';
import { GitMerge, Loader2 } from 'lucide-react';

interface MerchantProfileMergeDialogProps {
  merchants: MerchantProfile[];
  systemCategories: SystemCategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
}: MerchantProfileMergeDialogProps) {
  const [survivorId, setSurvivorId] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [systemCategoryId, setSystemCategoryId] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const mergeProfiles = useMergeMerchantProfiles();

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
        `Merged "${duplicate?.canonicalName}" into "${result.profile?.canonicalName ?? survivor?.canonicalName}".`
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
            Combine a duplicate profile into a survivor. Aliases, identifiers, and transactions
            move to the survivor; the duplicate profile is deleted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Survivor profile (kept)</Label>
            <Select value={survivorId} onValueChange={setSurvivorId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose survivor" />
              </SelectTrigger>
              <SelectContent>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.canonicalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duplicate profile (removed)</Label>
            <Select value={duplicateId} onValueChange={setDuplicateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose duplicate" />
              </SelectTrigger>
              <SelectContent>
                {merchants
                  .filter((merchant) => merchant.id !== survivorId)
                  .map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.canonicalName}
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
                      {category.name} ({category.type})
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
