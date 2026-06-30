'use client';

import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateMerchantProfile } from '@/lib/hooks/useMerchantProfiles';
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export type MerchantProfileEditFormState = {
  canonicalName: string;
  systemCategoryId: string;
  upiId: string;
  accountNumber: string;
  confidence: string;
};

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

interface MerchantProfileEditFormProps {
  merchant: MerchantProfile;
  systemCategories: SystemCategoryOption[];
  onSaved?: () => void;
}

export function MerchantProfileEditForm({
  merchant,
  systemCategories,
  onSaved,
}: MerchantProfileEditFormProps) {
  const updateMerchant = useUpdateMerchantProfile();
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<MerchantProfileEditFormState>({
    canonicalName: merchant.canonicalName,
    systemCategoryId: merchant.systemCategoryId,
    upiId: merchant.upiId ?? '',
    accountNumber: merchant.accountNumber ?? '',
    confidence: String(merchant.confidence ?? 0.95),
  });

  useEffect(() => {
    setForm({
      canonicalName: merchant.canonicalName,
      systemCategoryId: merchant.systemCategoryId,
      upiId: merchant.upiId ?? '',
      accountNumber: merchant.accountNumber ?? '',
      confidence: String(merchant.confidence ?? 0.95),
    });
    setFormError('');
  }, [merchant]);

  const selectedCategory = systemCategories.find((category) => category.id === form.systemCategoryId);
  const selectedCategoryLabel = selectedCategory
    ? `${selectedCategory.name} (${selectedCategory.type})`
    : undefined;

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
      await updateMerchant.mutateAsync({
        id: merchant.id,
        payload: {
          canonicalName: form.canonicalName.trim(),
          systemCategoryId: form.systemCategoryId,
          upiId: form.upiId.trim() || null,
          accountNumber: form.accountNumber.trim() || null,
          confidence,
        },
      });
      onSaved?.();
    } catch (submitError: unknown) {
      setFormError(formatSubmitError(submitError));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Update the canonical name, category, and confidence. UPI/account fields sync into{' '}
        <code className="text-xs">merchant_identifiers</code> on save.
      </p>

      <div className="space-y-2">
        <Label htmlFor="edit-merchant-name">Canonical name</Label>
        <Input
          id="edit-merchant-name"
          value={form.canonicalName}
          onChange={(event) =>
            setForm((current) => ({ ...current, canonicalName: event.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label>System category</Label>
        <Select
          value={form.systemCategoryId}
          onValueChange={(value) => setForm((current) => ({ ...current, systemCategoryId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a category">{selectedCategoryLabel}</SelectValue>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-merchant-upi">Primary UPI (optional)</Label>
          <Input
            id="edit-merchant-upi"
            value={form.upiId}
            onChange={(event) => setForm((current) => ({ ...current, upiId: event.target.value }))}
            placeholder="shop@okhdfcbank"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-merchant-confidence">Confidence (0–1)</Label>
          <Input
            id="edit-merchant-confidence"
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

      <div className="space-y-2">
        <Label htmlFor="edit-merchant-account">Account number (optional)</Label>
        <Input
          id="edit-merchant-account"
          value={form.accountNumber}
          onChange={(event) =>
            setForm((current) => ({ ...current, accountNumber: event.target.value }))
          }
          placeholder="Bank account reference"
        />
      </div>

      {formError ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {formError}
        </div>
      ) : null}

      <Button type="submit" disabled={updateMerchant.isPending}>
        {updateMerchant.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Save profile'
        )}
      </Button>
    </form>
  );
}
