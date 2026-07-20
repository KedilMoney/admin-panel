'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateMerchantProfile } from '@/lib/hooks/useMerchantProfiles';
import type { SystemCategoryOption } from '@/types';

type FormState = {
  canonicalName: string;
  systemCategoryId: string;
  upiId: string;
  accountNumber: string;
};

const INITIAL_FORM: FormState = {
  canonicalName: '',
  systemCategoryId: '',
  upiId: '',
  accountNumber: '',
};

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Unable to create merchant profile.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'Unable to create merchant profile.';
};

export interface CreateMerchantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemCategories: SystemCategoryOption[];
}

export function CreateMerchantDialog({
  open,
  onOpenChange,
  systemCategories,
}: CreateMerchantDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const createMerchant = useCreateMerchantProfile();

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setFormError('');
    }
  }, [open]);

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

    try {
      await createMerchant.mutateAsync({
        canonicalName: form.canonicalName.trim(),
        systemCategoryId: form.systemCategoryId,
        upiId: form.upiId.trim() || null,
        accountNumber: form.accountNumber.trim() || null,
      });
      onOpenChange(false);
    } catch (submitError: unknown) {
      setFormError(formatSubmitError(submitError));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create merchant profile</DialogTitle>
          <DialogDescription>
            Add a new canonical merchant. UPI and account fields sync into merchant_identifiers on
            save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mm-stack" style={{ gap: 16 }}>
          <label className="mm-field">
            <span className="mm-label">Canonical name</span>
            <input
              className="mm-input"
              value={form.canonicalName}
              onChange={(event) =>
                setForm((current) => ({ ...current, canonicalName: event.target.value }))
              }
              placeholder="e.g. Vanakkam Cafe"
              required
            />
          </label>

          <label className="mm-field">
            <span className="mm-label">System category</span>
            <select
              className="mm-select"
              style={{ width: '100%' }}
              value={form.systemCategoryId}
              onChange={(event) =>
                setForm((current) => ({ ...current, systemCategoryId: event.target.value }))
              }
              required
            >
              <option value="">Choose a category</option>
              {systemCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.type})
                </option>
              ))}
            </select>
          </label>

          <div className="mm-grid-2">
            <label className="mm-field">
              <span className="mm-label">UPI ID</span>
              <input
                className="mm-input mm-input--mono"
                value={form.upiId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, upiId: event.target.value }))
                }
                placeholder="shop@okhdfcbank"
              />
            </label>
            <label className="mm-field">
              <span className="mm-label">Account number</span>
              <input
                className="mm-input mm-input--mono"
                value={form.accountNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accountNumber: event.target.value }))
                }
                placeholder="Optional bank account reference"
              />
            </label>
          </div>

          {formError ? (
            <p style={{ fontSize: 13, color: 'var(--bad-text)', margin: 0 }}>{formError}</p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              className="mm-btn mm-btn--secondary"
              onClick={() => onOpenChange(false)}
              disabled={createMerchant.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="mm-btn mm-btn--dark" disabled={createMerchant.isPending}>
              {createMerchant.isPending ? 'Creating…' : 'Create merchant'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
