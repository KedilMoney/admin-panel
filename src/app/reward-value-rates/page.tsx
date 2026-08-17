'use client';

import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import {
  useCreateRewardValueRate,
  useDeleteRewardValueRate,
  useRewardValueRates,
  useUpdateRewardValueRate,
} from '@/lib/hooks/useRewardValueRates';
import {
  REWARD_MODE_LABELS,
  REWARD_REDEMPTION_MODES,
  RewardRedemptionMode,
  RewardValueRate,
} from '@/lib/api/rewardValueRates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Edit, Plus, RefreshCw, Trash2, Coins } from 'lucide-react';
import {
  EMPTY_RATE_FORM,
  RateFormDialog,
  RateFormState,
  buildSubmitActions,
  cardGroupKey,
  ratesToForm,
  validateRateForm,
} from './components/rate-form-dialog';
import { BankSelectField } from './components/bank-select-field';

function formatValuePerPoint(value: string | number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(4).replace(/\.?0+$/, '');
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function RewardValueRatesPage() {
  const [bankFilter, setBankFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [form, setForm] = useState<RateFormState>(EMPTY_RATE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const queryFilters = useMemo(
    () => ({
      bankName: bankFilter.trim() || undefined,
      mode: modeFilter === 'ALL' ? undefined : (modeFilter as RewardRedemptionMode),
    }),
    [bankFilter, modeFilter]
  );

  const { data: rates, isLoading, error, refetch, isFetching } = useRewardValueRates(queryFilters);
  const createRate = useCreateRewardValueRate();
  const updateRate = useUpdateRewardValueRate();
  const deleteRate = useDeleteRewardValueRate();

  const openCreateDialog = () => {
    setEditingGroupKey(null);
    setForm(EMPTY_RATE_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (rate: RewardValueRate) => {
    const groupKey = cardGroupKey(rate);
    const groupRates = (rates ?? []).filter((row) => cardGroupKey(row) === groupKey);
    setEditingGroupKey(groupKey);
    setForm(ratesToForm(groupRates.length > 0 ? groupRates : [rate]));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingGroupKey(null);
      setFormError(null);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    const validationError = validateRateForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const actions = buildSubmitActions(form, editingGroupKey != null);
    if (actions.length === 0) {
      setFormError('Add at least one redemption mode with a positive value per point.');
      return;
    }

    try {
      for (const action of actions) {
        if (action.type === 'create') {
          await createRate.mutateAsync(action.input);
        } else if (action.type === 'update') {
          await updateRate.mutateAsync({ id: action.id, input: action.input });
        } else {
          await deleteRate.mutateAsync(action.id);
        }
      }
      setDialogOpen(false);
      setEditingGroupKey(null);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    }
  };

  const handleDelete = async (rate: RewardValueRate) => {
    const label = `${rate.bankName}${rate.cardName ? ` · ${rate.cardName}` : ''} · ${REWARD_MODE_LABELS[rate.mode]}`;
    if (!confirm(`Delete rate for ${label}?`)) return;

    try {
      await deleteRate.mutateAsync(rate.id);
    } catch (deleteError) {
      alert(getErrorMessage(deleteError));
    }
  };

  const isSubmitting = createRate.isPending || updateRate.isPending || deleteRate.isPending;

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Reward Value Rates</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Maintain rupee value per reward point by bank, card, and redemption mode.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add rates
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Filter by bank name and redemption mode.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <BankSelectField
                value={bankFilter}
                onChange={setBankFilter}
                id="bankFilter"
                allowAll
                allLabel="All banks"
                label="Bank"
              />
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All modes</SelectItem>
                  {REWARD_REDEMPTION_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {REWARD_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Rates
              </CardTitle>
              <CardDescription>
                {rates?.length ?? 0} rate{(rates?.length ?? 0) === 1 ? '' : 's'} loaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
                  Loading rates…
                </div>
              ) : error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  Failed to load rates: {getErrorMessage(error)}
                </div>
              ) : !rates?.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Coins className="h-10 w-10 text-[var(--muted-foreground)]" />
                  <p className="text-sm font-medium text-[var(--foreground)]">No rates yet</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Add rates to start showing points worth on credit card reward panels.
                  </p>
                  <Button onClick={openCreateDialog} size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add first rates
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead>Card</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Value / point</TableHead>
                        <TableHead>Min points</TableHead>
                        <TableHead>Effective</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.bankName}</TableCell>
                          <TableCell>{rate.cardName ?? 'All cards'}</TableCell>
                          <TableCell>{REWARD_MODE_LABELS[rate.mode]}</TableCell>
                          <TableCell>₹{formatValuePerPoint(rate.valuePerPoint)}</TableCell>
                          <TableCell>{rate.minPoints ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(rate.effectiveFrom)}
                            {rate.effectiveTo ? ` → ${formatDate(rate.effectiveTo)}` : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                              {rate.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">{rate.source ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(rate)}
                                title="Edit all modes for this card"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDelete(rate)}
                                disabled={deleteRate.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <RateFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogChange}
          isEdit={editingGroupKey != null}
          form={form}
          onFormChange={setForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errorMessage={formError}
        />
      </AdminLayout>
    </AuthGuard>
  );
}
