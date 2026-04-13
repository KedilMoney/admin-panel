'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { MerchantMasterRuleType } from '@/types';
import { cn } from '@/lib/utils';

export type RuleDialogKind = 'upi' | 'pattern';

type FormState = {
  primary: string;
  systemCategoryName: string;
  type: MerchantMasterRuleType;
};

const defaultForm = (): FormState => ({
  primary: '',
  systemCategoryName: '',
  type: 'Need',
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  kind: RuleDialogKind;
  initial?: FormState | null;
  categories: string[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: FormState) => void;
};

const inputClassName =
  'flex min-h-[40px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function MerchantMasterRuleDialog({
  open,
  onOpenChange,
  mode,
  kind,
  initial,
  categories,
  isSubmitting,
  errorMessage,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    if (initial) {
      setForm({ ...initial });
    } else {
      setForm(defaultForm());
    }
  }, [open, initial, mode, kind]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const primary = form.primary.trim();
    const systemCategoryName = form.systemCategoryName.trim();
    if (!primary) {
      setLocalError(kind === 'upi' ? 'UPI substring is required.' : 'Regex pattern is required.');
      return;
    }
    if (!systemCategoryName) {
      setLocalError('System category is required.');
      return;
    }
    if (kind === 'pattern') {
      try {
        void new RegExp(primary);
      } catch {
        setLocalError('Invalid regular expression.');
        return;
      }
    }
    onSubmit({
      primary,
      systemCategoryName,
      type: form.type,
    });
  };

  const title =
    mode === 'create'
      ? kind === 'upi'
        ? 'Add UPI substring rule'
        : 'Add name pattern rule'
      : kind === 'upi'
        ? 'Edit UPI substring rule'
        : 'Edit name pattern rule';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} contentWrapperClassName="max-w-lg">
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {kind === 'upi'
                ? 'Substring matched case-insensitively against UPI VPA and narration.'
                : 'JavaScript regex, matched against description and remarks (invalid patterns are skipped at runtime).'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mm-primary">
                {kind === 'upi' ? 'UPI substring' : 'Regex pattern'}
              </Label>
              {kind === 'upi' ? (
                <Input
                  id="mm-primary"
                  value={form.primary}
                  onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                  placeholder="e.g. paytmqr, swiggy"
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              ) : (
                <textarea
                  id="mm-primary"
                  className={cn(inputClassName, 'min-h-[120px] font-mono text-xs leading-relaxed')}
                  value={form.primary}
                  onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                  placeholder="(?i)\\bmerchantname\\b"
                  disabled={isSubmitting}
                  spellCheck={false}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mm-category">System category</Label>
              <Input
                id="mm-category"
                list="mm-category-suggestions"
                value={form.systemCategoryName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, systemCategoryName: e.target.value }))
                }
                placeholder="e.g. Groceries, Investments"
                autoComplete="off"
                disabled={isSubmitting}
              />
              <datalist id="mm-category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Type</span>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as MerchantMasterRuleType }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Need">Need</SelectItem>
                  <SelectItem value="Want">Want</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(localError || errorMessage) && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {localError || errorMessage}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
