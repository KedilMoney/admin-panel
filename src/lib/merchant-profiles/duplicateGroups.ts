import type { MerchantProfile } from '@/types';

export const DUPLICATE_NAME_MIN_MATCH = 5;
const MAX_SUBSTRING_INDEX_LEN = 12;

export type DuplicateMerchantGroup = {
  id: string;
  label: string;
  members: MerchantProfile[];
};

function normalizeCompact(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeSpaced(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getIndexingKeys(name: string, minLen = DUPLICATE_NAME_MIN_MATCH): string[] {
  const compact = normalizeCompact(name);
  const keys = new Set<string>();

  for (const token of normalizeSpaced(name).split(' ')) {
    if (token.length >= minLen) {
      keys.add(token);
    }
  }

  if (compact.length >= minLen) {
    const maxLen = Math.min(compact.length, MAX_SUBSTRING_INDEX_LEN);
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i <= compact.length - len; i++) {
        keys.add(compact.slice(i, i + len));
      }
    }
  }

  return [...keys];
}

function findLongestSharedSubstring(names: string[], minLen: number): string {
  let best = '';
  const reference = names[0] ?? '';

  for (let len = Math.min(24, reference.length); len >= minLen; len--) {
    for (let i = 0; i <= reference.length - len; i++) {
      const candidate = reference.slice(i, i + len);
      if (names.every((name) => name.includes(candidate)) && candidate.length > best.length) {
        best = candidate;
      }
    }
  }

  return best;
}

function buildUnionFind(ids: string[]) {
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const unite = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };

  for (const id of ids) {
    parent.set(id, id);
  }

  return { find, unite };
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

export function findDuplicateMerchantGroups(
  merchants: MerchantProfile[],
  minLen = DUPLICATE_NAME_MIN_MATCH
): DuplicateMerchantGroup[] {
  if (merchants.length < 2) return [];

  const { find, unite } = buildUnionFind(merchants.map((merchant) => merchant.id));
  const keyToIds = new Map<string, string[]>();

  for (const merchant of merchants) {
    for (const key of getIndexingKeys(merchant.canonicalName, minLen)) {
      if (!keyToIds.has(key)) {
        keyToIds.set(key, []);
      }
      keyToIds.get(key)!.push(merchant.id);
    }
  }

  for (const ids of keyToIds.values()) {
    if (ids.length < 2) continue;
    const uniqueIds = [...new Set(ids)];
    for (let i = 1; i < uniqueIds.length; i++) {
      unite(uniqueIds[0], uniqueIds[i]);
    }
  }

  const grouped = new Map<string, MerchantProfile[]>();
  for (const merchant of merchants) {
    const root = find(merchant.id);
    if (!grouped.has(root)) {
      grouped.set(root, []);
    }
    grouped.get(root)!.push(merchant);
  }

  const groups: DuplicateMerchantGroup[] = [];

  for (const members of grouped.values()) {
    if (members.length < 2) continue;

    const compactNames = members.map((member) => normalizeCompact(member.canonicalName));
    const label = findLongestSharedSubstring(compactNames, minLen) || members[0].canonicalName;

    groups.push({
      id: [...members]
        .map((member) => member.id)
        .sort()
        .join(':'),
      label,
      members: [...members].sort((left, right) =>
        left.canonicalName.localeCompare(right.canonicalName)
      ),
    });
  }

  return groups.sort((left, right) => {
    if (right.members.length !== left.members.length) {
      return right.members.length - left.members.length;
    }
    return left.label.localeCompare(right.label);
  });
}

export function formatDuplicateGroupLabel(label: string): string {
  const spaced = label.replace(/([A-Z0-9])(?=[A-Z0-9][a-z])/g, '$1 ').trim();
  return spaced || label;
}
