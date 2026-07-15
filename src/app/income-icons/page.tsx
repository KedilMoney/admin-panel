'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useIcons, useCreateIcon, useUpdateIcon, useDeleteIcon } from '@/lib/hooks/useIcons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, Edit, Image as ImageIcon, Tag } from 'lucide-react';
import { useState, useRef, useMemo, useCallback } from 'react';
import { Icon } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';
const INCOME_GROUP_TITLE = 'Income';

export default function IncomeIconsPage() {
  const resolveImageUrl = useCallback((imageUrl?: string | null): string | undefined => {
    if (!imageUrl) return undefined;
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${API_BASE_URL}${normalizedPath}`;
  }, []);

  const { data: iconsData, isLoading, refetch } = useIcons();
  const icons = Array.isArray(iconsData) ? iconsData : [];
  const incomeIcons = useMemo(
    () =>
      icons.filter(
        (icon) =>
          icon.groupTitle?.trim().toLowerCase() === INCOME_GROUP_TITLE.toLowerCase() ||
          icon.slug?.toLowerCase().startsWith('income-')
      ),
    [icons]
  );

  const createIcon = useCreateIcon();
  const updateIcon = useUpdateIcon();
  const deleteIcon = useDeleteIcon();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIcon, setEditingIcon] = useState<Icon | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    tags: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFormData({ slug: '', tags: '' });
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('slug', formData.slug.trim());
      formDataToSend.append('groupTitle', INCOME_GROUP_TITLE);
      if (formData.tags.trim()) {
        formDataToSend.append('tags', formData.tags.trim());
      }
      if (imageFile) {
        formDataToSend.append('blob_image', imageFile);
      }

      await createIcon.mutateAsync(formDataToSend);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating income icon:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('slug', formData.slug.trim());
      formDataToSend.append('groupTitle', INCOME_GROUP_TITLE);
      if (formData.tags.trim()) {
        formDataToSend.append('tags', formData.tags.trim());
      }
      if (imageFile) {
        formDataToSend.append('blob_image', imageFile);
      }

      await updateIcon.mutateAsync({
        id: editingIcon.id,
        data: formDataToSend,
      });
      setEditingIcon(null);
      resetForm();
    } catch (error) {
      console.error('Error updating income icon:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = useCallback((icon: Icon) => {
    setEditingIcon(icon);
    setFormData({
      slug: icon.slug || '',
      tags: icon.tags || (icon.searchTags ? icon.searchTags.join(', ') : ''),
    });
    setImagePreview(icon.imageUrl ? resolveImageUrl(icon.imageUrl) || null : null);
    setImageFile(null);
    setShowCreateForm(false);
  }, [resolveImageUrl]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this income icon?')) {
      try {
        await deleteIcon.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting income icon:', error);
      }
    }
  }, [deleteIcon]);

  const getImageUrl = useCallback((icon: Icon): string | undefined => {
    return resolveImageUrl(icon.imageUrl);
  }, [resolveImageUrl]);

  if (isLoading && !icons.length) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">Loading income icons...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Income Category Icons</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Upload and manage icons used for income categories in the Kedil app.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Income Icon
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted-foreground)]">
                Icons uploaded here are stored in the global icon library with group title
                <Badge variant="secondary" className="mx-1.5">{INCOME_GROUP_TITLE}</Badge>
                and appear in income category pickers across the web app.
              </p>
            </CardContent>
          </Card>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upload Income Category Icon</CardTitle>
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
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g., income-salary, income-freelance"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Search Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., salary, paycheck, freelance"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Icon Image *</Label>
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isSubmitting}
                      className="cursor-pointer"
                      required
                    />
                    {imagePreview && (
                      <div className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
                        <img src={imagePreview} alt="Income icon preview" className="h-24 w-24 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Uploading...' : 'Upload'}
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

          {editingIcon && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Income Icon: {editingIcon.slug}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingIcon(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">Slug *</Label>
                    <Input
                      id="edit-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tags">Search Tags</Label>
                    <Input
                      id="edit-tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-image">Replace Icon Image</Label>
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
                      <div className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
                        <img src={imagePreview} alt="Income icon preview" className="h-24 w-24 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEditingIcon(null); resetForm(); }}
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
                <CardTitle className="text-xl">Income Icons ({incomeIcons.length})</CardTitle>
                <Badge variant="secondary">{incomeIcons.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Icon</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeIcons.length > 0 ? (
                    incomeIcons.map((icon) => (
                      <TableRow key={icon.id}>
                        <TableCell>
                          {getImageUrl(icon) ? (
                            <div className="relative h-12 w-12 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getImageUrl(icon) || ''}
                                alt={icon.slug}
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold font-mono text-sm">{icon.slug}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {icon.tags ? (
                              icon.tags.split(',').map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag.trim()}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)]">No tags</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {icon.createdAt ? formatDate(icon.createdAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(icon)}
                              title="Edit icon"
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(icon.id)}
                              title="Delete icon"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">No income icons uploaded yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowCreateForm(true); resetForm(); }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Upload your first income icon
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
