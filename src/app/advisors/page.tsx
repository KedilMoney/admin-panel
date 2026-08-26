'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useExperts, useCreateExpert, useUpdateExpert, useToggleExpert, useDeleteExpert } from '@/lib/hooks/useExperts';
import { AdvisorFormFields } from '@/components/advisors/advisor-form-fields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { EMPTY_FORM, expertToForm, validateAdvisorForm } from '@/lib/advisors/form-payload';
import { Plus, RefreshCw, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Expert, ExpertFormData } from '@/types';
import { expertsApi } from '@/lib/api/experts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';
function resolvePhotoUrl(photo: string | null | undefined): string {
  if (!photo) return '';
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  return `${API_BASE}${photo}`;
}

function avatarInitials(name: string, lastName?: string | null): string {
  const first = name?.trim()?.[0] ?? '?';
  const second = lastName?.trim()?.[0] ?? '';
  return (first + second).toUpperCase();
}

export default function AdvisorsPage() {
  const { data: experts, isLoading, refetch } = useExperts();
  const createExpert = useCreateExpert();
  const updateExpert = useUpdateExpert();
  const toggleExpert = useToggleExpert();
  const deleteExpert = useDeleteExpert();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [form, setForm] = useState<ExpertFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const resetPhotoState = () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
    setPendingPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const openCreate = () => {
    setEditingExpert(null);
    setForm(EMPTY_FORM);
    resetPhotoState();
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (expert: Expert) => {
    setEditingExpert(expert);
    setForm(expertToForm(expert));
    resetPhotoState();
    setPhotoPreview(resolvePhotoUrl(expert.photo));
    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExpert(null);
    setForm(EMPTY_FORM);
    resetPhotoState();
    setFormError('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Photo must be an image file');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError(`Photo is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`);
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    setFormError('');
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPendingPhotoFile(file);
  };

  const handleRemovePhoto = () => {
    resetPhotoState();
    set('photo', '');
  };

  const set = <K extends keyof ExpertFormData>(field: K, value: ExpertFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateAdvisorForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      let payload = form;
      if (pendingPhotoFile) {
        const photoUrl = await expertsApi.uploadPhoto(pendingPhotoFile);
        payload = { ...form, photo: photoUrl };
        setForm(payload);
        setPendingPhotoFile(null);
      }

      if (editingExpert) {
        await updateExpert.mutateAsync({ id: editingExpert.id, data: payload });
      } else {
        await createExpert.mutateAsync(payload);
      }
      closeDialog();
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Failed to save advisor';
      setFormError(apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    await toggleExpert.mutateAsync(id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteExpert.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading financial advisors...</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Financial Advisors</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage the financial advisor directory</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Financial Advisor
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">All Financial Advisors</CardTitle>
                <Badge variant="secondary">{experts?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialisation</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Fee Mode</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead>Fee Range</TableHead>
                    <TableHead>Exp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experts && experts.length > 0 ? (
                    experts.map((expert) => (
                      <TableRow key={expert.id}>
                        <TableCell>
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                            {expert.photo ? (
                              <img src={resolvePhotoUrl(expert.photo)} alt={expert.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-[var(--muted-foreground)]">{avatarInitials(expert.name, expert.lastName)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[var(--foreground)]">
                            {expert.name}{expert.lastName ? ` ${expert.lastName}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{expert.specialisation.join(', ')}</span>
                        </TableCell>
                        <TableCell>{expert.city}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {expert.feeModels.map((m) => (
                              <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{expert.certification.join(', ')}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">₹{expert.sessionFeeMin.toLocaleString()} – ₹{expert.sessionFeeMax.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>{expert.experience}y</TableCell>
                        <TableCell>
                          <Badge variant={expert.isActive ? 'default' : 'secondary'}>
                            {expert.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">{formatDate(expert.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(expert)} title="Edit">
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => handleToggle(expert.id)}
                              disabled={toggleExpert.isPending}
                              title={expert.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {expert.isActive
                                ? <ToggleRight className="h-4 w-4 text-green-600" />
                                : <ToggleLeft className="h-4 w-4 text-[var(--muted-foreground)]" />}
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(expert.id, expert.name)}
                              disabled={deleteExpert.isPending}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">No financial advisors yet</p>
                          <Button variant="outline" size="sm" onClick={openCreate} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Add your first financial advisor
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={dialogOpen} onOpenChange={closeDialog} contentWrapperClassName="max-w-[800px]">
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpert ? `Edit: ${editingExpert.name}` : 'Add Financial Advisor'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AdvisorFormFields
                form={form}
                set={set}
                disabled={isSubmitting}
                photoPreview={photoPreview}
                photoInputRef={photoInputRef}
                onPhotoChange={handlePhotoChange}
                onRemovePhoto={handleRemovePhoto}
              />

              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  {formError}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (editingExpert ? 'Saving...' : 'Creating...')
                    : (editingExpert ? 'Save Changes' : 'Create Financial Advisor')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
}
