'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatIdentifierLabel,
  formatVerificationLevel,
  getPrimaryIdentifier,
} from '@/lib/merchant-profiles/utils';
import {
  formatGroupLabel,
  type DuplicateMerchantGroup,
  pickSuggestedSurvivor,
} from '@/lib/merchant-profiles/duplicateGroups';
import { cn } from '@/lib/utils';
import { ChevronRight, GitMerge, Users, X } from 'lucide-react';

interface DuplicateMerchantsCardProps {
  groups: DuplicateMerchantGroup[];
  expanded?: boolean;
  onClose?: () => void;
  onSelectMerchant: (merchantId: string) => void;
  onMergeGroup: (survivorId: string, duplicateIds: string[]) => void;
}

export function DuplicateMerchantsCard({
  groups,
  expanded = false,
  onClose,
  onSelectMerchant,
  onMergeGroup,
}: DuplicateMerchantsCardProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const profileCount = groups.reduce((total, group) => total + group.members.length, 0);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  };

  return (
    <Card className="border-violet-500/30 ring-1 ring-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Duplicate merchants
            </CardTitle>
            <CardDescription className="mt-1">
              Groups profiles that share a keyword of at least 5 characters in the name, alias, or
              UPI ID. Click a group to see its merchants.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {groups.length} group{groups.length === 1 ? '' : 's'} · {profileCount} profiles
            </Badge>
            {onClose ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {groups.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
            No duplicate keyword groups found across merchant profiles.
          </p>
        ) : (
          <div className={cn('space-y-2 pr-1', expanded ? 'max-h-[32rem] overflow-y-auto' : 'max-h-72 overflow-y-auto')}>
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              const survivor = pickSuggestedSurvivor(group.members);
              const duplicateIds = group.members
                .filter((member) => member.id !== survivor.id)
                .map((member) => member.id);

              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--accent)]/10"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--accent)]/40',
                      isExpanded && 'border-b border-[var(--border)] bg-[var(--accent)]/30'
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{formatGroupLabel(group.label)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {group.members.length} profiles match &quot;{group.label}&quot;
                      </p>
                    </div>
                    <Badge variant="outline">{group.members.length}</Badge>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-3 p-3">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onMergeGroup(survivor.id, duplicateIds)}
                        >
                          <GitMerge className="mr-2 h-4 w-4" />
                          Merge all {group.members.length}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {group.members.map((member) => {
                          const identifier = getPrimaryIdentifier(member);
                          const isSuggestedSurvivor = member.id === survivor.id;

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => onSelectMerchant(member.id)}
                              className="flex w-full items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left transition-colors hover:bg-[var(--accent)]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{member.canonicalName}</p>
                                <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                                  {member.systemCategory.name}
                                  {identifier
                                    ? ` · ${formatIdentifierLabel(identifier)}`
                                    : ' · no payment ID'}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                {isSuggestedSurvivor ? (
                                  <Badge className="text-[10px]">Suggested keep</Badge>
                                ) : null}
                                <Badge variant="outline" className="text-[10px]">
                                  {formatVerificationLevel(member.verificationLevel)}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
