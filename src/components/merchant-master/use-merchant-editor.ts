import { useCallback } from 'react';
import type { IdentifierType, MerchantProfile } from './types';

export type EditorApi = {
  setField: <K extends keyof MerchantProfile>(field: K, value: MerchantProfile[K]) => void;
  setCategory: (categoryId: string, categoryName: string, type: MerchantProfile['type']) => void;
  addTag: (tag: string) => void;
  removeTag: (index: number) => void;
  addIdentifier: () => void;
  updateIdentifier: (id: string, patch: Partial<{ type: IdentifierType; value: string }>) => void;
  removeIdentifier: (id: string) => void;
  addAlias: () => void;
  updateAlias: (id: string, patch: Partial<{ rawName: string; bankSource: string }>) => void;
  removeAlias: (id: string) => void;
};

export function useMerchantEditor(
  setMerchants: React.Dispatch<React.SetStateAction<MerchantProfile[]>>,
  onRemoveIdentifier?: (id: string) => void,
  onRemoveAlias?: (id: string) => void
) {
  return useCallback(
    (id: string): EditorApi => {
      const patch = (fn: (merchant: MerchantProfile) => MerchantProfile) => {
        setMerchants((list) => list.map((merchant) => (merchant.id === id ? fn(merchant) : merchant)));
      };

      return {
        setField: (field, value) => patch((merchant) => ({ ...merchant, [field]: value })),
        setCategory: (categoryId, categoryName, type) =>
          patch((merchant) => ({
            ...merchant,
            systemCategoryId: categoryId,
            category: categoryName,
            type,
          })),
        addTag: (tag) => patch((merchant) => ({ ...merchant, tags: [...merchant.tags, tag] })),
        removeTag: (index) =>
          patch((merchant) => ({
            ...merchant,
            tags: merchant.tags.filter((_, itemIndex) => itemIndex !== index),
          })),
        addIdentifier: () =>
          patch((merchant) => ({
            ...merchant,
            identifiers: [
              ...merchant.identifiers,
              {
                id: `new_${Date.now()}`,
                type: 'UPI',
                value: '',
                createdAt: 'Today',
              },
            ],
          })),
        updateIdentifier: (identifierId, update) =>
          patch((merchant) => ({
            ...merchant,
            identifiers: merchant.identifiers.map((identifier) =>
              identifier.id === identifierId ? { ...identifier, ...update } : identifier
            ),
          })),
        removeIdentifier: (identifierId) => {
          onRemoveIdentifier?.(identifierId);
          patch((merchant) => ({
            ...merchant,
            identifiers: merchant.identifiers.filter((identifier) => identifier.id !== identifierId),
          }));
        },
        addAlias: () =>
          patch((merchant) => ({
            ...merchant,
            aliases: [
              ...merchant.aliases,
              { id: `new_${Date.now()}`, rawName: '', bankSource: '', seenCount: 0 },
            ],
          })),
        updateAlias: (aliasId, update) =>
          patch((merchant) => ({
            ...merchant,
            aliases: merchant.aliases.map((alias) =>
              alias.id === aliasId ? { ...alias, ...update } : alias
            ),
          })),
        removeAlias: (aliasId) => {
          onRemoveAlias?.(aliasId);
          patch((merchant) => ({
            ...merchant,
            aliases: merchant.aliases.filter((alias) => alias.id !== aliasId),
          }));
        },
      };
    },
    [onRemoveAlias, onRemoveIdentifier, setMerchants]
  );
}
