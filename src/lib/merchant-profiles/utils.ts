import type { MerchantIdentifier, MerchantProfile, MerchantTag } from '@/types';

export const VERIFICATION_LEVELS = [
  'llm_low',
  'llm_medium',
  'llm_high',
  'user_confirmed',
  'multi_user_confirmed',
] as const;

export type VerificationLevelFilter = (typeof VERIFICATION_LEVELS)[number] | 'all';

export const formatVerificationLevel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getVerificationTone = (level: string) => {
  if (level === 'multi_user_confirmed' || level === 'user_confirmed') {
    return 'trusted' as const;
  }
  if (level === 'llm_high') return 'high' as const;
  if (level === 'llm_medium') return 'medium' as const;
  return 'low' as const;
};

export const needsReview = (level: string) =>
  level === 'llm_low' || level === 'llm_medium';

export const parseMerchantTags = (tags: unknown): MerchantTag[] => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter(
      (tag): tag is MerchantTag =>
        Boolean(tag) &&
        typeof tag === 'object' &&
        typeof (tag as MerchantTag).value === 'string' &&
        typeof (tag as MerchantTag).count === 'number'
    )
    .map((tag) => ({
      value: tag.value,
      count: tag.count,
      isPrimary: Boolean(tag.isPrimary),
    }));
};

export const getPrimaryIdentifier = (merchant: MerchantProfile): MerchantIdentifier | null => {
  const identifiers = merchant.identifiers ?? [];
  if (identifiers.length > 0) {
    return identifiers.find((item) => item.type === 'UPI') ?? identifiers[0];
  }
  if (merchant.upiId) {
    return {
      id: 'legacy-upi',
      type: 'UPI',
      value: merchant.upiId,
      createdAt: merchant.updatedAt,
    };
  }
  if (merchant.accountNumber) {
    return {
      id: 'legacy-account',
      type: 'ACCOUNT',
      value: merchant.accountNumber,
      createdAt: merchant.updatedAt,
    };
  }
  return null;
};

export const formatIdentifierLabel = (identifier: MerchantIdentifier) => {
  if (identifier.type === 'UPI') return `UPI · ${identifier.value}`;
  if (identifier.type === 'NEFT') return `NEFT · ${identifier.value}`;
  return `Acct · ${identifier.value}`;
};

export const getIdentifierCount = (merchant: MerchantProfile) =>
  merchant._count.identifiers ?? merchant.identifiers?.length ?? 0;

export const hasPaymentIdentifiers = (merchant: MerchantProfile) =>
  getIdentifierCount(merchant) > 0 || Boolean(merchant.upiId || merchant.accountNumber);

export const getTopAliases = (merchant: MerchantProfile, limit = 2) =>
  (merchant.aliases ?? []).slice(0, limit);
