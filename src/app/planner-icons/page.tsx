'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import {
  usePlannerIcons,
  useCreatePlannerIcon,
  useUpdatePlannerIcon,
  useDeletePlannerIcon,
} from '@/lib/hooks/usePlannerIcons';
import { PLANNER_API_URL, getPlannerKey, setPlannerKey, plannerErrorMessage, isPlannerKeyRejected } from '@/lib/api/plannerIcons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, X, Edit, KeyRound, Search, Tag } from 'lucide-react';
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { PlannerIcon } from '@/types';

const EMPTY_FORM = { slug: '', groupTitle: '', tags: '', svg: '' };

/** Drawn as an image, so nothing inside the SVG can run on this page. */
function SvgPreview({ svg, size }: { svg: string; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt=""
      className={`${size} object-contain`}
    />
  );
}

export default function PlannerIconsPage() {
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  useEffect(() => setHasKey(!!getPlannerKey()), []);

  const { data, isLoading, error, refetch } = usePlannerIcons(hasKey);
  const icons = useMemo(() => data ?? [], [data]);
  const createIcon = useCreatePlannerIcon();
  const updateIcon = useUpdatePlannerIcon();
  const deleteIcon = useDeletePlannerIcon();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIcon, setEditingIcon] = useState<PlannerIcon | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPlannerKeyRejected(error)) {
      setPlannerKey('');
      setHasKey(false);
    }
  }, [error]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const saveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setPlannerKey(keyInput.trim());
    setKeyInput('');
    setHasKey(!!keyInput.trim());
  };

  const forgetKey = () => {
    setPlannerKey('');
    setHasKey(false);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      setFormError('Choose an SVG file. Planner icons take the card colour, which a PNG or JPG cannot.');
      e.target.value = '';
      return;
    }
    const svg = await file.text();
    setFormError(null);
    setFormData((current) => ({ ...current, svg }));
  }, []);

  const payload = () => ({
    groupTitle: formData.groupTitle.trim(),
    tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    svg: formData.svg,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.svg) {
      setFormError('Choose an SVG file.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingIcon) {
        await updateIcon.mutateAsync({ slug: editingIcon.slug, data: payload() });
        setEditingIcon(null);
      } else {
        await createIcon.mutateAsync({ slug: formData.slug.trim(), ...payload() });
        setShowCreateForm(false);
      }
      resetForm();
    } catch (err) {
      setFormError(plannerErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = useCallback((icon: PlannerIcon) => {
    setEditingIcon(icon);
    setFormData({ slug: icon.slug, groupTitle: icon.groupTitle, tags: icon.tags.join(', '), svg: icon.svg });
    setFormError(null);
    setShowCreateForm(false);
  }, []);

  const handleDelete = useCallback(async (slug: string) => {
    if (!confirm('Delete this icon? Cards using it fall back to their built-in icon.')) return;
    try {
      await deleteIcon.mutateAsync(slug);
    } catch (err) {
      alert(plannerErrorMessage(err));
    }
  }, [deleteIcon]);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return icons;
    return icons.filter((icon) =>
      icon.slug.includes(query) ||
      icon.groupTitle.toLowerCase().includes(query) ||
      icon.tags.some((tag) => tag.includes(query)));
  }, [icons, searchQuery]);

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingIcon(null);
    resetForm();
  };

  const formOpen = showCreateForm || !!editingIcon;

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Planner Icons</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Manage the icons people pick for cards in Kedil Planner</p>
            </div>
            {hasKey && (
              <div className="flex gap-2">
                <Button onClick={forgetKey} variant="outline" size="sm">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change key
                </Button>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={() => { setEditingIcon(null); setShowCreateForm(true); resetForm(); }} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Icon
                </Button>
              </div>
            )}
          </div>

          {!PLANNER_API_URL && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-red-600 dark:text-red-400">
                  NEXT_PUBLIC_PLANNER_API_URL is not set, so this page has no Planner API to manage.
                </p>
              </CardContent>
            </Card>
          )}

          {PLANNER_API_URL && !hasKey && (
            <Card>
              <CardHeader>
                <CardTitle>Planner admin key</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveKey} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="planner-key">Key</Label>
                    <Input
                      id="planner-key"
                      type="password"
                      autoComplete="off"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      required
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      The PLANNER_ADMIN_KEY set on the Planner server. Kept in this browser only.
                    </p>
                    {isPlannerKeyRejected(error) && (
                      <p className="text-sm text-red-600 dark:text-red-400">That key was rejected. Paste it again.</p>
                    )}
                  </div>
                  <Button type="submit">Save key</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {hasKey && (
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input
                    type="text"
                    placeholder="Search icons by slug, group or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {hasKey && formOpen && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingIcon ? `Edit Icon: ${editingIcon.slug}` : 'Create New Icon'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={closeForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g., child-college, home-loan"
                      required
                      disabled={isSubmitting || !!editingIcon}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Lower-case words joined by hyphens. Saved on every card that uses it, so it can&apos;t change later.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Search Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., school, education, fees"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">Comma-separated</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupTitle">Group Title *</Label>
                    <Input
                      id="groupTitle"
                      value={formData.groupTitle}
                      onChange={(e) => setFormData({ ...formData, groupTitle: e.target.value })}
                      placeholder="e.g., Goals, Family, Money"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">Heading this icon sits under in the Planner picker</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svg">SVG file {editingIcon ? '' : '*'}</Label>
                    <Input
                      ref={fileInputRef}
                      id="svg"
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Line drawing on a 24×24 viewBox, up to 20 KB. Its colour is replaced by the card colour.
                    </p>
                    {formData.svg && (
                      <div className="inline-block border-2 border-[var(--border)] rounded-lg bg-[var(--muted)] p-4">
                        <SvgPreview svg={formData.svg} size="h-24 w-24" />
                      </div>
                    )}
                  </div>
                  {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editingIcon ? 'Update' : 'Create'}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {hasKey && (
            <Card>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">All Planner Icons</CardTitle>
                  <Badge variant="secondary">{filteredIcons.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Icon</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Group Title</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                          Loading icons...
                        </TableCell>
                      </TableRow>
                    ) : error && !isPlannerKeyRejected(error) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-red-600 dark:text-red-400">
                          {plannerErrorMessage(error)}
                        </TableCell>
                      </TableRow>
                    ) : filteredIcons.length > 0 ? (
                      filteredIcons.map((icon) => (
                        <TableRow key={icon.slug}>
                          <TableCell>
                            <div className="h-12 w-12 rounded border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                              <SvgPreview svg={icon.svg} size="h-8 w-8" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[var(--foreground)] font-mono text-sm">{icon.slug}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-[var(--foreground)]">{icon.groupTitle}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {icon.tags.length > 0 ? (
                                icon.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
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
                            <span className="text-sm text-[var(--muted-foreground)]">{formatDate(icon.updatedAt)}</span>
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
                                onClick={() => handleDelete(icon.slug)}
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
                        <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                          {searchQuery ? 'No icons found matching your search' : 'No planner icons yet. Cards use their built-in icons until you add some.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
