import type { MerchantProfile as ApiProfile } from '@/types';
import { findKeywordDuplicateGroups } from '@/lib/merchant-profiles/duplicateGroups';
import { parseMerchantTags } from '@/lib/merchant-profiles/utils';
import { formatDateTime } from '@/lib/utils';
import type { MerchantProfileBatchPayload } from '@/lib/api/merchantProfiles';
import type { MerchantMasterStats, MerchantProfile as UiProfile, MerchantType } from './types';

export function toHandoffMerchant(api: ApiProfile): UiProfile {
  const tags = parseMerchantTags(api.tags).map((tag) => tag.value);

  return {
    id: api.id,
    canonicalName: api.canonicalName,
    upiId: api.upiId ?? '',
    accountNumber: api.accountNumber ?? '',
    systemCategoryId: api.systemCategoryId,
    category: api.systemCategory.name,
    type: (api.type as MerchantType) || 'Other',
    tags,
    seenCount: api.seenCount,
    confidence: api.confidence,
    identityScore: api.identityScore ?? 1,
    categoryScore: api.categoryScore ?? 1,
    verificationLevel: api.verificationLevel as UiProfile['verificationLevel'],
    createdAt: formatDateTime(api.createdAt),
    updatedAt: formatDateTime(api.updatedAt),
    identifiers: (api.identifiers ?? []).map((identifier) => ({
      id: identifier.id,
      type: identifier.type,
      value: identifier.value,
      createdAt: formatDateTime(identifier.createdAt),
    })),
    aliases: (api.aliases ?? []).map((alias) => ({
      id: alias.id,
      rawName: alias.rawName,
      bankSource: alias.bankSource ?? '',
      seenCount: alias.seenCount,
    })),
    categoryVotes: (api.categoryVotes ?? []).map((vote) => ({
      systemCategoryId: vote.systemCategory.id,
      category: vote.systemCategory.name,
      points: vote.points,
      updatedAt: formatDateTime(api.updatedAt),
    })),
    userMappings: [],
    transactionCount: api._count.transactions,
  };
}

export function computeStats(merchants: ApiProfile[]): MerchantMasterStats {
  const uiMerchants = merchants.map(toHandoffMerchant);

  return {
    totalProfiles: uiMerchants.length,
    needsReview: uiMerchants.filter((merchant) => merchant.identityScore <= 2).length,
    userConfirmed: uiMerchants.filter((merchant) => merchant.identityScore >= 3).length,
    needsCategoryReview: uiMerchants.filter((merchant) => merchant.categoryScore <= 2).length,
    categoryConfirmed: uiMerchants.filter((merchant) => merchant.categoryScore >= 3).length,
    withIdentifiers: uiMerchants.filter(
      (merchant) => Boolean(merchant.upiId) || merchant.identifiers.length > 0
    ).length,
    duplicateGroups: findKeywordDuplicateGroups(merchants).length,
  };
}

type EditorSnapshot = {
  merchant: UiProfile;
  original: UiProfile;
  removedIdentifierIds: string[];
  removedAliasIds: string[];
};

export function toBatchSavePayload(snapshot: EditorSnapshot): MerchantProfileBatchPayload {
  const { merchant, original, removedIdentifierIds, removedAliasIds } = snapshot;

  return {
    canonicalName: merchant.canonicalName.trim(),
    systemCategoryId: merchant.systemCategoryId,
    upiId: merchant.upiId.trim() || null,
    accountNumber: merchant.accountNumber.trim() || null,
    confidence: merchant.confidence,
    identityScore: merchant.identityScore,
    categoryScore: merchant.categoryScore,
    verificationLevel: merchant.verificationLevel,
    type: merchant.type,
    tags: merchant.tags,
    identifiers: merchant.identifiers
      .filter((identifier) => identifier.value.trim())
      .map((identifier) => ({
        id: original.identifiers.some((item) => item.id === identifier.id) ? identifier.id : undefined,
        type: identifier.type,
        value: identifier.value.trim(),
      })),
    aliases: merchant.aliases
      .filter((alias) => alias.rawName.trim())
      .map((alias) => ({
        id: original.aliases.some((item) => item.id === alias.id) ? alias.id : undefined,
        rawName: alias.rawName.trim(),
        bankSource: alias.bankSource?.trim() || null,
      })),
    removedIdentifierIds,
    removedAliasIds,
  };
}
