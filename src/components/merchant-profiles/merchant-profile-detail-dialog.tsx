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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAddMerchantAlias,
  useAddMerchantIdentifier,
  useRemoveMerchantAlias,
  useRemoveMerchantIdentifier,
  useSplitMerchantAlias,
  useSplitMerchantIdentifier,
} from '@/lib/hooks/useMerchantProfiles';
import { formatDateTime } from '@/lib/utils';
import type { MerchantProfile, SystemCategoryOption } from '@/types';
import { Loader2, Plus, Scissors, Trash2 } from 'lucide-react';

interface MerchantProfileDetailDialogProps {
  merchant: MerchantProfile | null;
  systemCategories: SystemCategoryOption[];
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
  systemCategories,
  open,
  onOpenChange,
  onEdit,
}: MerchantProfileDetailDialogProps) {
  const [newAlias, setNewAlias] = useState('');
  const [newAliasBankSource, setNewAliasBankSource] = useState('');
  const [newIdentifierType, setNewIdentifierType] = useState<'UPI' | 'NEFT' | 'ACCOUNT'>('UPI');
  const [newIdentifierValue, setNewIdentifierValue] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [splitTarget, setSplitTarget] = useState<{
    kind: 'alias' | 'identifier';
    id: string;
    label: string;
  } | null>(null);
  const [splitName, setSplitName] = useState('');
  const [splitCategoryId, setSplitCategoryId] = useState('');
  const [splitError, setSplitError] = useState('');

  const addAlias = useAddMerchantAlias();
  const removeAlias = useRemoveMerchantAlias();
  const addIdentifier = useAddMerchantIdentifier();
  const removeIdentifier = useRemoveMerchantIdentifier();
  const splitAlias = useSplitMerchantAlias();
  const splitIdentifier = useSplitMerchantIdentifier();

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
        payload: {
          rawName: trimmed,
          bankSource: newAliasBankSource.trim() || null,
        },
      });
      setNewAlias('');
      setNewAliasBankSource('');
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

  const handleAddIdentifier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!merchant) return;

    const trimmed = newIdentifierValue.trim();
    if (!trimmed) {
      setIdentifierError('Identifier value is required.');
      return;
    }

    setIdentifierError('');
    try {
      await addIdentifier.mutateAsync({
        profileId: merchant.id,
        payload: { type: newIdentifierType, value: trimmed },
      });
      setNewIdentifierValue('');
    } catch (error: unknown) {
      setIdentifierError(formatSubmitError(error));
    }
  };

  const handleRemoveIdentifier = async (identifierId: string) => {
    if (!merchant) return;

    const isLast = identifiers.length <= 1;
    if (isLast) {
      const confirmed = window.confirm(
        'This is the last payment identifier on this profile. Remove it anyway? The profile will be name-only until a new identifier is added.'
      );
      if (!confirmed) return;
    }

    try {
      await removeIdentifier.mutateAsync({ profileId: merchant.id, identifierId });
    } catch (error: unknown) {
      setIdentifierError(formatSubmitError(error));
    }
  };

  const openSplitDialog = (kind: 'alias' | 'identifier', id: string, label: string) => {
    setSplitTarget({ kind, id, label });
    setSplitName(label);
    setSplitCategoryId(merchant?.systemCategoryId ?? '');
    setSplitError('');
  };

  const closeSplitDialog = () => {
    setSplitTarget(null);
    setSplitName('');
    setSplitCategoryId('');
    setSplitError('');
  };

  const handleSplitSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!merchant || !splitTarget) return;

    if (!splitName.trim()) {
      setSplitError('New profile name is required.');
      return;
    }
    if (!splitCategoryId) {
      setSplitError('Choose a category for the new profile.');
      return;
    }

    try {
      if (splitTarget.kind === 'alias') {
        await splitAlias.mutateAsync({
          profileId: merchant.id,
          payload: {
            aliasId: splitTarget.id,
            canonicalName: splitName.trim(),
            systemCategoryId: splitCategoryId,
          },
        });
      } else {
        await splitIdentifier.mutateAsync({
          profileId: merchant.id,
          payload: {
            identifierId: splitTarget.id,
            canonicalName: splitName.trim(),
            systemCategoryId: splitCategoryId,
          },
        });
      }
      closeSplitDialog();
    } catch (error: unknown) {
      setSplitError(formatSubmitError(error));
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewAlias('');
      setNewAliasBankSource('');
      setNewIdentifierValue('');
      setAliasError('');
      setIdentifierError('');
      closeSplitDialog();
    }
    onOpenChange(nextOpen);
  };

  if (!merchant) {
    return null;
  }

  return (
    <>
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
                      <TableHead className="w-24 text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                openSplitDialog('identifier', identifier.id, identifier.value)
                              }
                              title="Split to new profile"
                            >
                              <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleRemoveIdentifier(identifier.id)}
                              disabled={removeIdentifier.isPending}
                              title="Remove identifier"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                  No payment identifiers yet. Add a UPI, NEFT, or account reference below.
                </p>
              )}

              <form
                onSubmit={handleAddIdentifier}
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
              >
                <div className="space-y-2 sm:w-32">
                  <Label htmlFor="new-identifier-type">Type</Label>
                  <Select
                    value={newIdentifierType}
                    onValueChange={(value) =>
                      setNewIdentifierType(value as 'UPI' | 'NEFT' | 'ACCOUNT')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="ACCOUNT">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-identifier-value">Add identifier</Label>
                  <Input
                    id="new-identifier-value"
                    value={newIdentifierValue}
                    onChange={(event) => setNewIdentifierValue(event.target.value)}
                    placeholder="e.g. shop@okhdfcbank"
                  />
                </div>
                <Button type="submit" disabled={addIdentifier.isPending}>
                  {addIdentifier.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add ID
                </Button>
              </form>

              {identifierError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{identifierError}</p>
              ) : null}
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
                      <TableHead className="w-24 text-right">Actions</TableHead>
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
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openSplitDialog('alias', alias.id, alias.rawName)}
                              title="Split to new profile"
                            >
                              <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </Button>
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
                          </div>
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

              <form onSubmit={handleAddAlias} className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="new-alias">Add alias</Label>
                    <Input
                      id="new-alias"
                      value={newAlias}
                      onChange={(event) => setNewAlias(event.target.value)}
                      placeholder="e.g. GROWW INVESTMEN"
                    />
                  </div>
                  <div className="sm:w-40 space-y-2">
                    <Label htmlFor="new-alias-bank">Bank source</Label>
                    <Input
                      id="new-alias-bank"
                      value={newAliasBankSource}
                      onChange={(event) => setNewAliasBankSource(event.target.value)}
                      placeholder="Optional"
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
                </div>
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

      <Dialog open={Boolean(splitTarget)} onOpenChange={(next) => !next && closeSplitDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Split to new profile</DialogTitle>
            <DialogDescription>
              Move {splitTarget?.kind === 'alias' ? 'alias' : 'identifier'}{' '}
              <span className="font-medium">{splitTarget?.label}</span> into a new merchant profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSplitSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="split-name">New profile name</Label>
              <Input
                id="split-name"
                value={splitName}
                onChange={(event) => setSplitName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={splitCategoryId} onValueChange={setSplitCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {systemCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {splitError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{splitError}</p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeSplitDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={splitAlias.isPending || splitIdentifier.isPending}
              >
                {(splitAlias.isPending || splitIdentifier.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Split
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
