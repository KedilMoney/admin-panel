# Merchant Master Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/merchant-master` by porting the designer handoff (lift-and-wire), supporting both `table-drawer` and `split` layouts, batched save-on-button, and full Signals tab with user mappings.

**Architecture:** Port handoff React + CSS into `admin-panel/src/components/merchant-master/`. Extend `kedil_be` PUT endpoint for batched saves and add GET detail for user mappings. `page.tsx` fetches data, adapts types, wires callbacks.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Express/Prisma, handoff plain CSS (`.mm` scope)

**Spec:** `docs/superpowers/specs/2026-07-01-merchant-master-redesign-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `kedil_be/src/services/autoCategorization/merchantProfileAdminOps.ts` | Modify | `saveMerchantProfileBatch`, `getProfileUserMappings` |
| `kedil_be/src/controllers/admin.ts` | Modify | Extended PUT parser, `getMerchantProfileDetail` |
| `kedil_be/src/routes/admin.ts` | Modify | `GET /merchant-profiles/:id/detail` route |
| `admin-panel/src/components/merchant-master/tokens.css` | Create | Design tokens from handoff |
| `admin-panel/src/components/merchant-master/merchant-master.css` | Create | Component styles from handoff |
| `admin-panel/src/components/merchant-master/types.ts` | Create | Handoff domain types |
| `admin-panel/src/components/merchant-master/adapters.ts` | Create | API ↔ handoff mapping |
| `admin-panel/src/components/merchant-master/use-merchant-editor.ts` | Create | Local edit state hook |
| `admin-panel/src/components/merchant-master/MerchantMaster.tsx` | Create | Page shell, both variants |
| `admin-panel/src/components/merchant-master/MerchantDetail.tsx` | Create | Drawer + split panel |
| `admin-panel/src/components/merchant-master/create-merchant-dialog.tsx` | Create | Add merchant (mm-styled) |
| `admin-panel/src/components/merchant-master/merchant-profile-merge-dialog.tsx` | Move | From `merchant-profiles/` |
| `admin-panel/src/lib/api/merchantProfiles.ts` | Modify | `saveBatch`, `getDetail` |
| `admin-panel/src/lib/hooks/useMerchantProfiles.ts` | Modify | New mutations/queries |
| `admin-panel/src/app/merchant-master/page.tsx` | Replace | Thin wiring layer |
| `admin-panel/src/components/merchant-profiles/*` | Delete | Obsolete after cutover |

---

## Task 1: Backend — batched profile save

**Files:**
- Modify: `kedil_be/src/services/autoCategorization/merchantProfileAdminOps.ts`
- Modify: `kedil_be/src/controllers/admin.ts`

- [ ] **Step 1: Add `saveMerchantProfileBatch` service**

In `merchantProfileAdminOps.ts`, add:

```ts
export type MerchantProfileBatchInput = {
  canonicalName: string;
  systemCategoryId: string;
  upiId: string | null;
  accountNumber: string | null;
  confidence: number;
  verificationLevel: string;
  type: string;
  tags: string[];
  identifiers: { id?: string; type: "UPI" | "NEFT" | "ACCOUNT"; value: string }[];
  aliases: { id?: string; rawName: string; bankSource: string | null }[];
  removedIdentifierIds: string[];
  removedAliasIds: string[];
};

export async function saveMerchantProfileBatch(
  profileId: string,
  input: MerchantProfileBatchInput
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.merchantProfile.update({
      where: { id: profileId },
      data: {
        canonicalName: input.canonicalName,
        systemCategoryId: input.systemCategoryId,
        type: input.type,
        upiId: input.upiId,
        accountNumber: input.accountNumber,
        confidence: input.confidence,
        verificationLevel: input.verificationLevel,
        tags: input.tags.map((value) => ({ value, count: 1, isPrimary: false })),
      },
    });

    if (input.removedIdentifierIds.length) {
      await tx.merchantIdentifier.deleteMany({
        where: { id: { in: input.removedIdentifierIds }, merchantProfileId: profileId },
      });
    }
    if (input.removedAliasIds.length) {
      await tx.merchantAlias.deleteMany({
        where: { id: { in: input.removedAliasIds }, merchantProfileId: profileId },
      });
    }

    for (const idn of input.identifiers) {
      const value = idn.value.trim();
      if (!value) continue;
      if (idn.id) {
        await tx.merchantIdentifier.update({
          where: { id: idn.id },
          data: { type: idn.type, value },
        });
      } else {
        await tx.merchantIdentifier.create({
          data: { merchantProfileId: profileId, type: idn.type, value },
        });
      }
    }

    for (const al of input.aliases) {
      const rawName = al.rawName.trim();
      if (!rawName) continue;
      if (al.id) {
        await tx.merchantAlias.update({
          where: { id: al.id },
          data: { rawName, bankSource: al.bankSource },
        });
      } else {
        await tx.merchantAlias.create({
          data: { merchantProfileId: profileId, rawName, bankSource: al.bankSource },
        });
      }
    }

    const { upsertMerchantIdentifiers } = await import("./merchantIdentifierService");
    await upsertMerchantIdentifiers(profileId, {
      upiId: input.upiId,
      accountNumber: input.accountNumber,
    });

    const { refreshSoftUserMerchantMappingsForProfile } = await import(
      "./userMerchantMappingService"
    );
    await refreshSoftUserMerchantMappingsForProfile({
      upiId: input.upiId,
      accountNumber: input.accountNumber,
      systemCategoryId: input.systemCategoryId,
    });

    return profile;
  });
}
```

- [ ] **Step 2: Add extended payload parser in `admin.ts`**

Add `parseMerchantProfileBatchPayload` validating all fields from spec. Replace `updateMerchantProfile` body to call `saveMerchantProfileBatch` then re-fetch with `merchantProfileSelect`.

- [ ] **Step 3: Typecheck backend**

Run: `cd kedil_be && npx tsc --noEmit`  
Expected: PASS

---

## Task 2: Backend — user mappings detail endpoint

**Files:**
- Modify: `kedil_be/src/services/autoCategorization/merchantProfileAdminOps.ts`
- Modify: `kedil_be/src/controllers/admin.ts`
- Modify: `kedil_be/src/routes/admin.ts`

- [ ] **Step 1: Add `collectMerchantKeysForProfile` helper**

```ts
import { buildAccountMerchantKey, normalizeUpiId } from "./merchantKey";

function collectMerchantKeysForProfile(profile: {
  upiId: string | null;
  accountNumber: string | null;
  identifiers: { type: string; value: string }[];
  aliases: { rawName: string }[];
}): string[] {
  const keys = new Set<string>();
  const upi = normalizeUpiId(profile.upiId);
  if (upi) keys.add(`upi:${upi}`);
  const acct = profile.accountNumber?.trim();
  if (acct) keys.add(buildAccountMerchantKey(acct));

  for (const idn of profile.identifiers) {
    const v = idn.value.trim();
    if (!v) continue;
    if (idn.type === "UPI") keys.add(`upi:${normalizeUpiId(v)}`);
    else if (idn.type === "ACCOUNT") keys.add(buildAccountMerchantKey(v));
  }
  for (const al of profile.aliases) {
    const name = al.rawName.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
    if (name) keys.add(`name:${name}`);
  }
  return [...keys];
}
```

- [ ] **Step 2: Add `getProfileUserMappings(profileId)`**

Query profile with identifiers + aliases, collect keys, then:

```ts
const rows = await prisma.userMerchantMapping.findMany({
  where: { merchantKey: { in: keys } },
  select: {
    merchantKey: true,
    userCorrected: true,
    confirmed: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { name: true } },
  },
  orderBy: { updatedAt: "desc" },
  take: 100,
});
```

Map to handoff shape with ISO date formatting.

- [ ] **Step 3: Wire route**

In `routes/admin.ts` before `/:id` PUT routes:

```ts
router.get("/merchant-profiles/:id/detail", async (req, res) => {
  await AdminController.getMerchantProfileDetail(req, res);
});
```

- [ ] **Step 4: Typecheck backend**

Run: `cd kedil_be && npx tsc --noEmit`  
Expected: PASS

---

## Task 3: Port handoff assets to admin-panel

**Files:**
- Create: `admin-panel/src/components/merchant-master/tokens.css`
- Create: `admin-panel/src/components/merchant-master/merchant-master.css`
- Create: `admin-panel/src/components/merchant-master/types.ts`

- [ ] **Step 1: Copy CSS from handoff**

Copy `/tmp/merchant-handoff/design_handoff_merchant_master/src/tokens.css` and `merchant-master.css` verbatim into `components/merchant-master/`.

- [ ] **Step 2: Copy `types.ts` from handoff**

Copy handoff `types.ts` including `MerchantMasterStats`, `MerchantProfile`, `UserMerchantMapping`, etc.

- [ ] **Step 3: Verify imports**

No code changes yet — files exist and are valid CSS/TS.

---

## Task 4: Type adapters

**Files:**
- Create: `admin-panel/src/components/merchant-master/adapters.ts`

- [ ] **Step 1: Implement `toHandoffMerchant`**

```ts
import type { MerchantProfile as ApiProfile } from '@/types';
import type { MerchantProfile as UiProfile, MerchantMasterStats } from './types';
import { parseMerchantTags } from '@/lib/merchant-profiles/utils';
import { findKeywordDuplicateGroups } from '@/lib/merchant-profiles/duplicateGroups';

export function toHandoffMerchant(api: ApiProfile): UiProfile {
  const tags = parseMerchantTags(api.tags).map((t) => t.value);
  return {
    id: api.id,
    canonicalName: api.canonicalName,
    upiId: api.upiId ?? '',
    accountNumber: api.accountNumber ?? '',
    systemCategoryId: api.systemCategoryId,
    category: api.systemCategory.name,
    type: api.type as UiProfile['type'],
    tags,
    seenCount: api.seenCount,
    confidence: api.confidence,
    verificationLevel: api.verificationLevel as UiProfile['verificationLevel'],
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    identifiers: (api.identifiers ?? []).map((i) => ({
      id: i.id, type: i.type, value: i.value, createdAt: i.createdAt,
    })),
    aliases: (api.aliases ?? []).map((a) => ({
      id: a.id, rawName: a.rawName, bankSource: a.bankSource ?? '', seenCount: a.seenCount,
    })),
    categoryVotes: (api.categoryVotes ?? []).map((v) => ({
      systemCategoryId: v.systemCategory.id,
      category: v.systemCategory.name,
      points: v.points,
      updatedAt: api.updatedAt,
    })),
    userMappings: [],
    transactionCount: api._count.transactions,
  };
}

export function computeStats(merchants: ApiProfile[]): MerchantMasterStats {
  const all = merchants.map(toHandoffMerchant);
  return {
    totalProfiles: all.length,
    needsReview: all.filter((m) => m.confidence < 0.6 || m.verificationLevel === 'llm_low' || m.verificationLevel === 'llm_medium').length,
    userConfirmed: all.filter((m) => ['user_confirmed', 'multi_user_confirmed'].includes(m.verificationLevel)).length,
    withIdentifiers: all.filter((m) => m.upiId || m.identifiers.length > 0).length,
    duplicateGroups: findKeywordDuplicateGroups(merchants).length,
  };
}
```

- [ ] **Step 2: Implement `toBatchSavePayload`**

Map handoff `MerchantProfile` → API batch payload (inverse of editor state).

---

## Task 5: Port MerchantMaster + MerchantDetail

**Files:**
- Create: `admin-panel/src/components/merchant-master/use-merchant-editor.ts`
- Create: `admin-panel/src/components/merchant-master/MerchantMaster.tsx`
- Create: `admin-panel/src/components/merchant-master/MerchantDetail.tsx`

- [ ] **Step 1: Extract `useMerchantEditor` from handoff**

Port `useMerchantEditor` hook; import `CATEGORIES` / `CATEGORY_TO_TYPE` from new `data.ts` (copy constants from handoff `data.ts` — categories list from `systemCategories` prop instead of hardcoded where possible).

- [ ] **Step 2: Port `MerchantMaster.tsx`**

Changes from handoff reference:
- Replace inline icons with `lucide-react` (`Search`, `Plus`, etc.)
- Add props: `onMerge?: (merchant) => void`, `onAddMerchant?: () => void`, `layout: MerchantMasterVariant`, `onLayoutChange`
- Add layout segmented control in header actions
- Wire "Add merchant" button to `onAddMerchant`
- Pass `systemCategories` for category filter options (map `id` → name for filter; store filter by `systemCategoryId`)

- [ ] **Step 3: Port `MerchantDetail.tsx`**

Changes:
- Replace handoff icons with `lucide-react`
- Add "Merge with another profile" button in drawer footer (calls `onMerge`)
- Add `onSignalsTabOpen?: (merchantId: string) => void` — parent lazy-loads mappings
- `SignalsSection` accepts `isLoadingMappings` / `mappingsError` props

- [ ] **Step 4: Create `data.ts` with VERIFICATION_META, CATEGORY_TO_TYPE**

Copy verification metadata from handoff `data.ts`. Build `CATEGORIES` dynamically from API `systemCategories` in parent and pass down.

---

## Task 6: API client + hooks

**Files:**
- Modify: `admin-panel/src/lib/api/merchantProfiles.ts`
- Modify: `admin-panel/src/lib/hooks/useMerchantProfiles.ts`

- [ ] **Step 1: Add types and API methods**

```ts
export interface MerchantProfileBatchPayload {
  canonicalName: string;
  systemCategoryId: string;
  upiId?: string | null;
  accountNumber?: string | null;
  confidence: number;
  verificationLevel: string;
  type: string;
  tags: string[];
  identifiers: { id?: string; type: 'UPI' | 'NEFT' | 'ACCOUNT'; value: string }[];
  aliases: { id?: string; rawName: string; bankSource?: string | null }[];
  removedIdentifierIds: string[];
  removedAliasIds: string[];
}

export interface UserMerchantMappingDto {
  merchantKey: string;
  category: string;
  userCorrected: boolean;
  confirmed: boolean;
  firstSeen: string;
  lastSeen: string;
}

// merchantProfilesApi.saveBatch(id, payload)
// merchantProfilesApi.getDetail(id) → { userMappings }
```

- [ ] **Step 2: Add hooks**

```ts
export const useSaveMerchantProfileBatch = () => { /* invalidate merchantProfilesQueryKey */ };
export const useMerchantProfileDetail = (id: string | null, enabled: boolean) => { /* ... */ };
```

---

## Task 7: Wire page.tsx

**Files:**
- Replace: `admin-panel/src/app/merchant-master/page.tsx`

- [ ] **Step 1: Implement thin page**

```tsx
'use client';

