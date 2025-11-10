'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, Edit, Image as ImageIcon, GripVertical, MoreVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import { Category } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function CategoriesPage() {
  const { data: categoriesData, isLoading, error, refetch } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    groupId: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCategoryForm({ name: '', groupId: '' });
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
      formDataToSend.append('name', categoryForm.name);
      if (categoryForm.groupId) formDataToSend.append('groupId', categoryForm.groupId);
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await createCategory.mutateAsync(formDataToSend);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', categoryForm.name);
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: formDataToSend,
      });
      setEditingCategory(null);
      resetForm();
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ 
      name: category.name, 
      groupId: category.groupId || '' 
    });
    // Set preview from existing image
    if (category.imageUrl) {
      setImagePreview(`${API_BASE_URL}${category.imageUrl}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const getImageUrl = (category: Category): string | undefined => {
    if (category.imageUrl) {
      return `${API_BASE_URL}${category.imageUrl}`;
    }
    return undefined;
  };

  const allCategories = categoriesData?.groups?.flatMap(group => 
    (group.categories || []).map(cat => ({ ...cat, groupName: group.name }))
  ) || [];

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">Loading categories...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Categories</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage budget categories</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Category</CardTitle>
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
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupId">Group ID (Optional)</Label>
                    <Input
                      id="groupId"
                      value={categoryForm.groupId}
                      onChange={(e) => setCategoryForm({ ...categoryForm, groupId: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="Leave empty to auto-create group"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Category Logo (Image)</Label>
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
                              alt="Category logo preview"
                              className="h-32 w-auto object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create'}
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

          {editingCategory && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Category: {editingCategory.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingCategory(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Category Name *</Label>
                    <Input
                      id="edit-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                      disabled={isSubmitting || editingCategory.isAutoCreated}
                    />
                    {editingCategory.isAutoCreated && (
                      <p className="text-sm text-orange-500">Auto-created categories cannot be edited.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-image">Category Logo (Image)</Label>
                    <div className="space-y-3">
                      <Input
                        ref={fileInputRef}
                        id="edit-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={isSubmitting || editingCategory.isAutoCreated}
                        className="cursor-pointer"
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Preview:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Category logo preview"
                              className="h-32 w-auto object-contain"
                            />
                          </div>
                        </div>
                      )}
                      {!imagePreview && editingCategory.imageUrl && (
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Current Image:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                            <img
                              src={getImageUrl(editingCategory)}
                              alt="Current category logo"
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
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting || editingCategory.isAutoCreated}>
                      {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEditingCategory(null); resetForm(); }}
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
                <CardTitle className="text-xl">All Categories ({allCategories.length})</CardTitle>
                <Badge variant="secondary">{allCategories.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-20">Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Is Global</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCategories.length > 0 ? (
                    allCategories.map((category) => (
                      <TableRow key={category.id} className="group">
                        <TableCell className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                        <TableCell>
                          {getImageUrl(category) ? (
                            <div className="relative h-10 w-10 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getImageUrl(category) || ''}
                                alt={category.name}
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
                          <div className="font-semibold text-[var(--foreground)]">{category.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category.groupName || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.isGlobal ? "default" : "secondary"}>
                            {category.isGlobal ? "Global" : "Local"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {category.allocated ? formatCurrency(category.allocated) : '-'}
                        </TableCell>
                        <TableCell>
                          {category.available ? formatCurrency(category.available) : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {category.createdAt ? formatDate(category.createdAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {!category.isAutoCreated && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditClick(category)}
                                  disabled={updateCategory.isPending}
                                  title="Edit category"
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDelete(category.id)}
                                  disabled={deleteCategory.isPending}
                                  title="Delete category"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </>
                            )}
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
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">No categories found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowCreateForm(true); resetForm(); }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first category
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
