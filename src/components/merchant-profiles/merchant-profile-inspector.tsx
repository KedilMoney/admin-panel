'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatIdentifierLabel,
  formatVerificationLevel,
  getIdentifierCount,
  getPrimaryIdentifier,
  getTopAliases,
  getVerificationTone,
  needsReview,
  parseMerchantTags,
} from '@/lib/merchant-profiles/utils';
import { cn, formatDateTime } from '@/lib/utils';
import type { MerchantProfile } from '@/types';
import { Edit, Fingerprint, Tags } from 'lucide-react';

interface MerchantProfileInspectorProps {
  merchant: MerchantProfile | null;
  onEdit: (merchant: MerchantProfile) => void;
  onManage: (merchant: MerchantProfile) => void;
}

const trustBadgeClass: Record<ReturnType<typeof getVerificationTone>, string> = {
  trusted: 'border-green-500/40 bg-green-500/10 text-green-800 dark:text-green-200',
  high: 'border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  low: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
};

export function MerchantProfileInspector({
  merchant,
  onEdit,
  onManage,
}: MerchantProfileInspectorProps) {
  if (!merchant) {
    return (
      <Card className="flex h-full min-h-[520px] flex-col">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <Fingerprint className="h-10 w-10 text-[var(--muted-foreground)]" />
          <div>
            <p className="font-medium text-[var(--foreground)]">Select a merchant profile</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">
              Pick a row on the left to inspect aliases, payment identifiers, taxonomy tags, and
              category votes from the live auto-categorization tables.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const primaryIdentifier = getPrimaryIdentifier(merchant);
  const tags = parseMerchantTags(merchant.tags);
  const topAliases = getTopAliases(merchant, 6);
  const tone = getVerificationTone(merchant.verificationLevel);
  const categoryVotes = merchant.categoryVotes ?? [];

  return (
    <Card className="flex h-full min-h-[520px] flex-col overflow-hidden">
      <CardHeader className="border-b border-[var(--border)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle className="truncate text-xl">{merchant.canonicalName}</CardTitle>
            <CardDescription className="font-mono text-xs">{merchant.id}</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(merchant)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Badge className={cn('border', trustBadgeClass[tone])}>
            {formatVerificationLevel(merchant.verificationLevel)}
          </Badge>
          <Badge variant="secondary">{merchant.systemCategory.name}</Badge>
          <Badge variant="outline">{merchant.type}</Badge>
          {needsReview(merchant.verificationLevel) ? (
            <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">
              Needs review
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-5 overflow-y-auto p-4">
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Confidence</p>
            <p className="mt-1 text-lg font-semibold">{merchant.confidence.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Sightings</p>
            <p className="mt-1 text-lg font-semibold">{merchant.seenCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Transactions</p>
            <p className="mt-1 text-lg font-semibold">{merchant._count.transactions}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Updated</p>
            <p className="mt-1 text-sm font-medium">{formatDateTime(merchant.updatedAt)}</p>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h3 className="text-sm font-semibold">
              Payment identifiers ({getIdentifierCount(merchant)})
            </h3>
          </div>
          {merchant.identifiers && merchant.identifiers.length > 0 ? (
            <div className="space-y-2">
              {merchant.identifiers.map((identifier) => (
                <div
                  key={identifier.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--accent)]/40 px-3 py-2 font-mono text-sm"
                >
                  {formatIdentifierLabel(identifier)}
                </div>
              ))}
            </div>
          ) : primaryIdentifier ? (
            <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 font-mono text-sm">
              Legacy field · {formatIdentifierLabel(primaryIdentifier)}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No payment identifiers linked.</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Aliases ({merchant._count.aliases})</h3>
          {topAliases.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topAliases.map((alias) => (
                <Badge key={alias.id} variant="outline" className="max-w-full truncate">
                  {alias.rawName}
                  <span className="ml-1 text-[var(--muted-foreground)]">×{alias.seenCount}</span>
                </Badge>
              ))}
              {merchant._count.aliases > topAliases.length ? (
                <Badge variant="secondary">+{merchant._count.aliases - topAliases.length} more</Badge>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No aliases yet.</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h3 className="text-sm font-semibold">Taxonomy tags</h3>
          </div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.value}
                  variant={tag.isPrimary ? 'default' : 'outline'}
                  className="max-w-full truncate"
                >
                  {tag.value}
                  <span className="ml-1 opacity-70">×{tag.count}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No taxonomy tags stored on profile.</p>
          )}
        </section>

        {categoryVotes.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Category votes</h3>
            <div className="space-y-2">
              {categoryVotes.map((vote) => (
                <div
                  key={vote.id}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span>
                    {vote.systemCategory.name}{' '}
                    <span className="text-[var(--muted-foreground)]">({vote.systemCategory.type})</span>
                  </span>
                  <Badge variant="secondary">{vote.points} pts</Badge>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-[var(--muted-foreground)]">
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => onManage(merchant)}>
            Manage aliases &amp; IDs
          </Button>{' '}
          for add/remove, merge, and split actions.
        </p>
      </CardContent>
    </Card>
  );
}
