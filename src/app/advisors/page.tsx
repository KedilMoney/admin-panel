'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useExperts, useCreateExpert, useUpdateExpert, useToggleExpert, useDeleteExpert } from '@/lib/hooks/useExperts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Plus, RefreshCw, Edit, Trash2, ToggleLeft, ToggleRight, User } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Expert, ExpertFormData, TrialSession } from '@/types';
import { expertsApi } from '@/lib/api/experts';

// Backend serves uploaded photos under /uploads/expert-photos — prepend the API
// origin so the <img> tag resolves against the API host, not the admin-panel origin.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';
function resolvePhotoUrl(photo: string | null | undefined): string {
  if (!photo) return '';
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
    return photo;
  }
  return `${API_BASE}${photo}`;
}

const FEE_MODE_SUGGESTIONS = ['Fixed fee', 'AUA-based fee', 'Consultation'];

const EMPTY_FORM: ExpertFormData = {
  name: '',
  lastName: '',
  photo: '',
  specialisation: [],
  city: '',
  bio: '',
  feeModels: [],
  trialSession: 'NONE',
  certification: [],
  registrationNo: [],
  sessionFeeMin: '',
  sessionFeeMax: '',
  experience: '',
  languages: [],
  phone: '',
  whatsapp: '',
  website: '',
  linkedin: '',
  instagram: '',
  facebook: '',
  youtube: '',
  hasAgency: false,
  agencyName: '',
  agencyType: '',
  agencyDescription: '',
  agencyWebsite: '',
};

function expertToForm(expert: Expert): ExpertFormData {
  return {
    name: expert.name,
    lastName: expert.lastName || '',
    photo: expert.photo || '',
    specialisation: expert.specialisation || [],
    city: expert.city,
    bio: expert.bio,
    feeModels: expert.feeModels || [],
    trialSession: expert.trialSession || 'NONE',
    certification: expert.certification || [],
    registrationNo: expert.registrationNo || [],
    sessionFeeMin: String(expert.sessionFeeMin),
    sessionFeeMax: String(expert.sessionFeeMax),
    experience: String(expert.experience),
    languages: expert.languages || [],
    phone: expert.phone || '',
    whatsapp: expert.whatsapp || '',
    website: expert.website || '',
    linkedin: expert.linkedin || '',
    instagram: expert.instagram || '',
    facebook: expert.facebook || '',
    youtube: expert.youtube || '',
    hasAgency: !!expert.agency,
    agencyName: expert.agency?.name || '',
    agencyType: expert.agency?.type || '',
    agencyDescription: expert.agency?.description || '',
    agencyWebsite: expert.agency?.website || '',
  };
}

const TRIAL_SESSION_LABELS: Record<TrialSession, string> = {
  NONE: 'No',
  FIRST_SESSION: 'Yes',
};

/** First letter of name + first letter of lastName (if present), uppercase. */
function avatarInitials(name: string, lastName?: string | null): string {
  const first = name?.trim()?.[0] ?? '?';
  const second = lastName?.trim()?.[0] ?? '';
  return (first + second).toUpperCase();
}

/**
 * Reusable tag-input component.
 * Type a value and press Enter or comma to add it as a chip.
 * Chips have a mild green tint for visibility.
 * Optionally shows suggestion chips below the input.
 */
