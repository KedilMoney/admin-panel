'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatIdentifierLabel,
  formatVerificationLevel,
  getPrimaryIdentifier,
} from '@/lib/merchant-profiles/utils';
import {
  formatDuplicateGroupLabel,
  type DuplicateMerchantGroup,
  pickSuggestedSurvivor,
} from '@/lib/merchant-profiles/duplicateGroups';
import { cn } from '@/lib/utils';
import { ChevronDown, GitMerge, Users, X } from 'lucide-react';

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
  const duplicateProfileCount = groups.reduce((total, group) => total + group.members.length, 0);

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
              Profiles whose names share at least 5 characters — e.g. different UPI IDs all
              containing &quot;Vanakkam&quot;.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {groups.length} group{groups.length === 1 ? '' : 's'} · {duplicateProfileCount} profiles
            </Badge>
            {onClose ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {groups.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
            No likely duplicate name groups in the current list.
          </p>
        ) : (
          <div
            className={cn(
              'space-y-3 pr-1',
              expanded ? 'max-h-none' : 'max-h-72 overflow-y-auto'
            )}
          >
            {groups.map((group) => {
              const survivor = pickSuggestedSurvivor(group.members);
              const duplicateIds = group.members
                .filter((member) => member.id !== survivor.id)
                .map((member) => member.id);

              return (
                <div
                  key={group.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        Match: {formatDuplicateGroupLabel(group.label)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {group.members.length} profiles share this name pattern
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMergeGroup(survivor.id, duplicateIds)}
                    >
                      <GitMerge className="mr-2 h-4 w-4" />
                      Merge group
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
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
                              {identifier ? ` · ${formatIdentifierLabel(identifier)}` : ' · no payment ID'}
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