import { Nunito } from 'next/font/google';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayout } from '@/components/layout/admin-layout';
import MerchantMaster, { type MerchantMasterVariant } from '@/components/merchant-master/MerchantMaster';
import { toHandoffMerchant, computeStats, toBatchSavePayload } from '@/components/merchant-master/adapters';
import { CreateMerchantDialog } from '@/components/merchant-master/create-merchant-dialog';
import { MerchantProfileMergeDialog } from '@/components/merchant-master/merchant-profile-merge-dialog';
import { useMerchantProfiles, useSaveMerchantProfileBatch, useMerchantProfileDetail } from '@/lib/hooks/useMerchantProfiles';
import type { MerchantProfile as UiProfile } from '@/components/merchant-master/types';
import '@/components/merchant-master/tokens.css';
import '@/components/merchant-master/merchant-master.css';

const nunito = Nunito({ subsets: ['latin'], weight: ['300','400','500','600','700','800'] });
const LAYOUT_KEY = 'merchant-master-layout';

export default function MerchantMasterPage() {
  // fetch, layout state, local merchants state synced from API
  // onSaveProfile → saveBatch mutation
  // onSignalsTabOpen → fetch detail, patch userMappings into local state
  // merge dialog state
  // create dialog state
  return (
    <AuthGuard>
      <AdminLayout>
        <div className={`mm ${nunito.className}`}>
          <MerchantMaster ... />
        </div>
        <MerchantProfileMergeDialog ... />
        <CreateMerchantDialog ... />
      </AdminLayout>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Track dirty state for save**

Keep `merchants` in page state; on API load, reset. Editor updates local copy. On save success, invalidate query and merge server response.

- [ ] **Step 3: Typecheck frontend**

Run: `cd admin-panel && npm run typecheck`  
Expected: PASS

---

## Task 8: Merge dialog + create dialog

**Files:**
- Move: `merchant-profile-merge-dialog.tsx` → `components/merchant-master/`
- Create: `create-merchant-dialog.tsx`

- [ ] **Step 1: Move merge dialog**, update imports

- [ ] **Step 2: Create merchant dialog**

Reuse existing create form fields; wrap in shadcn Dialog with `.mm` input/button classes matching handoff. On success, invalidate queries.

---

## Task 9: Cleanup

**Files:**
- Delete: `components/merchant-profiles/merchant-profile-workspace.tsx`
- Delete: `components/merchant-profiles/merchant-profile-edit-form.tsx`
- Delete: `components/merchant-profiles/duplicate-merchants-card.tsx`
- Delete: `components/merchant-profiles/merchant-profile-detail-dialog.tsx` (if unused)
- Modify: `components/layout/sidebar.tsx` — label can stay "Merchant Profiles"

- [ ] **Step 1: Remove dead files and fix any broken imports**

- [ ] **Step 2: Final typecheck both repos**

Run: `cd admin-panel && npm run typecheck && cd ../kedil_be && npx tsc --noEmit`  
Expected: PASS

---

## Manual test checklist

- [ ] Default layout is Table; toggle persists after refresh
- [ ] Search + trust + category + quick filters work in both layouts
- [ ] Row click opens drawer; split layout shows profile on right
- [ ] Edit fields update table/list live; Save persists and shows toast
- [ ] Signals tab lazy-loads user mappings
- [ ] Merge dialog opens from drawer/split panel
- [ ] Add merchant creates new row
- [ ] Page stays light-themed when admin dark mode is on
