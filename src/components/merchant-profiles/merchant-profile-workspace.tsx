'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MerchantProfileDetailDialog } from '@/components/merchant-profiles/merchant-profile-detail-dialog';
import { MerchantProfileEditForm } from '@/components/merchant-profiles/merchant-profile-edit-form';
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
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { Fingerprint, Tags, X } from 'lucide-react';

type WorkspaceTab = 'overview' | 'edit' | 'matching';

interface MerchantProfileWorkspaceProps {
  merchant: MerchantProfile | null;
  systemCategories: SystemCategoryOption[];
  onClose: () => void;
  initialTab?: WorkspaceTab;
}

const trustBadgeClass: Record<ReturnType<typeof getVerificationTone>, string> = {
  trusted: 'border-green-500/40 bg-green-500/10 text-green-800 dark:text-green-200',
  high: 'border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  low: 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
};

const tabClass = (active: boolean) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'bg-[var(--foreground)] text-[var(--background)]'
      : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
  );

export function MerchantProfileWorkspace({
  merchant,
  systemCategories,
  onClose,
  initialTab = 'overview',
}: MerchantProfileWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [merchant?.id, initialTab]);

  if (!merchant) {
    return (
      <Card className="flex h-full min-h-[520px] flex-col">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <Fingerprint className="h-10 w-10 text-[var(--muted-foreground)]" />
          <div>
            <p className="font-medium text-[var(--foreground)]">No profile selected</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">
              Select a merchant on the left to view details, edit category settings, or manage
              aliases and payment IDs.
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
      <CardHeader className="space-y-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{merchant.canonicalName}</CardTitle>
            <CardDescription className="truncate text-xs">
              {merchant.systemCategory.name} · {formatVerificationLevel(merchant.verificationLevel)}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            onClick={onClose}
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={tabClass(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button type="button" className={tabClass(activeTab === 'edit')} onClick={() => setActiveTab('edit')}>
            Edit profile
          </button>
          <button
            type="button"
            className={tabClass(activeTab === 'matching')}
            onClick={() => setActiveTab('matching')}
          >
            Aliases &amp; IDs
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Confidence</p>
                <p className="mt-1 text-lg font-semibold">{merchant.confidence.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Transactions</p>
                <p className="mt-1 text-lg font-semibold">{merchant._count.transactions}</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Payment identifiers ({getIdentifierCount(merchant)})</h3>
              {merchant.identifiers && merchant.identifiers.length > 0 ? (
                <div className="space-y-2">
                  {merchant.identifiers.map((identifier) => (
                    <div
                      key={identifier.id}
                      className="rounded-md border border-[var(--border)] bg-[var(--accent)]/30 px-3 py-2 font-mono text-sm"
                    >
                      {formatIdentifierLabel(identifier)}
                    </div>
                  ))}
                </div>
              ) : primaryIdentifier ? (
                <p className="text-sm font-mono text-[var(--muted-foreground)]">
                  Legacy · {formatIdentifierLabel(primaryIdentifier)}
                </p>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">None linked</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Top aliases</h3>
              <div className="flex flex-wrap gap-2">
                {topAliases.length > 0 ? (
                  topAliases.map((alias) => (
                    <Badge key={alias.id} variant="outline">
                      {alias.rawName} ×{alias.seenCount}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted-foreground)]">None</span>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Taxonomy tags</h3>
              </div>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.value} variant={tag.isPrimary ? 'default' : 'outline'}>
                      {tag.value} ×{tag.count}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No tags on this profile</p>
              )}
            </section>

            {categoryVotes.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Category votes</h3>
                {categoryVotes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <span>{vote.systemCategory.name}</span>
                    <Badge variant="secondary">{vote.points} pts</Badge>
                  </div>
                ))}
              </section>
            ) : null}

            <p className="text-xs text-[var(--muted-foreground)]">
              Updated {formatDateTime(merchant.updatedAt)} · ID {merchant.id}
            </p>
          </div>
        ) : null}

        {activeTab === 'edit' ? (
          <MerchantProfileEditForm merchant={merchant} systemCategories={systemCategories} />
        ) : null}

        {activeTab === 'matching' ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Add or remove bank-statement aliases and payment identifiers. Use split (scissors) to
              move a wrongly-linked alias or ID into a new profile.
            </p>
            <MerchantProfileDetailDialog
              merchant={merchant}
              systemCategories={systemCategories}
              open
              variant="panel"
              onOpenChange={() => undefined}
              onEdit={() => setActiveTab('edit')}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
