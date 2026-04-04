'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminOnboarding,
  useBudgetTemplate,
  useCategoryUsage,
  useGroupUsage,
  useUpdateBudgetTemplate,
} from '@/lib/hooks/useAdmin';
import { BudgetTemplateCategoryType, BudgetTemplateGroup } from '@/lib/api/admin';
import { formatDateTime } from '@/lib/utils';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

const TEMPLATE_TYPE_OPTIONS: BudgetTemplateCategoryType[] = ['need', 'want', 'saving'];

export default function AnalysisPage() {
  const { data: onboardingUsers = [], isLoading: onboardingLoading, refetch: refetchOnboarding } = useAdminOnboarding();
  const { data: categoryUsage = [], isLoading: categoryUsageLoading, refetch: refetchCategoryUsage } = useCategoryUsage();
  const { data: groupUsage = [], isLoading: groupUsageLoading, refetch: refetchGroupUsage } = useGroupUsage();
  const { data: budgetTemplate = [], isLoading: templateLoading, refetch: refetchTemplate } = useBudgetTemplate();
  const updateTemplate = useUpdateBudgetTemplate();

  const [templateDraft, setTemplateDraft] = useState<BudgetTemplateGroup[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setTemplateDraft(
      budgetTemplate.map((group) => ({
        name: group.name,
        categories: group.categories.map((category) => ({
          name: category.name,
          type: category.type,
        })),
      }))
    );
  }, [budgetTemplate]);

  const stats = useMemo(() => {
    const total = onboardingUsers.length;
    const completed = onboardingUsers.filter((user) => user.completed || user.onboardingCompleted).length;
    const abandoned = onboardingUsers.filter((user) => user.abandoned).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const usersWithDuration = onboardingUsers.filter(
      (user) => typeof user.totalDuration === 'number' && user.totalDuration > 0
    );
    const avgDurationSeconds =
      usersWithDuration.length > 0
        ? Math.round(
            usersWithDuration.reduce((acc, user) => acc + (user.totalDuration || 0), 0) /
              usersWithDuration.length
          )
        : 0;

    const stepCompletion = [1, 2, 3, 4].map((step) => {
      const completedCount = onboardingUsers.filter((user) => {
        if (step === 1) return user.step1Completed;
        if (step === 2) return user.step2Completed;
        if (step === 3) return user.step3Completed;
        return user.step4Completed;
      }).length;
      return {
        step,
        completedCount,
        percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      };
    });

    return { total, completed, abandoned, completionRate, avgDurationSeconds, stepCompletion };
  }, [onboardingUsers]);

  const hasTemplateChanges = useMemo(
    () => JSON.stringify(templateDraft) !== JSON.stringify(budgetTemplate),
    [templateDraft, budgetTemplate]
  );

  const setGroupName = (groupIndex: number, value: string) => {
    setTemplateDraft((prev) =>
      prev.map((group, idx) => (idx === groupIndex ? { ...group, name: value } : group))
    );
  };

  const removeGroup = (groupIndex: number) => {
    setTemplateDraft((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const addGroup = () => {
    setTemplateDraft((prev) => [
      ...prev,
      {
        name: `New Group ${prev.length + 1}`,
        categories: [{ name: 'New Category', type: 'need' }],
      },
    ]);
  };

  const addCategory = (groupIndex: number) => {
    setTemplateDraft((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              categories: [...group.categories, { name: 'New Category', type: 'need' }],
            }
          : group
      )
    );
  };

  const setCategoryName = (groupIndex: number, categoryIndex: number, value: string) => {
    setTemplateDraft((prev) =>
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
    setTemplateDraft((prev) =>
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

  const removeCategory = (groupIndex: number, categoryIndex: number) => {
    setTemplateDraft((prev) =>
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
      setSaveFeedback({ type: 'success', message: 'Budget template updated successfully.' });
    } catch (error: any) {
      setSaveFeedback({
        type: 'error',
        message: error?.response?.data?.message || error?.message || 'Failed to update template',
      });
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      refetchOnboarding(),
      refetchCategoryUsage(),
      refetchGroupUsage(),
      refetchTemplate(),
    ]);
  };

  const loading = onboardingLoading || categoryUsageLoading || groupUsageLoading || templateLoading;

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Admin Insights</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Onboarding flow, user naming patterns, and budget template management
              </p>
            </div>
            <Button onClick={refreshAll} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Onboarding Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Abandoned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.abandoned}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgDurationSeconds}s</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Step Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.stepCompletion.map((step) => (
                  <div key={step.step} className="flex items-center justify-between rounded border p-3">
                    <div className="font-medium">Step {step.step}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {step.completedCount} users ({step.percent}%)
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Onboarding Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Step</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onboardingUsers.slice(0, 10).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.completed ? 'default' : user.abandoned ? 'destructive' : 'secondary'}>
                            {user.completed ? 'Completed' : user.abandoned ? 'Abandoned' : 'In Progress'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.currentStep}</TableCell>
                      </TableRow>
                    ))}
                    {onboardingUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[var(--muted-foreground)]">
                          No onboarding records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category Names Used by Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Distinct Users</TableHead>
                      <TableHead>Total Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryUsage.slice(0, 30).map((row) => (
                      <TableRow key={row.normalizedName}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.distinctUsers}</TableCell>
                        <TableCell>{row.totalRecords}</TableCell>
                      </TableRow>
                    ))}
                    {categoryUsage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[var(--muted-foreground)]">
                          No category usage found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Group Names Used by Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Distinct Users</TableHead>
                      <TableHead>Total Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupUsage.slice(0, 30).map((row) => (
                      <TableRow key={row.normalizedName}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.distinctUsers}</TableCell>
                        <TableCell>{row.totalRecords}</TableCell>
                      </TableRow>
                    ))}
                    {groupUsage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[var(--muted-foreground)]">
                          No group usage found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add/Edit Budget Template</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={addGroup} disabled={updateTemplate.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group
                  </Button>
                  <Button
                    onClick={saveTemplate}
                    disabled={updateTemplate.isPending || !hasTemplateChanges}
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
                    {group.categories.map((category, categoryIndex) => (
                      <div key={`${groupIndex}-${categoryIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-7">
                          <Input
                            value={category.name}
                            onChange={(e) =>
                              setCategoryName(groupIndex, categoryIndex, e.target.value)
                            }
                            placeholder="Category name"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Select
                            value={category.type}
                            onValueChange={(value) =>
                              setCategoryType(groupIndex, categoryIndex, value as BudgetTemplateCategoryType)
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
                        <div className="md:col-span-1">
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
                    ))}
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
                  No template groups found. Add a group to start building the template.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
