# Merchant Master Redesign — Design Spec

**Date:** 2026-07-01  
**Status:** Approved  
**Repos:** `admin-panel`, `kedil_be`

## Summary

Redesign the Merchant Profiles admin screen (`/merchant-master`) per the designer handoff. Replace the narrow browse list + cramped side panel with a full-width data table and rich editable detail surface. Implement **both** layout variants (`table-drawer` and `split`) behind a `variant` prop, using the **lift-and-wire** approach: port handoff React/CSS almost verbatim and wire to existing + extended APIs.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Layout | Both `table-drawer` (default) and `split` |
| Merge tools | Manual merge dialog only — remove merge job + duplicate groups panel |
| Persistence | Save-on-button — all edits local until **Save profile**, one batched API call |
| Signals tab | Full — new backend endpoint for per-user mappings |
| Styling | Page-scoped handoff CSS (`tokens.css`, `merchant-master.css` under `.mm`), light only; admin dark mode ignored on this page |

## Approach: Lift-and-wire

Port handoff `src/` into `admin-panel/src/components/merchant-master/`. The page (`app/merchant-master/page.tsx`) becomes a thin data layer: fetch, adapt types, save mutation, merge dialog, create dialog.

Handoff source: `/Users/mani/Claude/FIles/Merchant Master Handoff` (zip containing `design_handoff_merchant_master/`).

## Architecture

```
app/merchant-master/page.tsx
  └── AuthGuard + AdminLayout
        └── MerchantMaster (variant, merchants, stats, callbacks)
              ├── table-drawer: TableWorkspace + MerchantDrawer
              └── split: SplitWorkspace + MerchantProfilePanel
        └── MerchantProfileMergeDialog
        └── CreateMerchantDialog (restyled)

components/merchant-master/
  MerchantMaster.tsx       ← ported from handoff
  MerchantDetail.tsx       ← drawer + split panel
  tokens.css               ← Kedil design tokens
  merchant-master.css      ← mm-* component styles
  types.ts                 ← handoff domain types
  adapters.ts              ← API ↔ handoff type mapping
  use-merchant-editor.ts   ← extracted editor hook
  create-merchant-dialog.tsx
  merchant-profile-merge-dialog.tsx  ← moved from merchant-profiles/

lib/api/merchantProfiles.ts   ← extended save + detail fetch
lib/hooks/useMerchantProfiles.ts
```

### Variant switcher

Segmented control in header: **Table** | **Split**. Persist in `localStorage` key `merchant-master-layout`. Default: `table-drawer`.

### Removed from current page

- Run merge job button
- Duplicate keyword groups panel (`DuplicateMerchantsCard`)
- `MerchantProfileWorkspace`, `merchant-profile-edit-form`, `duplicate-merchants-card`

### Retained

- Manual merge via `MerchantProfileMergeDialog` — trigger from drawer/split panel ("Merge with another profile")
- Add merchant dialog (restyled with `.mm` classes)

## UI (from handoff)

### Header (both variants)

- Eyebrow "MERCHANT MASTER", title "Merchant profiles", subtitle
- Pill search (280px) + primary "Add merchant" button
- Layout toggle (Table / Split)

### Stat strip

Five columns: Total profiles, Needs review (warn color), User confirmed, With identifiers, Duplicate groups (computed client-side via existing `findKeywordDuplicateGroups` — stat only, no panel).

### Toolbar

Count + Trust level select + Category select + segmented quick filters (Review queue / Missing IDs).

### Variant 1A — `table-drawer`

8-column CSS grid table; row click opens 496px slide-over drawer with tabs: Overview, Payment IDs, Aliases, Signals. Save/Cancel footer.

### Variant 1B — `split`

388px left list + right profile panel with stacked section cards (no tabs).

### Interactions

- Local edit state via `useMerchantEditor`; table/list reflect immediately
- Save → batched API → toast "Profile saved" (~1.9s)
- Tags: Enter to add, × to remove
- Identifiers/aliases: add row, trash to remove (local until save)
- Category change auto-sets `type` from category mapping (overridable)

## Data model

### Handoff `MerchantProfile` (UI)

See handoff `types.ts`. Key fields: `canonicalName`, `category` (display label), `type`, `tags: string[]`, `identifiers[]`, `aliases[]`, `categoryVotes[]`, `userMappings[]`, `transactionCount`, `seenCount`, `confidence`, `verificationLevel`.

### Adapter mapping (API → handoff)

| API (`@/types`) | Handoff |
|---|---|
| `systemCategory.name` | `category` |
| `systemCategory.type` | `type` (with override support on save) |
| `tags` JSON (`MerchantTag[]`) | `tags: string[]` (use `.value`) |
| `_count.transactions` | `transactionCount` |
| `identifiers`, `aliases`, `categoryVotes` | direct map with shape tweaks |

### Lazy-loaded user mappings

`userMappings` not included in list response (too heavy). Fetched when Signals tab is opened:

`GET /api/admin/merchant-profiles/:id/detail` → `{ userMappings: [...] }`

Lookup keys derived from profile: legacy UPI/account (`merchantKeysForProfile`), identifier values, alias raw names (`name:{normalized}`).

## Backend changes (`kedil_be`)

### Extended `PUT /api/admin/merchant-profiles/:id`

Accept batched save payload:

```ts
{
  canonicalName: string;
  systemCategoryId: string;
  upiId?: string | null;
  accountNumber?: string | null;
  confidence: number;
  verificationLevel: string;
  type: string;
  tags: string[];
  identifiers: { id?: string; type: 'UPI'|'NEFT'|'ACCOUNT'; value: string }[];
  aliases: { id?: string; rawName: string; bankSource?: string | null }[];
  removedIdentifierIds: string[];
  removedAliasIds: string[];
}
```

Server applies in a Prisma transaction:

1. Update `merchant_profiles` row (do **not** force `verificationLevel` to `user_confirmed` — respect payload)
2. Delete removed identifiers/aliases
3. Upsert/create identifiers and aliases
4. Sync legacy UPI/account via existing `upsertMerchantIdentifiers`
5. Store tags as JSON array of `{ value, count: 1, isPrimary: false }` objects (existing format)
6. Call `refreshSoftUserMerchantMappingsForProfile` when category changes

### New `GET /api/admin/merchant-profiles/:id/detail`

Returns:

```ts
{
  userMappings: {
    merchantKey: string;
    category: string;        // user Category.name
    userCorrected: boolean;
    confirmed: boolean;
    firstSeen: string;       // createdAt formatted
    lastSeen: string;        // updatedAt formatted
  }[]
}
```

Implement in `merchantProfileAdminOps.ts` using collected merchant keys for the profile.

## Error handling

- Save failure: inline error in drawer/panel footer; drawer stays open
- List load failure: error card with Retry
- Mappings fetch failure: error state in Signals tab with retry

## Fonts

Load Nunito via `next/font/google` scoped to merchant-master page wrapper only.

## Out of scope

- Admin sidebar redesign
- Dark mode for this page
- Merge job / duplicate groups panel
- Per-field optimistic save

## Testing

- `npx tsc --noEmit` in `admin-panel` and `kedil_be`
- Manual: both variants, filters, edit all tabs, save, merge, add merchant, Signals lazy load
