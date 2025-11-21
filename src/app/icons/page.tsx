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
import { Plus, Trash2, RefreshCw, X, Edit, Image as ImageIcon, Search, Tag } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { Icon } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function IconsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: icons, isLoading, error, refetch } = useIcons(searchQuery);
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

  const resetForm = () => {
    setFormData({ slug: '', tags: '' });
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
      formDataToSend.append('slug', formData.slug.trim());
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
      console.error('Error creating icon:', error);
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
      console.error('Error updating icon:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (icon: Icon) => {
    setEditingIcon(icon);
    setFormData({ 
      slug: icon.slug || '',
      tags: icon.tags || (icon.searchTags ? icon.searchTags.join(', ') : '')
    });
    // Set preview from existing image
    if (icon.imageUrl) {
      setImagePreview(`${API_BASE_URL}${icon.imageUrl}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this icon? This action cannot be undone.')) {
      try {
        await deleteIcon.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting icon:', error);
      }
    }
  };

  const getImageUrl = (icon: Icon): string | undefined => {
    if (icon.imageUrl) {
      return `${API_BASE_URL}${icon.imageUrl}`;
    }
    return undefined;
  };

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!icons) return [];
    if (!searchQuery.trim()) return icons;
    
    const query = searchQuery.toLowerCase();
    return icons.filter(icon => {
      const slugMatch = icon.slug?.toLowerCase().includes(query);
      const tagsMatch = icon.tags?.toLowerCase().includes(query) || 
                       icon.searchTags?.some(tag => tag.toLowerCase().includes(query));
      return slugMatch || tagsMatch;
    });
  }, [icons, searchQuery]);

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">Loading icons...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Icon Library</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage global icons for the Kedil Money application</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Icon
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  type="text"
                  placeholder="Search icons by slug or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Icon</CardTitle>
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
                      placeholder="e.g., home-icon, wallet-icon, savings-icon"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      A unique identifier for the icon (used in code)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Search Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., home, house, building, wallet, money, savings"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Comma-separated tags for searching (e.g., "home, house, building")
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Icon Image *</Label>
                    <div className="space-y-3">
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
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Preview:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden bg-[var(--muted)] p-4">
                            <img
                              src={imagePreview}
                              alt="Icon preview"
                              className="h-24 w-24 object-contain"
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

          {editingIcon && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Icon: {editingIcon.slug}</CardTitle>
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
                      placeholder="e.g., home-icon, wallet-icon, savings-icon"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      A unique identifier for the icon (used in code)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tags">Search Tags</Label>
                    <Input
                      id="edit-tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., home, house, building, wallet, money, savings"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Comma-separated tags for searching (e.g., "home, house, building")
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-image">Icon Image</Label>
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
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">New Preview:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden bg-[var(--muted)] p-4">
                            <img
                              src={imagePreview}
                              alt="Icon preview"
                              className="h-24 w-24 object-contain"
                            />
                          </div>
                        </div>
                      )}
                      {!imagePreview && editingIcon.imageUrl && (
                        <div className="mt-2">
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">Current Image:</p>
                          <div className="relative inline-block border-2 border-[var(--border)] rounded-lg overflow-hidden bg-[var(--muted)] p-4">
                            <img
                              src={getImageUrl(editingIcon)}
                              alt="Current icon"
                              className="h-24 w-24 object-contain"
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
                <CardTitle className="text-xl">All Icons</CardTitle>
                <Badge variant="secondary">{filteredIcons.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Icon</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIcons && filteredIcons.length > 0 ? (
                    filteredIcons.map((icon) => (
                      <TableRow key={icon.id}>
                        <TableCell>
                          {getImageUrl(icon) ? (
                            <div className="relative h-12 w-12 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getImageUrl(icon) || ''}
                                alt={icon.slug}
                                className="h-full w-full object-contain p-1"
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
                            <div className="h-12 w-12 rounded border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[var(--foreground)] font-mono text-sm">{icon.slug}</div>
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
                            ) : icon.searchTags && icon.searchTags.length > 0 ? (
                              icon.searchTags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)]">No tags</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={icon.isGlobal ? "default" : "secondary"}>
                            {icon.isGlobal ? "Global" : "Local"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {icon.createdAt ? formatDate(icon.createdAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {icon.updatedAt ? formatDate(icon.updatedAt) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(icon)}
                              disabled={updateIcon.isPending}
                              title="Edit icon"
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(icon.id)}
                              disabled={deleteIcon.isPending}
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
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-[var(--muted-foreground)]">
                            {searchQuery ? 'No icons found matching your search' : 'No icons found'}
                          </p>
                          {!searchQuery && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setShowCreateForm(true); resetForm(); }}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create your first icon
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
      </AdminLayout>
    </AuthGuard>
  );
}

