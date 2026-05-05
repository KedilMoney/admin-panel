'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  useCreateMerchantProfile,
  useMerchantProfiles,
  useUpdateMerchantProfile,
} from '@/lib/hooks/useMerchantProfiles';
import { formatDateTime } from '@/lib/utils';
import type { MerchantProfile } from '@/types';
import { Edit, Plus, RefreshCw, Search, Store } from 'lucide-react';

type MerchantProfileFormState = {
  canonicalName: string;
  systemCategoryId: string;
  upiId: string;
  accountNumber: string;
  confidence: string;
};

const INITIAL_FORM: MerchantProfileFormState = {
  canonicalName: '',
  systemCategoryId: '',
  upiId: '',
  accountNumber: '',
  confidence: '0.95',
};

const getTypeBadgeVariant = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === 'need') return 'success' as const;
  if (normalized === 'want') return 'warning' as const;
  return 'secondary' as const;
};

const getVerificationBadgeVariant = (level: string) => {
  if (level === 'multi_user_confirmed' || level === 'user_confirmed') {
    return 'success' as const;
  }
  if (level === 'llm_high') {
    return 'secondary' as const;
  }
  return 'outline' as const;
};

const formatVerificationLevel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildPayload = (form: MerchantProfileFormState) => ({
  canonicalName: form.canonicalName.trim(),
  systemCategoryId: form.systemCategoryId,
  upiId: form.upiId.trim() || null,
  accountNumber: form.accountNumber.trim() || null,
  confidence: Number(form.confidence),
});

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Unable to save merchant profile.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to save merchant profile.';
};

export default function MerchantMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<MerchantProfile | null>(null);
  const [form, setForm] = useState<MerchantProfileFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useMerchantProfiles(searchQuery);
  const createMerchant = useCreateMerchantProfile();
  const updateMerchant = useUpdateMerchantProfile();

  const merchants = useMemo(() => data?.merchants ?? [], [data]);
  const systemCategories = useMemo(() => data?.systemCategories ?? [], [data]);

  const summary = useMemo(
    () => ({
      total: merchants.length,
      confirmed: merchants.filter((merchant) =>
        ['user_confirmed', 'multi_user_confirmed'].includes(merchant.verificationLevel)
      ).length,
      withUpi: merchants.filter((merchant) => merchant.upiId).length,
    }),
    [merchants]
  );

  const selectedCategory = useMemo(
    () => systemCategories.find((category) => category.id === form.systemCategoryId),
    [form.systemCategoryId, systemCategories]
  );

  const selectedCategoryLabel = selectedCategory
    ? `${selectedCategory.name} (${selectedCategory.type})`
    : undefined;

  const openCreateDialog = () => {
    setEditingMerchant(null);
    setForm(INITIAL_FORM);
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (merchant: MerchantProfile) => {
    setEditingMerchant(merchant);
    setForm({
      canonicalName: merchant.canonicalName,
      systemCategoryId: merchant.systemCategoryId,
      upiId: merchant.upiId ?? '',
      accountNumber: merchant.accountNumber ?? '',
      confidence: String(merchant.confidence ?? 0.95),
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMerchant(null);
    setForm(INITIAL_FORM);
    setFormError('');
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true);
      return;
    }

    closeDialog();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.canonicalName.trim()) {
      setFormError('Merchant name is required.');
      return;
    }

    if (!form.systemCategoryId) {
      setFormError('Please choose a system category.');
      return;
    }

    const confidence = Number(form.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      setFormError('Confidence must be between 0 and 1.');
      return;
    }

    try {
      if (editingMerchant) {
        await updateMerchant.mutateAsync({
          id: editingMerchant.id,
          payload: buildPayload(form),
        });
      } else {
        await createMerchant.mutateAsync(buildPayload(form));
      }
      closeDialog();
    } catch (submitError: unknown) {
      setFormError(formatSubmitError(submitError));
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading merchant profiles...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <AdminLayout>
          <Card>
            <CardHeader>
              <CardTitle>Merchant Profiles</CardTitle>
              <CardDescription>Unable to load merchant data right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetch()} size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Merchant Profiles</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Manage canonical merchant names and their auto-categorization mapping from the
                database.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Merchant
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total merchant profiles</CardDescription>
                <CardTitle className="text-3xl">{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Confirmed mappings</CardDescription>
                <CardTitle className="text-3xl">{summary.confirmed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Profiles with UPI IDs</CardDescription>
                <CardTitle className="text-3xl">{summary.withUpi}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by merchant, UPI ID, account number, or category..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Database merchant mappings</CardTitle>
                  <CardDescription>
                    Clean merchant naming with category assignment and verification details.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{merchants.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.length > 0 ? (
                    merchants.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                              <Store className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-semibold text-[var(--foreground)]">
                                {merchant.canonicalName}
                              </div>
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {merchant.upiId
                                  ? `UPI: ${merchant.upiId}`
                                  : merchant.accountNumber
                                    ? `A/C: ${merchant.accountNumber}`
                                    : 'No linked payee identifier'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{merchant.systemCategory.name}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {merchant.accountNumber
                              ? `Account: ${merchant.accountNumber}`
                              : 'UPI-led mapping'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(merchant.type)}>{merchant.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={getVerificationBadgeVariant(merchant.verificationLevel)}>
                              {formatVerificationLevel(merchant.verificationLevel)}
                            </Badge>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              Confidence {merchant.confidence.toFixed(2)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{merchant.seenCount} sightings</div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {merchant._count.aliases} aliases, {merchant._count.transactions}{' '}
                              transactions
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {formatDateTime(merchant.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(merchant)}
                              title="Edit merchant profile"
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-[var(--muted-foreground)]"
                      >
                        No merchant profiles found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMerchant ? 'Edit Merchant Profile' : 'Create Merchant Profile'}
              </DialogTitle>
              <DialogDescription>
                Maintain a clean canonical merchant name and link it to the correct system
                category for auto-categorization.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merchant-name">Merchant name</Label>
                <Input
                  id="merchant-name"
                  value={form.canonicalName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, canonicalName: event.target.value }))
                  }
                  placeholder="e.g. Vanakkam Cafe"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="merchant-upi">UPI ID</Label>
                  <Input
                    id="merchant-upi"
                    value={form.upiId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, upiId: event.target.value }))
                    }
                    placeholder="shop@okhdfcbank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merchant-account">Account number</Label>
                  <Input
                    id="merchant-account"
                    value={form.accountNumber}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, accountNumber: event.target.value }))
                    }
                    placeholder="Optional bank account reference"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>System category</Label>
                  <Select
                    value={form.systemCategoryId}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, systemCategoryId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category">
                        {selectedCategoryLabel}
                      </SelectValue>
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
                <div className="space-y-2">
                  <Label htmlFor="merchant-confidence">Confidence</Label>
                  <Input
                    id="merchant-confidence"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={form.confidence}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confidence: event.target.value }))
                    }
                  />
                </div>
              </div>

              {formError ? (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {formError}
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={createMerchant.isPending || updateMerchant.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMerchant.isPending || updateMerchant.isPending}
                >
                  {editingMerchant
                    ? updateMerchant.isPending
                      ? 'Saving...'
                      : 'Save Changes'
                    : createMerchant.isPending
                      ? 'Creating...'
                      : 'Create Merchant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
}
