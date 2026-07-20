import type {
  MerchantProfile,
  MerchantType,
  VerificationLevel,
} from './types';
import type { SystemCategoryOption } from '@/types';

export const TYPES: MerchantType[] = ['Need', 'Want', 'Saving', 'Income', 'Transfer', 'Other'];

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export const VERIFICATION_META: Record<VerificationLevel, { label: string; tone: Tone }> = {
  llm_low: { label: 'LLM · low', tone: 'warning' },
  llm_medium: { label: 'LLM · medium', tone: 'warning' },
  llm_high: { label: 'LLM · high', tone: 'info' },
  user_confirmed: { label: 'User confirmed', tone: 'success' },
  multi_user_confirmed: { label: 'Multi-user confirmed', tone: 'success' },
};

export const VERIFICATION_LEVELS = Object.keys(VERIFICATION_META) as VerificationLevel[];

/** KED-1110 — merchant identity trust (who), not category confidence */
export const IDENTITY_SCORE_META: Record<
  1 | 2 | 3 | 4 | 5,
  { label: string; shortLabel: string; tone: Tone }
> = {
  1: { label: '1 — Guess', shortLabel: 'Guess', tone: 'danger' },
  2: { label: '2 — Weak business', shortLabel: 'Weak business', tone: 'warning' },
  3: { label: '3 — User-approved name', shortLabel: 'User-approved', tone: 'success' },
  4: { label: '4 — Strong reused', shortLabel: 'Strong reused', tone: 'success' },
  5: { label: '5 — Known brand', shortLabel: 'Known brand', tone: 'info' },
};

export const IDENTITY_SCORES = [1, 2, 3, 4, 5] as const;

export type IdentityScoreValue = (typeof IDENTITY_SCORES)[number];

export function normalizeIdentityScore(score: number | undefined | null): IdentityScoreValue {
  const n = Math.round(Number(score));
  if (!Number.isFinite(n) || n <= 1) return 1;
  if (n >= 5) return 5;
  return n as IdentityScoreValue;
}

export function identityScoreMeta(score: number | undefined | null) {
  return IDENTITY_SCORE_META[normalizeIdentityScore(score)];
}

export function identityScoreTone(score: number): Tone {
  return identityScoreMeta(score).tone;
}

export function buildCategoryToType(categories: SystemCategoryOption[]): Record<string, MerchantType> {
  const map: Record<string, MerchantType> = {};
  for (const category of categories) {
    const type = category.type as MerchantType;
    if (TYPES.includes(type)) {
      map[category.name] = type;
    }
  }
  return map;
}

export function confidenceTone(c: number): Tone {
  if (c >= 0.8) return 'success';
  if (c >= 0.6) return 'warning';
  return 'danger';
}

export function primaryIdentifier(m: MerchantProfile): { type: string; value: string } | null {
  if (m.upiId) return { type: 'UPI', value: m.upiId };
  const upi = m.identifiers.find((i) => i.type === 'UPI');
  if (upi) return { type: 'UPI', value: upi.value };
  const any = m.identifiers[0];
  return any ? { type: any.type, value: any.value } : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '';
  return (a + b).toUpperCase();
}

let seq = 0;
export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;
