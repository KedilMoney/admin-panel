'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/lib/hooks/useGroups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, MoreVertical, GripVertical, Edit, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { Group } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function GroupsPage() {
  const { data: groups, isLoading, error, refetch } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({ name: '' });
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
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await createGroup.mutateAsync(formDataToSend);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (imageFile) formDataToSend.append('blob_image', imageFile);

      await updateGroup.mutateAsync({
        id: editingGroup.id,
        data: formDataToSend,
      });
      setEditingGroup(null);
      resetForm();
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
    setFormData({ name: group.name });
    // Set preview from existing image
    if (group.imageUrl) {
      setImagePreview(`${API_BASE_URL}${group.imageUrl}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this group? Categories in this group will need to be reassigned.')) {
      try {
        await deleteGroup.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  const getImageUrl = (group: Group): string | undefined => {
    if (group.imageUrl) {
      return `${API_BASE_URL}${group.imageUrl}`;
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
              <p className="mt-4 text-[var(--muted-foreground)]">Loading groups...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Groups</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage budget groups for organizing categories</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Group</CardTitle>
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
                    <Label htmlFor="name">Group Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Monthly Bills, Entertainment, Savings"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Groups help organize your budget categories
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Group Logo (Image)</Label>
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
                              alt="Group logo preview"
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

          {editingGroup && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Group: {editingGroup.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingGroup(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Group Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Monthly Bills, Entertainment, Savings"
                      required
                      disabled={isSubmitting || editingGroup.isAutoCreated}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Groups help organize your budget categories
                    </p>
                    {editingGroup.isAutoCreated && (
                      <p className="text-sm text-orange-500">Auto-created groups cannot be edited.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-image">Group Logo (Image)</Label>
                    <div className="space-y-3">
                      <Input
                        ref={fileInputRef}
                        id="edit-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={isSubmitting || editingGroup.isAutoCreated}
                        className="cursor-pointer"
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Preview:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Group logo preview"
                              className="h-32 w-auto object-contain"
                            />
                          </div>
                        </div>
                      )}
                      {!imagePreview && editingGroup.imageUrl && (
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Current Image:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden">
                            <img
                              src={getImageUrl(editingGroup)}
                              alt="Current group logo"
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
                    <Button type="submit" disabled={isSubmitting || editingGroup.isAutoCreated}>
                      {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEditingGroup(null); resetForm(); }}
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
                <CardTitle className="text-xl">All Groups</CardTitle>
                <Badge variant="secondary">{groups?.length || 0}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-20">Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Is Global</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups && groups.length > 0 ? (
                    groups.map((group) => (
                      <TableRow key={group.id} className="group">
                        <TableCell className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                        <TableCell>
                          {getImageUrl(group) ? (
                            <div className="relative h-10 w-10 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getImageUrl(group) || ''}
                                alt={group.name}
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
                          <div className="font-semibold text-[var(--foreground)]">{group.name}</div>
                        </TableCell>
                        <TableCell>
                          {group.isAutoCreated ? (
                            <Badge variant="outline">Auto Created</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.isGlobal ? "default" : "secondary"}>
                            {group.isGlobal ? "Global" : "Local"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {group.createdAt ? formatDate(group.createdAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {group.updatedAt ? formatDate(group.updatedAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {!group.isAutoCreated && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditClick(group)}
                                  disabled={updateGroup.isPending}
                                  title="Edit group"
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDelete(group.id)}
                                  disabled={deleteGroup.isPending}
                                  title="Delete group"
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
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">No groups found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowCreateForm(true); resetForm(); }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first group
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
