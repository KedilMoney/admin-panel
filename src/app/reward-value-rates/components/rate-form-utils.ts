import {
  REWARD_REDEMPTION_MODES,
  RewardRedemptionMode,
  RewardValueRate,
  RewardValueRateInput,
} from '@/lib/api/rewardValueRates';

export type ModeRateFormEntry = {
  id?: string;
  mode: RewardRedemptionMode;
  valuePerPoint: string;
  minPoints: string;
};

export type RateFormState = {
  bankName: string;
  cardName: string;
  effectiveFrom: string;
  effectiveTo: string;
  source: string;
  isActive: boolean;
  modes: ModeRateFormEntry[];
};

export function cardGroupKey(rate: Pick<RewardValueRate, 'bankName' | 'cardName'>): string {
  return `${rate.bankName}::${rate.cardName ?? ''}`;
}

export type RateCardGroup = {
  key: string;
  bankName: string;
  cardName: string | null;
  rates: RewardValueRate[];
};

export function groupRatesByCard(rates: RewardValueRate[]): RateCardGroup[] {
  const groups = new Map<string, RewardValueRate[]>();

  for (const rate of rates) {
    const key = cardGroupKey(rate);
    const existing = groups.get(key) ?? [];
    existing.push(rate);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([key, groupRates]) => {
      const primary = groupRates[0];
      const modeOrder = new Map(REWARD_REDEMPTION_MODES.map((mode, index) => [mode, index]));
      const sortedRates = [...groupRates].sort(
        (a, b) => (modeOrder.get(a.mode) ?? 99) - (modeOrder.get(b.mode) ?? 99)
      );
      return {
        key,
        bankName: primary.bankName,
        cardName: primary.cardName,
        rates: sortedRates,
      };
    })
    .sort((a, b) => {
      const bank = a.bankName.localeCompare(b.bankName);
      if (bank !== 0) return bank;
      return (a.cardName ?? '').localeCompare(b.cardName ?? '');
    });
}

function emptyModeEntries(): ModeRateFormEntry[] {
  return REWARD_REDEMPTION_MODES.map((mode) => ({
    mode,
    valuePerPoint: '',
    minPoints: '',
  }));
}

export const EMPTY_RATE_FORM: RateFormState = {
  bankName: '',
  cardName: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  source: '',
  isActive: true,
  modes: emptyModeEntries(),
};

export function ratesToForm(groupRates: RewardValueRate[]): RateFormState {
  const primary = groupRates[0];
  if (!primary) return EMPTY_RATE_FORM;

  const modes = emptyModeEntries().map((entry) => {
    const existing = groupRates.find((rate) => rate.mode === entry.mode);
    if (!existing) return entry;
    return {
      id: existing.id,
      mode: existing.mode,
      valuePerPoint: String(existing.valuePerPoint),
      minPoints: existing.minPoints != null ? String(existing.minPoints) : '',
    };
  });

  return {
    bankName: primary.bankName,
    cardName: primary.cardName ?? '',
    effectiveFrom: primary.effectiveFrom.slice(0, 10),
    effectiveTo: primary.effectiveTo ? primary.effectiveTo.slice(0, 10) : '',
    source: primary.source ?? '',
    isActive: groupRates.every((rate) => rate.isActive),
    modes,
  };
}

function buildSharedInput(form: RateFormState): Omit<RewardValueRateInput, 'mode' | 'valuePerPoint' | 'minPoints'> {
  return {
    bankName: form.bankName.trim(),
    cardName: form.cardName.trim() ? form.cardName.trim() : null,
    effectiveFrom: new Date(`${form.effectiveFrom}T00:00:00.000Z`).toISOString(),
    effectiveTo: form.effectiveTo.trim()
      ? new Date(`${form.effectiveTo}T00:00:00.000Z`).toISOString()
      : null,
    source: form.source.trim() ? form.source.trim() : null,
    isActive: form.isActive,
  };
}

export function modeEntryToInput(form: RateFormState, entry: ModeRateFormEntry): RewardValueRateInput {
  const minPointsRaw = entry.minPoints.trim();
  return {
    ...buildSharedInput(form),
    mode: entry.mode,
    valuePerPoint: Number(entry.valuePerPoint),
    minPoints: minPointsRaw ? Number(minPointsRaw) : null,
  };
}

export function parseModeValue(valuePerPoint: string): number | null {
  const trimmed = valuePerPoint.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

export function validateRateForm(form: RateFormState): string | null {
  if (!form.bankName.trim()) return 'Bank name is required.';
  if (!form.effectiveFrom) return 'Effective from date is required.';

  const filledModes = form.modes.filter((entry) => parseModeValue(entry.valuePerPoint) != null);
  if (filledModes.length === 0) {
    return 'Add at least one redemption mode with a positive value per point.';
  }

  for (const entry of filledModes) {
    const minPointsRaw = entry.minPoints.trim();
    if (minPointsRaw) {
      const minPoints = Number(minPointsRaw);
      if (!Number.isInteger(minPoints) || minPoints < 0) {
        return `${entry.mode}: minimum points must be a whole number ≥ 0.`;
      }
    }
  }

  return null;
}

export type RateFormSubmitAction =
  | { type: 'create'; input: RewardValueRateInput }
  | { type: 'update'; id: string; input: Partial<RewardValueRateInput> }
  | { type: 'delete'; id: string };

export function buildSubmitActions(form: RateFormState, isEdit: boolean): RateFormSubmitAction[] {
  const actions: RateFormSubmitAction[] = [];

  for (const entry of form.modes) {
    const valuePerPoint = parseModeValue(entry.valuePerPoint);
    if (valuePerPoint != null) {
      const input = modeEntryToInput(form, entry);
      if (entry.id) {
        actions.push({ type: 'update', id: entry.id, input });
      } else {
        actions.push({ type: 'create', input });
      }
      continue;
    }

    if (isEdit && entry.id) {
      actions.push({ type: 'delete', id: entry.id });
    }
  }

  return actions;
}
