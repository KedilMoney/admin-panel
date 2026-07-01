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