function TagInput({
  values,
  onChange,
  disabled,
  placeholder,
  suggestions,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const trimmed = draft.trim().replace(/,$/, '').trim();
    if (!trimmed) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  };

  const addSuggestion = (s: string) => {
    if (values.some((v) => v.toLowerCase() === s.toLowerCase())) return;
    onChange([...values, s]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const removeAt = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const availableSuggestions = suggestions?.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        {values.map((val, i) => (
          <span
            key={`${val}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300"
          >
            {val}
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled}
              className="text-green-600 dark:text-green-400 hover:text-red-600 leading-none"
              aria-label={`Remove ${val}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commitDraft}
          disabled={disabled}
          placeholder={values.length === 0 ? (placeholder ?? 'Type and press Enter') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
        />
      </div>
      {availableSuggestions && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSuggestion(s)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md border border-green-200 dark:border-green-800 bg-white dark:bg-transparent px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
    setForm((prev: ExpertFormData) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

        <Dialog open={dialogOpen} onOpenChange={closeDialog} contentWrapperClassName="max-w-3xl">
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpert ? `Edit: ${editingExpert.name}` : 'Add Financial Advisor'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} disabled={isSubmitting} maxLength={100} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Specialisation * <span className="text-xs text-[var(--muted-foreground)]">(type and press Enter to add)</span></Label>
                    <TagInput
                      values={form.specialisation}
                      onChange={(next) => set('specialisation', next)}
                      disabled={isSubmitting}
                      placeholder="e.g. Debt Management"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} required disabled={isSubmitting} placeholder="e.g. Chennai / Online / Pan India" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="bio">Bio * <span className="text-xs text-[var(--muted-foreground)]">(2–3 sentences)</span></Label>
                    <textarea
                      id="bio"
                      value={form.bio}
                      onChange={(e) => set('bio', e.target.value)}
                      required
                      disabled={isSubmitting}
                      rows={3}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Photo <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-[var(--muted-foreground)]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          disabled={isSubmitting}
                          className="block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[var(--border)] file:text-xs file:font-medium file:bg-[var(--background)] file:text-[var(--foreground)] file:cursor-pointer hover:file:bg-[var(--accent)] cursor-pointer"
                        />
                        {photoPreview && (
                          <button type="button" onClick={handleRemovePhoto} className="text-xs text-red-500 hover:text-red-700">
                            Remove photo
                          </button>
                        )}
                        <p className="text-xs text-[var(--muted-foreground)]">Max 5 MB. JPG / PNG / WebP.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Credentials</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Fee Mode * <span className="text-xs text-[var(--muted-foreground)]">(click a suggestion or type your own)</span></Label>
                    <TagInput
                      values={form.feeModels}
                      onChange={(next) => set('feeModels', next)}
                      disabled={isSubmitting}
                      placeholder="e.g. Fixed fee"
                      suggestions={FEE_MODE_SUGGESTIONS}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Certification * <span className="text-xs text-[var(--muted-foreground)]">(type and press Enter to add)</span></Label>
                    <TagInput
                      values={form.certification}
                      onChange={(next) => set('certification', next)}
                      disabled={isSubmitting}
                      placeholder="e.g. SEBI RIA, CFP"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Registration No <span className="text-xs text-[var(--muted-foreground)]">(optional — type and press Enter to add)</span></Label>
                    <TagInput
                      values={form.registrationNo}
                      onChange={(next) => set('registrationNo', next)}
                      disabled={isSubmitting}
                      placeholder="e.g. INA000012345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (years) *</Label>
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      max={80}
                      inputMode="numeric"
                      value={form.experience}
                      onChange={(e) => set('experience', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trialSession">Do you offer a Trial Session? *</Label>
                    <Select value={form.trialSession} onValueChange={(v) => set('trialSession', v as TrialSession)} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No</SelectItem>
                        <SelectItem value="FIRST_SESSION">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionFeeMin">Min Session Fee (₹) *</Label>
                    <Input
                      id="sessionFeeMin"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={form.sessionFeeMin}
                      onChange={(e) => set('sessionFeeMin', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionFeeMax">Max Session Fee (₹) *</Label>
                    <Input
                      id="sessionFeeMax"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={form.sessionFeeMax}
                      onChange={(e) => set('sessionFeeMax', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Languages * <span className="text-xs text-[var(--muted-foreground)]">(type and press Enter to add)</span></Label>
                    <TagInput
                      values={form.languages}
                      onChange={(next) => set('languages', next)}
                      disabled={isSubmitting}
                      placeholder="e.g. Tamil, English"
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} disabled={isSubmitting} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} disabled={isSubmitting} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="website">Website <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="website" value={form.website} onChange={(e) => set('website', e.target.value)} disabled={isSubmitting} placeholder="https://advisorname.com" />
                  </div>
                </div>
              </div>

              {/* Social Profiles */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Social Profiles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="linkedin" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} disabled={isSubmitting} placeholder="https://linkedin.com/in/username" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} disabled={isSubmitting} placeholder="https://instagram.com/username" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="facebook" value={form.facebook} onChange={(e) => set('facebook', e.target.value)} disabled={isSubmitting} placeholder="https://facebook.com/username" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                    <Input id="youtube" value={form.youtube} onChange={(e) => set('youtube', e.target.value)} disabled={isSubmitting} placeholder="https://youtube.com/@username" />
                  </div>
                </div>
              </div>

              {/* Firm */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Firm</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hasAgency}
                      onChange={(e) => set('hasAgency', e.target.checked)}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                    <span className="text-sm">This advisor has their own firm</span>
                  </label>

                  {form.hasAgency && (
                    <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-[var(--border)]">
                      <div className="space-y-2">
                        <Label htmlFor="agencyName">Firm Name *</Label>
                        <Input id="agencyName" value={form.agencyName} onChange={(e) => set('agencyName', e.target.value)} required={form.hasAgency} disabled={isSubmitting} placeholder="e.g. RK Financial Services" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agencyType">Firm Type *</Label>
                        <Input id="agencyType" value={form.agencyType} onChange={(e) => set('agencyType', e.target.value)} required={form.hasAgency} disabled={isSubmitting} placeholder="e.g. SEBI RIA / Boutique Firm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="agencyWebsite">Firm Website <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                        <Input id="agencyWebsite" value={form.agencyWebsite} onChange={(e) => set('agencyWebsite', e.target.value)} disabled={isSubmitting} placeholder="https://firmname.com" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="agencyDescription">Description <span className="text-xs text-[var(--muted-foreground)]">(optional)</span></Label>
                        <textarea
                          id="agencyDescription"
                          value={form.agencyDescription}
                          onChange={(e) => set('agencyDescription', e.target.value)}
                          disabled={isSubmitting}
                          rows={2}
                          maxLength={500}
                          placeholder="Short description of the firm"
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
