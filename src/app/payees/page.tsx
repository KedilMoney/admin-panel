'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { usePayees, useCreatePayee, useUpdatePayee, useDeletePayee } from '@/lib/hooks/usePayees';
import { useIcons } from '@/lib/hooks/useIcons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, Edit, Image as ImageIcon, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Payee } from '@/lib/api/payees';
import { Icon } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';

export default function PayeesPage() {
  const { data: payeesData, isLoading, error, refetch } = usePayees();
  const { data: iconsData } = useIcons();
  const createPayee = useCreatePayee();
  const updatePayee = useUpdatePayee();
  const deletePayee = useDeletePayee();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [formData, setFormData] = useState({ name: '', iconSlug: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const payees = Array.isArray(payeesData?.payees) ? payeesData.payees : [];
  const icons = Array.isArray(iconsData) ? iconsData : [];

  const filteredPayees = useMemo(() => {
    if (!searchQuery.trim()) return payees;
    const query = searchQuery.toLowerCase();
    return payees.filter(p => p.name.toLowerCase().includes(query));
  }, [payees, searchQuery]);

  const resetForm = () => {
    setFormData({ name: '', iconSlug: '' });
    setShowIconPicker(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createPayee.mutateAsync({
        name: formData.name.trim(),
        iconSlug: formData.iconSlug || undefined,
      });
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating payee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayee) return;
    setIsSubmitting(true);
    try {
      await updatePayee.mutateAsync({
        id: editingPayee.id,
        data: {
          name: formData.name.trim(),
          iconSlug: formData.iconSlug || undefined,
        },
      });
      setEditingPayee(null);
      resetForm();
    } catch (error) {
      console.error('Error updating payee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (payee: Payee) => {
    setEditingPayee(payee);
    setFormData({
      name: payee.name,
      iconSlug: payee.iconSlug || '',
    });
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payee?')) {
      try {
        await deletePayee.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting payee:', error);
      }
    }
  };

  const getIconUrl = (iconSlug: string | undefined): string | undefined => {
    if (!iconSlug) return undefined;
    const icon = icons.find(i => i.slug === iconSlug);
    if (icon?.imageUrl) {
      return `${API_BASE_URL}${icon.imageUrl}`;
    }
    return undefined;
  };

  const getIconObject = (iconSlug: string | undefined): Icon | undefined => {
    if (!iconSlug) return undefined;
    return icons.find(i => i.slug === iconSlug);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">Loading payees...</p>
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
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Payees</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage payee accounts with icons</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setShowCreateForm(true); resetForm(); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Payee
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  type="text"
                  placeholder="Search payees..."
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
                  <CardTitle>Create New Payee</CardTitle>
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
                    <Label htmlFor="payee-name">Payee Name *</Label>
                    <Input
                      id="payee-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Amazon, Salary Account, Mom"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Icon (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full justify-start"
                    >
                      {formData.iconSlug ? `Selected: ${formData.iconSlug}` : 'Click to select icon'}
                    </Button>
                    {showIconPicker && (
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded">
                        {icons.map(icon => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, iconSlug: icon.slug });
                              setShowIconPicker(false);
                            }}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                              formData.iconSlug === icon.slug
                                ? 'bg-blue-100 border-blue-500'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {icon.imageUrl ? (
                              <img
                                src={`${API_BASE_URL}${icon.imageUrl}`}
                                alt={icon.slug}
                                className="h-6 w-6 object-contain"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6" />
                            )}
                            <span className="text-xs truncate">{icon.slug}</span>
                          </button>
                        ))}
                      </div>
                    )}
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

          {editingPayee && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Payee: {editingPayee.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingPayee(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-payee-name">Payee Name *</Label>
                    <Input
                      id="edit-payee-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Icon (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full justify-start"
                    >
                      {formData.iconSlug ? `Selected: ${formData.iconSlug}` : 'Click to select icon'}
                    </Button>
                    {showIconPicker && (
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded">
                        {icons.map(icon => (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, iconSlug: icon.slug });
                              setShowIconPicker(false);
                            }}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                              formData.iconSlug === icon.slug
                                ? 'bg-blue-100 border-blue-500'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {icon.imageUrl ? (
                              <img
                                src={`${API_BASE_URL}${icon.imageUrl}`}
                                alt={icon.slug}
                                className="h-6 w-6 object-contain"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6" />
                            )}
                            <span className="text-xs truncate">{icon.slug}</span>
                          </button>
                        ))}
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
                      onClick={() => { setEditingPayee(null); resetForm(); }}
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
                <CardTitle className="text-xl">All Payees</CardTitle>
                <Badge variant="secondary">{filteredPayees.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Icon Slug</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayees && filteredPayees.length > 0 ? (
                    filteredPayees.map((payee) => (
                      <TableRow key={payee.id}>
                        <TableCell>
                          {getIconUrl(payee.iconSlug) ? (
                            <div className="relative h-10 w-10 rounded border border-[var(--border)] overflow-hidden bg-[var(--muted)] flex items-center justify-center">
                              <img
                                src={getIconUrl(payee.iconSlug) || ''}
                                alt={payee.name}
                                className="h-full w-full object-contain p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="flex items-center justify-center h-full"><svg class="h-5 w-5 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
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
                        <TableCell className="font-semibold text-[var(--foreground)]">
                          {payee.name}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded">
                            {payee.iconSlug || '-'}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {payee.createdAt ? formatDate(payee.createdAt) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-[var(--muted-foreground)]">
                          {payee.updatedAt ? formatDate(payee.updatedAt) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(payee)}
                              disabled={updatePayee.isPending}
                              title="Edit payee"
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDelete(payee.id)}
                              disabled={deletePayee.isPending}
                              title="Delete payee"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <p className="text-[var(--muted-foreground)]">No payees found</p>
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
