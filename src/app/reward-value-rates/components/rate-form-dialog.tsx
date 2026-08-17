'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    <Dialog open={open} onOpenChange={onOpenChange} contentWrapperClassName="max-w-2xl my-4">
      <DialogContent className="flex max-h-[min(90vh,760px)] flex-col overflow-hidden p-0">
        <div className="shrink-0 space-y-1 border-b border-[var(--border)] px-5 py-4">
          <DialogTitle className="text-xl">{isEdit ? 'Edit reward value rates' : 'Add reward value rates'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update redemption values for ${form.bankName || 'this bank'} · ${cardLabel}.`
              : 'Configure every redemption mode for one bank and card in a single save.'}
          </DialogDescription>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                  className="h-9"
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
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] gap-2 border-b border-[var(--border)] bg-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  <span>Mode</span>
                  <span>Value / pt (₹)</span>
                  <span>Min pts</span>
                </div>
                {REWARD_REDEMPTION_MODES.map((mode) => {
                  const entry = form.modes.find((row) => row.mode === mode);
                  if (!entry) return null;

                  return (
                    <div
                      key={mode}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] gap-2 border-b border-[var(--border)] px-2.5 py-1.5 last:border-b-0"
                    >
                      <div className="flex items-center text-sm text-[var(--foreground)]">
                        {REWARD_MODE_LABELS[mode]}
                      </div>
                      <Input
                        className="h-8"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={entry.valuePerPoint}
                        onChange={(event) => setModeField(mode, 'valuePerPoint', event.target.value)}
                        placeholder="—"
                        disabled={isSubmitting}
                      />
                      <Input
                        className="h-8"
                        type="number"
                        min="0"
                        step="1"
                        value={entry.minPoints}
                        onChange={(event) => setModeField(mode, 'minPoints', event.target.value)}
                        placeholder="—"
                        disabled={isSubmitting}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Leave a mode blank to skip it. The list view groups all modes under one card row.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective from</Label>
                <Input
                  id="effectiveFrom"
                  className="h-9"
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
                  className="h-9"
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
                className="h-9"
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
          </div>

          <DialogFooter className="mt-0 shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-5 py-4">
            {errorMessage ? (
              <p className="mr-auto text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            ) : null}
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
  groupRatesByCard,
  ratesToForm,
  validateRateForm,
} from './rate-form-utils';
export type { RateCardGroup, RateFormState } from './rate-form-utils';
