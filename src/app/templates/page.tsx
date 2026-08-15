'use client';

import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBudgetTemplate,
  useProvisionBudgetTemplate,
  useUpdateBudgetTemplate,
} from '@/lib/hooks/useAdmin';
import { useIcons } from '@/lib/hooks/useIcons';
import {
  BudgetTemplateCategoryType,
  BudgetTemplateGroup,
} from '@/lib/api/admin';
import { Icon } from '@/types';
import { Image as ImageIcon, Plus, RefreshCw, Trash2, X } from 'lucide-react';

const TEMPLATE_TYPE_OPTIONS: BudgetTemplateCategoryType[] = ['need', 'want', 'saving'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';

type ApiError = {
  response?: {
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const apiError = error as ApiError;

  if (typeof apiError.response?.data?.message === 'string') {
    return apiError.response.data.message;
  }

  if (typeof apiError.message === 'string') {
    return apiError.message;
  }

  return fallback;
};

function resolveImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function TemplatesPage() {
  const {
    data: budgetTemplatePayload,
    isLoading: templateLoading,
    refetch: refetchTemplate,
  } = useBudgetTemplate();
  const budgetTemplate = budgetTemplatePayload?.template ?? [];
  const isTemplatePersisted = budgetTemplatePayload?.isPersisted ?? false;
  const updateTemplate = useUpdateBudgetTemplate();
  const provisionTemplate = useProvisionBudgetTemplate();
  const { data: iconsData } = useIcons();
  const icons = Array.isArray(iconsData) ? iconsData : [];

  const iconsById = useMemo(() => {
    const map = new Map<string, Icon>();
    icons.forEach((icon) => map.set(icon.id, icon));
    return map;
  }, [icons]);

  const [templateDraftOverride, setTemplateDraftOverride] = useState<BudgetTemplateGroup[] | null>(
    null
  );
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [iconPicker, setIconPicker] = useState<{
    groupIndex: number;
    categoryIndex: number;
  } | null>(null);
  const [iconSearch, setIconSearch] = useState('');

  const templateFromApi = useMemo(() => {
    return budgetTemplate.map((group) => ({
      name: group.name,
      categories: group.categories.map((category) => ({
        name: category.name,
        type: category.type,
        iconId: category.iconId ?? null,
      })),
    }));
  }, [budgetTemplate]);

  const templateDraft = templateDraftOverride ?? templateFromApi;
  const updateTemplateDraft = (updater: (draft: BudgetTemplateGroup[]) => BudgetTemplateGroup[]) => {
    setTemplateDraftOverride((current) => updater(current ?? templateFromApi));
  };

  const hasTemplateChanges = useMemo(
    () => JSON.stringify(templateDraft) !== JSON.stringify(templateFromApi),
    [templateDraft, templateFromApi]
  );

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return icons.slice(0, 80);
    return icons
      .filter((icon) => {
        const slug = icon.slug?.toLowerCase() ?? '';
        const tags = (icon.searchTags ?? []).join(' ').toLowerCase();
        return slug.includes(q) || tags.includes(q);
      })
      .slice(0, 80);
  }, [icons, iconSearch]);

  const setGroupName = (groupIndex: number, value: string) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) => (idx === groupIndex ? { ...group, name: value } : group))
    );
  };

  const removeGroup = (groupIndex: number) => {
    updateTemplateDraft((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const addGroup = () => {
    updateTemplateDraft((prev) => [
      ...prev,
      {
        name: `New Group ${prev.length + 1}`,
        categories: [{ name: 'New Category', type: 'need', iconId: null }],
      },
    ]);
  };

  const addCategory = (groupIndex: number) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: [
                ...group.categories,
                { name: 'New Category', type: 'need', iconId: null },
              ],
            }
          : group
      )
    );
  };

  const setCategoryName = (groupIndex: number, categoryIndex: number, value: string) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: group.categories.map((category, cIdx) =>
                cIdx === categoryIndex ? { ...category, name: value } : category
              ),
            }
          : group
      )
    );
  };

  const setCategoryType = (
    groupIndex: number,
    categoryIndex: number,
    type: BudgetTemplateCategoryType
  ) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: group.categories.map((category, cIdx) =>
                cIdx === categoryIndex ? { ...category, type } : category
              ),
            }
          : group
      )
    );
  };

  const setCategoryIcon = (
    groupIndex: number,
    categoryIndex: number,
    iconId: string | null
  ) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: group.categories.map((category, cIdx) =>
                cIdx === categoryIndex ? { ...category, iconId } : category
              ),
            }
          : group
      )
    );
  };

  const removeCategory = (groupIndex: number, categoryIndex: number) => {
    updateTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: group.categories.filter((_, cIdx) => cIdx !== categoryIndex),
            }
          : group
      )
    );
  };

  const saveTemplate = async () => {
    try {
      await updateTemplate.mutateAsync(templateDraft);
      setTemplateDraftOverride(null);
      setSaveFeedback({ type: 'success', message: 'Budget template updated successfully.' });
    } catch (error: unknown) {
      setSaveFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Failed to update template'),
      });
    }
  };

  const loadSignupDefaults = async () => {
    try {
      await provisionTemplate.mutateAsync();
      setTemplateDraftOverride(null);
      setSaveFeedback({
        type: 'success',
        message: 'Loaded email signup defaults into Templates. Edit and Save if needed.',
      });
    } catch (error: unknown) {
      setSaveFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Failed to load signup defaults'),
      });
    }
  };

  const refreshAll = async () => {
    setTemplateDraftOverride(null);
    setSaveFeedback(null);
    await refetchTemplate();
  };

  if (templateLoading && templateDraft.length === 0) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-[var(--muted-foreground)]">Loading templates...</p>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Templates</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Budget groups and categories loaded for new users on signup.
                {isTemplatePersisted
                  ? ' Saved in Admin.'
                  : ' Showing code defaults (not saved yet).'}
              </p>
            </div>
            <Button onClick={refreshAll} variant="outline" size="sm" disabled={templateLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Signup Budget Template</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={loadSignupDefaults}
                    disabled={provisionTemplate.isPending || updateTemplate.isPending}
                  >
                    {provisionTemplate.isPending ? 'Loading…' : 'Load signup defaults'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={addGroup}
                    disabled={updateTemplate.isPending || provisionTemplate.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group
                  </Button>
                  <Button
                    onClick={saveTemplate}
                    disabled={
                      updateTemplate.isPending ||
                      provisionTemplate.isPending ||
                      !hasTemplateChanges
                    }
                  >
                    {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {saveFeedback && (
                <div
                  className={`rounded border px-3 py-2 text-sm ${
                    saveFeedback.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {saveFeedback.message}
                </div>
              )}
              {templateDraft.map((group, groupIndex) => (
                <div key={`${groupIndex}-${group.name}`} className="rounded border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="mb-1 block">Group Name</Label>
                      <Input
                        value={group.name}
                        onChange={(e) => setGroupName(groupIndex, e.target.value)}
                        placeholder="Group name"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      onClick={() => removeGroup(groupIndex)}
                      disabled={updateTemplate.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.categories.map((category, categoryIndex) => {
                      const selectedIcon = category.iconId
                        ? iconsById.get(category.iconId)
                        : undefined;
                      const imageUrl = resolveImageUrl(selectedIcon?.imageUrl);

                      return (
                        <div
                          key={`${groupIndex}-${categoryIndex}`}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                        >
                          <div className="md:col-span-1">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded border bg-[var(--background)] hover:bg-[var(--accent)]"
                              title={selectedIcon?.slug || 'Choose icon'}
                              onClick={() => {
                                setIconSearch('');
                                setIconPicker({ groupIndex, categoryIndex });
                              }}
                              disabled={updateTemplate.isPending}
                            >
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt={selectedIcon?.slug || 'icon'}
                                  className="h-6 w-6 object-contain"
                                />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
                              )}
                            </button>
                          </div>
                          <div className="md:col-span-6">
                            <Input
                              value={category.name}
                              onChange={(e) =>
                                setCategoryName(groupIndex, categoryIndex, e.target.value)
                              }
                              placeholder="Category name"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Select
                              value={category.type}
                              onValueChange={(value) =>
                                setCategoryType(
                                  groupIndex,
                                  categoryIndex,
                                  value as BudgetTemplateCategoryType
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {TEMPLATE_TYPE_OPTIONS.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 flex gap-1 justify-end">
                            {category.iconId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Clear icon"
                                onClick={() => setCategoryIcon(groupIndex, categoryIndex, null)}
                                disabled={updateTemplate.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCategory(groupIndex, categoryIndex)}
                              disabled={updateTemplate.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCategory(groupIndex)}
                      disabled={updateTemplate.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </div>
              ))}

              {templateDraft.length === 0 && (
                <div className="text-sm text-[var(--muted-foreground)]">
                  No template groups found. Click &quot;Load signup defaults&quot; or add a group.
                </div>
              )}
            </CardContent>
          </Card>

          {iconPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-lg border bg-[var(--card)] shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="font-semibold">Choose icon</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIconPicker(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 p-4">
                  <Input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons by slug or tag"
                  />
                  <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                    {filteredIcons.map((icon) => {
                      const url = resolveImageUrl(icon.imageUrl);
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          className="flex flex-col items-center gap-1 rounded border p-2 hover:bg-[var(--accent)]"
                          onClick={() => {
                            setCategoryIcon(
                              iconPicker.groupIndex,
                              iconPicker.categoryIndex,
                              icon.id
                            );
                            setIconPicker(null);
                          }}
                        >
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={icon.slug} className="h-8 w-8 object-contain" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
                          )}
                          <span className="truncate w-full text-center text-[10px] text-[var(--muted-foreground)]">
                            {icon.slug}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {filteredIcons.length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">No icons match.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
