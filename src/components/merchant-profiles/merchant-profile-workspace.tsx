'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MerchantProfileDetailDialog } from '@/components/merchant-profiles/merchant-profile-detail-dialog';
import { MerchantProfileEditForm } from '@/components/merchant-profiles/merchant-profile-edit-form';
import {
  formatVerificationLevel,
  getIdentifierCount,
  getVerificationTone,
  needsReview,
} from '@/lib/merchant-profiles/utils';
import { cn, formatDateTime } from '@/lib/utils';
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { Fingerprint, GitMerge, X } from 'lucide-react';

type WorkspaceTab = 'profile' | 'matching';

interface MerchantProfileWorkspaceProps {
  merchant: MerchantProfile | null;
  systemCategories: SystemCategoryOption[];
  onClose: () => void;
  onMerge?: (merchant: MerchantProfile) => void;
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
  onMerge,
  initialTab = 'profile',
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
              Select a merchant on the left to edit its name and category, or manage payment IDs and
              bank-statement aliases.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tone = getVerificationTone(merchant.verificationLevel);

  return (
    <Card className="flex h-full min-h-[520px] flex-col overflow-hidden">
      <CardHeader className="space-y-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{merchant.canonicalName}</CardTitle>
            <CardDescription className="truncate text-xs">
              {merchant.systemCategory.name} · {formatVerificationLevel(merchant.verificationLevel)}
              {' · '}
              {merchant._count.transactions} transactions
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={tabClass(activeTab === 'profile')}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            type="button"
            className={tabClass(activeTab === 'matching')}
            onClick={() => setActiveTab('matching')}
          >
            Payment IDs &amp; aliases
          </button>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Badge className={cn('border text-xs', trustBadgeClass[tone])}>
              {formatVerificationLevel(merchant.verificationLevel)}
            </Badge>
            {needsReview(merchant.verificationLevel) ? (
              <Badge variant="outline" className="border-amber-500/50 text-xs text-amber-700 dark:text-amber-300">
                Needs review
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {activeTab === 'profile' ? (
          <div className="space-y-6">
            <MerchantProfileEditForm merchant={merchant} systemCategories={systemCategories} />

            {onMerge ? (
              <div className="space-y-2 border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Combine two profiles that represent the same merchant. Payment IDs and aliases from
                  the merged profile move to the survivor.
                </p>
                <Button type="button" variant="outline" className="w-full" onClick={() => onMerge(merchant)}>
                  <GitMerge className="mr-2 h-4 w-4" />
                  Merge with another profile
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-[var(--muted-foreground)]">
              {getIdentifierCount(merchant)} payment IDs · {merchant._count.aliases} aliases · updated{' '}
              {formatDateTime(merchant.updatedAt)}
            </p>
          </div>
        ) : null}

        {activeTab === 'matching' ? (
          <MerchantProfileDetailDialog
            merchant={merchant}
            systemCategories={systemCategories}
            open
            variant="panel"
            onOpenChange={() => undefined}
            onEdit={() => setActiveTab('profile')}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
