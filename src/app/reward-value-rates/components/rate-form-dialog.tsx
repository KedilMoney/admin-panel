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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  REWARD_MODE_LABELS,
  REWARD_REDEMPTION_MODES,
  RewardRedemptionMode,
  RewardValueRate,
  RewardValueRateInput,
} from '@/lib/api/rewardValueRates';

export type RateFormState = {
  bankName: string;
  cardName: string;
  mode: RewardRedemptionMode;
  valuePerPoint: string;
  minPoints: string;
  effectiveFrom: string;
  effectiveTo: string;
  source: string;
  isActive: boolean;
};

export const EMPTY_RATE_FORM: RateFormState = {
  bankName: '',
  cardName: '',
  mode: 'FLIGHT',
  valuePerPoint: '',
  minPoints: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  source: '',
  isActive: true,
};

export function rateToForm(rate: RewardValueRate): RateFormState {
  return {
    bankName: rate.bankName,
    cardName: rate.cardName ?? '',
    mode: rate.mode,
    valuePerPoint: String(rate.valuePerPoint),
    minPoints: rate.minPoints != null ? String(rate.minPoints) : '',
    effectiveFrom: rate.effectiveFrom.slice(0, 10),
    effectiveTo: rate.effectiveTo ? rate.effectiveTo.slice(0, 10) : '',
    source: rate.source ?? '',
    isActive: rate.isActive,
  };
}

export function formToInput(form: RateFormState): RewardValueRateInput {
  const minPointsRaw = form.minPoints.trim();
  return {
    bankName: form.bankName.trim(),
    cardName: form.cardName.trim() ? form.cardName.trim() : null,
    mode: form.mode,
    valuePerPoint: Number(form.valuePerPoint),
    minPoints: minPointsRaw ? Number(minPointsRaw) : null,
    effectiveFrom: new Date(`${form.effectiveFrom}T00:00:00.000Z`).toISOString(),
    effectiveTo: form.effectiveTo.trim()
      ? new Date(`${form.effectiveTo}T00:00:00.000Z`).toISOString()
      : null,
    source: form.source.trim() ? form.source.trim() : null,
    isActive: form.isActive,
  };
}

interface RateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRate: RewardValueRate | null;
  form: RateFormState;
  onFormChange: (form: RateFormState) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function RateFormDialog({
  open,
  onOpenChange,
  editingRate,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: RateFormDialogProps) {
  const setField = <K extends keyof RateFormState>(key: K, value: RateFormState[K]) => {
    onFormChange({ ...form, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} contentWrapperClassName="max-w-xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingRate ? 'Edit reward value rate' : 'Add reward value rate'}</DialogTitle>
          <DialogDescription>
            Set how many rupees one reward point is worth for a bank and redemption mode.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank name</Label>
            <Input
              id="bankName"
              value={form.bankName}
              onChange={(event) => setField('bankName', event.target.value)}
              placeholder="HDFC"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardName">Card name</Label>
            <Input
              id="cardName"
              value={form.cardName}
              onChange={(event) => setField('cardName', event.target.value)}
              placeholder="Infinia"
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Leave blank to apply this rate to every card from the bank.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Redemption mode</Label>
            <Select value={form.mode} onValueChange={(value) => setField('mode', value as RewardRedemptionMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {REWARD_REDEMPTION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {REWARD_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valuePerPoint">Value per point (₹)</Label>
              <Input
                id="valuePerPoint"
                type="number"
                min="0"
                step="0.0001"
                value={form.valuePerPoint}
                onChange={(event) => setField('valuePerPoint', event.target.value)}
                placeholder="1.0"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minPoints">Minimum points</Label>
              <Input
                id="minPoints"
                type="number"
                min="0"
                step="1"
                value={form.minPoints}
                onChange={(event) => setField('minPoints', event.target.value)}
                placeholder="Optional"
                disabled={isSubmitting}
              />
            </div>
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

          {editingRate ? (
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
              {isSubmitting ? 'Saving…' : editingRate ? 'Save changes' : 'Create rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
