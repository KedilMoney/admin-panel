import type { MerchantProfile } from '@/types';

export const KEYWORD_MIN_LENGTH = 5;
const MAX_GROUP_SIZE = 60;
const MAX_PREFIX_LEN = 10;

export type DuplicateMerchantGroup = {
  id: string;
  label: string;
  members: MerchantProfile[];
};

const STOP_KEYWORDS = new Set([
  'paytm',
  'phonepe',
  'googlepay',
  'bhim',
  'hdfc',
  'hdfcbank',
  'okhdfcbank',
  'icici',
  'axisbank',
  'yesbank',
  'ybl',
  'axl',
  'sbicard',
  'sbicards',
  'billdesk',
  'billdeskpg',
  'razorpay',
  'rzp',
  'payment',
  'transfer',
  'debit',
  'credit',
  'online',
  'slice',
  'pty',
  'ptys',
  'ptaxi',
  'ptaxis',
  'ptyes',
  'clearing',
  'indian',
  'corporation',
  'limited',
  'chennai',
  'mumbai',
  'delhi',
  'bangalore',
  'hyderabad',
  'kolkata',
  'india',
  'smart',
  'ticket',
  'wallet',
  'merchant',
  'services',
  'private',
]);

function isValidKeyword(keyword: string): boolean {
  if (keyword.length < KEYWORD_MIN_LENGTH) return false;
  if (/^\d+$/.test(keyword)) return false;
  if (STOP_KEYWORDS.has(keyword)) return false;
  return true;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s@._/-]/g, ' ')
    .split(/[\s@._/\\-]+/)
    .filter(Boolean);
}

function collectKeywordCandidates(text: string): string[] {
  const candidates = new Set<string>();

  for (const token of tokenize(text)) {
    if (token.length < KEYWORD_MIN_LENGTH) continue;

    if (isValidKeyword(token)) {
      candidates.add(token);
    }

    const maxPrefix = Math.min(token.length, MAX_PREFIX_LEN);
    for (let len = KEYWORD_MIN_LENGTH; len < maxPrefix; len++) {
      const prefix = token.slice(0, len);
      if (isValidKeyword(prefix)) {
        candidates.add(prefix);
      }
    }
  }

  return [...candidates];
}

function getMerchantTexts(merchant: MerchantProfile): string[] {
  const texts = [merchant.canonicalName];
  if (merchant.upiId) texts.push(merchant.upiId);
  if (merchant.accountNumber) texts.push(merchant.accountNumber);
  for (const alias of merchant.aliases ?? []) {
    texts.push(alias.rawName);
  }
  for (const identifier of merchant.identifiers ?? []) {
    texts.push(identifier.value);
  }
  return texts;
}

export function getMerchantSearchableText(merchant: MerchantProfile): string {
  return getMerchantTexts(merchant).join(' ').toLowerCase();
}

export function merchantMatchesKeyword(merchant: MerchantProfile, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (needle.length < KEYWORD_MIN_LENGTH) return false;
  return getMerchantSearchableText(merchant).includes(needle);
}

function collectAllKeywordCandidates(merchants: MerchantProfile[]): Set<string> {
  const keywords = new Set<string>();
  for (const merchant of merchants) {
    for (const text of getMerchantTexts(merchant)) {
      for (const keyword of collectKeywordCandidates(text)) {
        keywords.add(keyword);
      }
    }
  }
  return keywords;
}

function memberSetKey(members: MerchantProfile[]): string {
  return members
    .map((member) => member.id)
    .sort()
    .join(',');
}

export function formatGroupLabel(keyword: string): string {
  if (!keyword) return keyword;
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export function pickSuggestedSurvivor(members: MerchantProfile[]): MerchantProfile {
  const trustRank = (level: string) => {
    if (level === 'multi_user_confirmed') return 5;
    if (level === 'user_confirmed') return 4;
    if (level === 'llm_high') return 3;
    if (level === 'llm_medium') return 2;
    return 1;
  };

  return [...members].sort((left, right) => {
    const trustDiff = trustRank(right.verificationLevel) - trustRank(left.verificationLevel);
    if (trustDiff !== 0) return trustDiff;
    return right._count.transactions - left._count.transactions;
  })[0];
}

export function findKeywordDuplicateGroups(merchants: MerchantProfile[]): DuplicateMerchantGroup[] {
  if (merchants.length < 2) return [];

  const keywords = collectAllKeywordCandidates(merchants);
  const groupsByMembers = new Map<
    string,
    { label: string; members: MerchantProfile[] }
  >();

  for (const keyword of keywords) {
    const members = merchants
      .filter((merchant) => merchantMatchesKeyword(merchant, keyword))
      .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));

    if (members.length < 2 || members.length > MAX_GROUP_SIZE) continue;

    const key = memberSetKey(members);
    const existing = groupsByMembers.get(key);

    if (!existing || keyword.length > existing.label.length) {
      groupsByMembers.set(key, { label: keyword, members });
    }
  }

  return [...groupsByMembers.values()]
    .map((group) => ({
      id: `keyword:${group.label}`,
      label: group.label,
      members: group.members,
    }))
    .sort((left, right) => {
      if (right.members.length !== left.members.length) {
        return right.members.length - left.members.length;
      }
      return left.label.localeCompare(right.label);
    });
}
