'use client';

import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from '@/lib/hooks/useBankMaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, Edit, Image as ImageIcon, Search, Building2 } from 'lucide-react';
import { BankMaster } from '@/types';
import { MigrateBankDialog } from './components/migrate-bank-dialog';
import { BankFormDialog } from './components/bank-form-dialog';
import { bankMasterApi } from '@/lib/api/bankMaster';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';

function resolveImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function BankMasterPage() {
  const { data: banks, isLoading, error, refetch, isFetching } = useBanks();
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankMaster | null>(null);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<BankMaster | null>(null);
  const [accountsCount, setAccountsCount] = useState(0);

  const filteredBanks = useMemo(() => {
    if (!banks) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return banks;

    return banks.filter((bank) =>
      bank.name.toLowerCase().includes(query) ||
      bank.shortName?.toLowerCase().includes(query) ||
      bank.slug?.toLowerCase().includes(query) ||
      String(bank.id).includes(query)
    );
  }, [banks, searchQuery]);

  const summary = useMemo(
    () => ({
      total: banks?.length ?? 0,
      global: banks?.filter((bank) => bank.isGlobal).length ?? 0,
      local: banks?.filter((bank) => !bank.isGlobal).length ?? 0,
    }),
    [banks]
  );

  const openCreateDialog = () => {
    setEditingBank(null);
    setDialogOpen(true);
  };

  const openEditDialog = (bank: BankMaster) => {
    setEditingBank(bank);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setDialogOpen(true);
      return;
    }
    setDialogOpen(false);
    setEditingBank(null);
  };

  const handleFormSubmit = async (formData: FormData) => {
    if (editingBank) {
      await updateBank.mutateAsync({ id: editingBank.id, data: formData });
    } else {
      await createBank.mutateAsync(formData);
    }
    setEditingBank(null);
  };

  const handleDelete = async (id: number) => {
    try {
      const count = await bankMasterApi.getAccountsCount(id);
      const bank = banks?.find((item) => item.id === id);

      if (count > 0 && bank) {
        setAccountsCount(count);
        setBankToDelete(bank);
        setMigrationDialogOpen(true);
        return;
      }

      if (confirm('Are you sure you want to delete this bank?')) {
        await deleteBank.mutateAsync({ id });
      }
    } catch {
      if (confirm('Are you sure you want to delete this bank?')) {
        try {
          await deleteBank.mutateAsync({ id });
        } catch (deleteError) {
          console.error('Error deleting bank:', deleteError);
        }
      }
    }
  };

  const handleDeleteWithMigration = async (migrateToBankId: number) => {
    if (!bankToDelete) return;

    try {
      await deleteBank.mutateAsync({ id: bankToDelete.id, migrateToBankId });
      setMigrationDialogOpen(false);
      setBankToDelete(null);
      setAccountsCount(0);
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading banks...</p>
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
              <CardTitle>Bank Master</CardTitle>
              <CardDescription>Unable to load bank records right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => refetch()} size="sm">Retry</Button>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Bank Master</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Manage canonical bank records, logos, and visibility for the Kedil platform.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Bank
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total banks</CardDescription>
                <CardTitle className="text-3xl">{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Global banks</CardDescription>
                <CardTitle className="text-3xl">{summary.global}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Local banks</CardDescription>
                <CardTitle className="text-3xl">{summary.local}</CardTitle>
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
                  placeholder="Search by name, short name, slug, or ID..."
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">All Banks</CardTitle>
                  <CardDescription>
                    Canonical bank directory used across accounts, cards, and statement imports.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{filteredBanks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-20">Logo</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBanks.length > 0 ? (
                    filteredBanks.map((bank) => {
                      const imageUrl = resolveImageUrl(bank.imageUrl);

                      return (
                        <TableRow key={bank.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{bank.id}</Badge>
                          </TableCell>
                          <TableCell>
                            {imageUrl ? (
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
                                <img
                                  src={imageUrl}
                                  alt={bank.name}
                                  className="h-full w-full object-contain"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)]">
                                <ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[var(--foreground)]">{bank.name}</div>
                            {bank.shortName && (
                              <div className="text-xs text-[var(--muted-foreground)]">{bank.shortName}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-[var(--muted)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
                              {bank.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bank.isGlobal ? 'default' : 'secondary'}>
                              {bank.isGlobal ? 'Global' : 'Local'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-[var(--muted-foreground)]">
                            {bank.created_at ? formatDate(bank.created_at) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(bank)}
                                disabled={updateBank.isPending}
                                title="Edit bank"
                              >
                                <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(bank.id)}
                                disabled={deleteBank.isPending}
                                title="Delete bank"
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Building2 className="h-8 w-8 text-[var(--muted-foreground)]" />
                          <p className="text-[var(--muted-foreground)]">
                            {searchQuery.trim() ? 'No banks match your search.' : 'No banks found.'}
                          </p>
                          {!searchQuery.trim() && (
                            <Button variant="outline" size="sm" onClick={openCreateDialog} className="mt-2">
                              <Plus className="mr-2 h-4 w-4" />
                              Create your first bank
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <BankFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogChange}
          editingBank={editingBank}
          onSubmit={handleFormSubmit}
          isSubmitting={createBank.isPending || updateBank.isPending}
        />

        <MigrateBankDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          bankToDelete={bankToDelete}
          availableBanks={banks || []}
          accountsCount={accountsCount}
          onConfirm={handleDeleteWithMigration}
          isDeleting={deleteBank.isPending}
        />
      </AdminLayout>
    </AuthGuard>
  );
}
