'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REWARD_MODE_LABELS, REWARD_REDEMPTION_MODES } from '@/lib/api/rewardValueRates';
import { BankSelectField } from './bank-select-field';
import type { ModeRateFormEntry, RateFormState } from './rate-form-utils';

interface RateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  form: RateFormState;
  onFormChange: (form: RateFormState) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function RateFormDialog({
  open,
  onOpenChange,
  isEdit,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: RateFormDialogProps) {
  const setField = <K extends keyof RateFormState>(key: K, value: RateFormState[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  const setModeField = <K extends keyof ModeRateFormEntry>(
    mode: ModeRateFormEntry['mode'],
    key: K,
    value: ModeRateFormEntry[K]
  ) => {
    onFormChange({
      ...form,
      modes: form.modes.map((entry) => (entry.mode === mode ? { ...entry, [key]: value } : entry)),
    });
  };

  const filledModeCount = form.modes.filter((entry) => entry.valuePerPoint.trim()).length;
  const cardLabel = form.cardName.trim() || 'All cards';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} contentWrapperClassName="max-w-2xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit reward value rates' : 'Add reward value rates'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update redemption values for ${form.bankName || 'this bank'} · ${cardLabel}.`
              : 'Set rupee value per reward point for one bank and card across multiple redemption modes.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BankSelectField
              value={form.bankName}
              onChange={(bankName) => setField('bankName', bankName)}
              disabled={isSubmitting || isEdit}
            />

            <div className="space-y-2">
              <Label htmlFor="cardName">Card name</Label>
              <Input
                id="cardName"
                value={form.cardName}
                onChange={(event) => setField('cardName', event.target.value)}
                placeholder="Infinia"
                disabled={isSubmitting || isEdit}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Leave blank to apply these rates to every card from the bank.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Redemption modes</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                {filledModeCount} mode{filledModeCount === 1 ? '' : 's'} configured
              </span>
            </div>
            <div className="overflow-hidden rounded-md border border-[var(--border)]">
              <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                <span>Mode</span>
                <span>Value / point (₹)</span>
                <span>Min points</span>
              </div>
              {REWARD_REDEMPTION_MODES.map((mode) => {
                const entry = form.modes.find((row) => row.mode === mode);
                if (!entry) return null;

                return (
                  <div
                    key={mode}
                    className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-[var(--border)] px-3 py-3 last:border-b-0"
                  >
                    <div className="flex items-center text-sm font-medium text-[var(--foreground)]">
                      {REWARD_MODE_LABELS[mode]}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={entry.valuePerPoint}
                      onChange={(event) => setModeField(mode, 'valuePerPoint', event.target.value)}
                      placeholder="Optional"
                      disabled={isSubmitting}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={entry.minPoints}
                      onChange={(event) => setModeField(mode, 'minPoints', event.target.value)}
                      placeholder="Optional"
                      disabled={isSubmitting}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Fill in only the modes you want. Leave a row blank to skip it on create, or remove it on edit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective from</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={form.effectiveFrom}
                onChange={(event) => setField('effectiveFrom', event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">Effective to</Label>
              <Input
                id="effectiveTo"
                type="date"
                value={form.effectiveTo}
                onChange={(event) => setField('effectiveTo', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={form.source}
              onChange={(event) => setField('source', event.target.value)}
              placeholder="HDFC Smartbuy T&C"
              disabled={isSubmitting}
            />
          </div>

          {isEdit ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setField('isActive', event.target.checked)}
                disabled={isSubmitting}
              />
              Active
            </label>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create rates'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export {
  EMPTY_RATE_FORM,
  buildSubmitActions,
  cardGroupKey,
  ratesToForm,
  validateRateForm,
} from './rate-form-utils';
export type { RateFormState } from './rate-form-utils';
