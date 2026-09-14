# Category Review — admin surface for auditing auto-categorisation

Date: 2026-09-05
Status: approved, not yet ticketed
Repos: `kedil_be` (endpoint), `admin-panel` (page)

## Problem

There is no way to see *why* the auto-cat engine gave a transaction its category.
Today's answer requires SSH-ing to the droplet and hand-writing SQL — that is how the
2026-09-05 "Investment Returns" investigation was done. `/analysis` shows counts only,
`/auto-cat-lab` just re-runs the engine, and `/categories` manages the taxonomy.
None of them lists a transaction.

## Scope

**In:** a read-only review surface for **categories**, across all users, with an Excel export.

**Out:** merchant review (its own section later), payee review, and any write path.
Corrections are made by the user in the app, not by admin. Revisit only on request.

## Page

`/categories` is replaced by the review surface. The existing taxonomy CRUD is unlinked
from navigation but left in the codebase — reversible, nothing deleted.

Layout:

1. **Category picker.** Every category name with its transaction count, distinct user
   count, and suspect count.
2. **Transaction table.** Every transaction in the selected category, across all users,
   sorted most-suspect-first (not newest-first — that is what makes mistakes findable).
   Columns: user email, date, amount, bank descriptor, decided by, confidence,
   merchant key.
3. **Why panel.** Expanding a row shows the decision trail for that transaction.
4. **Export button.** Current view as `.xlsx`.

### Categories are per-user rows

`Category` carries a required `userId`, so "Groceries" exists as a separate row for every
user. The picker and every filter group by category **name**, never by id. Getting this
wrong returns one user's data and looks like an empty result.

## Endpoint

`GET /api/admin/category-review` in `kedil_be`.

Query: `categoryName` (required), `limit`, `cursor`, `sort` (`suspect` default, `date`).

Returns per transaction: id, user email, date, amount, category name, the stored
`details.autoEnrichment.originalDescriptor`, `enrichment_source`, `enrichment_confidence`,
`merchant_key`, `ruleId`, stored payee name, merchant profile canonical name, the
`auto_categorization_decisions` rows, the computed suspect reasons, and a suspect score.

Also `GET /api/admin/category-review/summary` for the picker counts.

Scale today is ~1,100 decision rows, so simple server-side pagination is enough.

## The why panel

The decision log records the **winning** rung only — 1,032 transactions have one decision
row, 47 have two. The rest of the explanation is reconstructed at read time.

| Rung | What the panel shows |
|---|---|
| Regex | Re-run the pattern list against the stored descriptor; name the pattern and the exact text it matched. |
| Cache | Look up the mapping row hit by that `merchant_key`; show its target category, `confirmed`, `user_corrected`, and when it was created. |
| Crowd | Show the merchant profile and its category votes. |
| LLM | Show descriptor, `shop_name` and confidence, and state plainly that no rationale was stored. |

**Known gap:** the LLM rung stores no reasoning, so its rows can never fully explain
themselves. That is the largest single limit of this page. Storing a short rationale on
the decision row is a follow-up, and only helps transactions categorised after it ships.

## Suspect rules

Each match adds to the suspect score and appears as a labelled reason on the row. These
four are the rules that actually surfaced both confirmed errors on 2026-09-05.

1. **Low confidence** — `enrichment_confidence < 0.80`.
2. **Degenerate merchant key** — the key carries no usable identity: `name:se`,
   `name:dep tfr imps`, `name:nach trxn ach`, anything rejected by
   `isCacheableMerchantKey`, or a key ending in a bare date fragment.
3. **Contaminated descriptor** — the descriptor opens with a fragment belonging to a
   different statement row. Tell: a `NAME/BANK/ref/word` head followed by a long numeric
   reference and `AT <branch>`, before the descriptor's real body.
4. **Category disagreement** — the transaction's category differs from the linked
   merchant profile's own system category.

Reasons are shown, never hidden behind a score. The score only sets row order.

## Export

One button. Same layout as the 2026-09-05 sheet: a `Decisions` sheet with one row per
transaction and the columns above, plus a `Summary` sheet with the counts and a legend.
Arial, filters on, frozen header.

## Done when

- Picking a category lists every transaction in it, across all users.
- The list defaults to most-suspect-first and each suspect row names its reasons.
- Expanding a row explains the decision per the table above, including the honest LLM case.
- The 2026-09-05 "Investment Returns" set reproduces from the UI: 18 rows, 4 users,
  16 LLM and 2 Regex, and both 0.70 rows ranked at the top.
- Export produces a file matching the sheet already delivered.
- Nothing on the page can write to a user's transaction.

## Follow-ups, not in this spec

- Merchant review section.
- Storing an LLM rationale on the decision row.
- Statement-parser fix for the contaminated descriptors this page will surface.
