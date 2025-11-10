'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from '@/lib/hooks/useBankMaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, MoreVertical, GripVertical, Edit, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { BankMaster } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function BankMasterPage() {
  const { data: banks, isLoading, error, refetch } = useBanks();
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentBank, setCurrentBank] = useState<BankMaster | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    slug: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({ name: '', shortName: '', slug: '' });
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.shortName) formDataToSend.append('shortName', formData.shortName);
      if (formData.slug) formDataToSend.append('slug', formData.slug);
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await createBank.mutateAsync(formDataToSend);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (bank: BankMaster) => {
    setCurrentBank(bank);
    setFormData({
      name: bank.name,
      shortName: bank.shortName,
      slug: bank.slug,
    });
    // Set preview from existing image
    if (bank.imageUrl) {
      setImagePreview(`${API_BASE_URL}${bank.imageUrl}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBank) return;
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.shortName) formDataToSend.append('shortName', formData.shortName);
      if (formData.slug) formDataToSend.append('slug', formData.slug);
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await updateBank.mutateAsync({ id: currentBank.id, data: formDataToSend });
      setShowEditForm(false);
      setCurrentBank(null);
      resetForm();
    } catch (error) {
      console.error('Error updating bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this bank?')) {
      try {
        await deleteBank.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting bank:', error);
      }
    }
  };

  const getImageUrl = (bank: BankMaster): string | undefined => {
    if (bank.imageUrl) {
      return `${API_BASE_URL}${bank.imageUrl}`;
    }
    return undefined;
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">Loading banks...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Bank Master</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage bank master records</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bank
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Bank</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowCreateForm(false); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Bank Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortName">Short Name</Label>
                      <Input
                        id="shortName"
                        value={formData.shortName}
                        onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="image">Bank Logo (Image) *</Label>
                      <div className="space-y-3">
                        <Input
                          ref={fileInputRef}
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={isSubmitting}
                          className="cursor-pointer"
                        />
                        {imagePreview && (
                          <div className="mt-2">
                            <p className="text-sm text-[var(--muted-foreground)] mb-2">Preview:</p>
                            <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                              <img
                                src={imagePreview}
                                alt="Bank logo preview"
                                className="h-32 w-auto object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || !imageFile}>
                      {isSubmitting ? 'Creating...' : 'Create Bank'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowCreateForm(false); resetForm(); }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {showEditForm && currentBank && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Bank: {currentBank.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowEditForm(false); setCurrentBank(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Bank Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shortName">Short Name</Label>
                      <Input
                        id="edit-shortName"
                        value={formData.shortName}
                        onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-slug">Slug</Label>
                      <Input
                        id="edit-slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="edit-image">Bank Logo (Image)</Label>
                      <div className="space-y-3">
                        <Input
                          ref={fileInputRef}
                          id="edit-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={isSubmitting}
                          className="cursor-pointer"
                        />
                        {imagePreview && (
                          <div className="mt-2">
                            <p className="text-sm text-[var(--muted-foreground)] mb-2">Preview:</p>
                            <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                              <img
                                src={imagePreview}
                                alt="Bank logo preview"
                                className="h-32 w-auto object-contain"
                              />
                            </div>
                          </div>
                        )}
                        {!imagePreview && currentBank.imageUrl && (
                          <div className="mt-2">
                            <p className="text-sm text-[var(--muted-foreground)] mb-2">Current Image:</p>
                            <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                              <img
                                src={getImageUrl(currentBank)}
                                alt="Current bank logo"
                                className="h-32 w-auto object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Bank'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowEditForm(false); setCurrentBank(null); resetForm(); }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">All Banks</CardTitle>
                <Badge variant="secondary">{banks?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-20">Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Short Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Is Global</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks && banks.length > 0 ? (
                    banks.map((bank) => (
                      <TableRow key={bank.id} className="group">
                        <TableCell className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {bank.id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getImageUrl(bank) ? (
                            <div className="relative h-10 w-10 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getImageUrl(bank) || ''}
                                alt={bank.name}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="flex items-center justify-center h-full"><ImageIcon class="h-5 w-5 text-[var(--muted-foreground)]" /></div>';
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[var(--foreground)]">{bank.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{bank.shortName}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded">
                            {bank.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bank.isGlobal ? "default" : "secondary"}>
                            {bank.isGlobal ? "Global" : "Local"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {bank.created_by ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {bank.created_by.substring(0, 8)}...
                            </Badge>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {bank.created_at ? formatDate(bank.created_at) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(bank)}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="More options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">No banks found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowCreateForm(true); resetForm(); }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first bank
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
      </AdminLayout>
    </AuthGuard>
  );
}
