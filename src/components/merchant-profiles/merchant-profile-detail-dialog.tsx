'use client';

import { useState } from 'react';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAddMerchantAlias,
  useRemoveMerchantAlias,
} from '@/lib/hooks/useMerchantProfiles';
import { formatDateTime } from '@/lib/utils';
import type { MerchantProfile } from '@/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface MerchantProfileDetailDialogProps {
  merchant: MerchantProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (merchant: MerchantProfile) => void;
}

const formatIdentifierType = (type: string) => {
  if (type === 'UPI') return 'UPI';
  if (type === 'NEFT') return 'NEFT';
  return 'Account';
};

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Request failed.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed.';
};

export function MerchantProfileDetailDialog({
  merchant,
  open,
  onOpenChange,
  onEdit,
}: MerchantProfileDetailDialogProps) {
  const [newAlias, setNewAlias] = useState('');
  const [aliasError, setAliasError] = useState('');

  const addAlias = useAddMerchantAlias();
  const removeAlias = useRemoveMerchantAlias();

  const aliases = merchant?.aliases ?? [];
  const identifiers = merchant?.identifiers ?? [];

  const handleAddAlias = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!merchant) return;

    const trimmed = newAlias.trim();
    if (!trimmed) {
      setAliasError('Alias name is required.');
      return;
    }

    setAliasError('');
    try {
      await addAlias.mutateAsync({
        profileId: merchant.id,
        payload: { rawName: trimmed },
      });
      setNewAlias('');
    } catch (error: unknown) {
      setAliasError(formatSubmitError(error));
    }
  };

  const handleRemoveAlias = async (aliasId: string) => {
    if (!merchant) return;

    try {
      await removeAlias.mutateAsync({ profileId: merchant.id, aliasId });
    } catch (error: unknown) {
      setAliasError(formatSubmitError(error));
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewAlias('');
      setAliasError('');
    }
    onOpenChange(nextOpen);
  };

  if (!merchant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{merchant.canonicalName}</DialogTitle>
          <DialogDescription>
            Merchant profile details — aliases, payment identifiers, and categorization metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 rounded-lg border border-[var(--border)] p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                System category
              </p>
              <p className="mt-1 font-medium">{merchant.systemCategory.name}</p>
              <Badge variant="secondary" className="mt-2">
                {merchant.type}
              </Badge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                Verification
              </p>
              <p className="mt-1 font-medium">{merchant.verificationLevel.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Confidence {merchant.confidence.toFixed(2)} · {merchant.seenCount} sightings
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                Linked transactions
              </p>
              <p className="mt-1 font-medium">{merchant._count.transactions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                Last updated
              </p>
              <p className="mt-1 font-medium">{formatDateTime(merchant.updatedAt)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Payment identifiers</h3>
              <Badge variant="outline">{identifiers.length}</Badge>
            </div>
            {identifiers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {identifiers.map((identifier) => (
                    <TableRow key={identifier.id}>
                      <TableCell>
                        <Badge variant="secondary">{formatIdentifierType(identifier.type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{identifier.value}</TableCell>
                      <TableCell className="text-sm text-[var(--muted-foreground)]">
                        {formatDateTime(identifier.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                No payment identifiers yet. Legacy UPI/account fields may still apply on this profile.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Aliases</h3>
              <Badge variant="outline">{merchant._count.aliases}</Badge>
            </div>

            {aliases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raw name</TableHead>
                    <TableHead>Bank source</TableHead>
                    <TableHead>Seen</TableHead>
                    <TableHead className="w-16 text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aliases.map((alias) => (
                    <TableRow key={alias.id}>
                      <TableCell className="font-medium">{alias.rawName}</TableCell>
                      <TableCell className="text-sm text-[var(--muted-foreground)]">
                        {alias.bankSource || '—'}
                      </TableCell>
                      <TableCell>{alias.seenCount}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRemoveAlias(alias.id)}
                          disabled={removeAlias.isPending}
                          title="Remove alias"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                No aliases recorded for this merchant yet.
              </p>
            )}

            <form onSubmit={handleAddAlias} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-alias">Add alias</Label>
                <Input
                  id="new-alias"
                  value={newAlias}
                  onChange={(event) => setNewAlias(event.target.value)}
                  placeholder="e.g. GROWW INVESTMEN"
                />
              </div>
              <Button type="submit" disabled={addAlias.isPending}>
                {addAlias.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add alias
              </Button>
            </form>

            {aliasError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{aliasError}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => onEdit(merchant)}>
            Edit profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
