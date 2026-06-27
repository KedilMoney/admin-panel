'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BankMaster } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.kedil.money';

type BankFormState = {
  name: string;
  shortName: string;
  slug: string;
  isGlobal: boolean;
};

const EMPTY_FORM: BankFormState = {
  name: '',
  shortName: '',
  slug: '',
  isGlobal: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function resolveImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  return `${API_BASE_URL}${imageUrl}`;
}

interface BankFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBank: BankMaster | null;
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function BankFormDialog({
  open,
  onOpenChange,
  editingBank,
  onSubmit,
  isSubmitting = false,
}: BankFormDialogProps) {
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingBank;

  useEffect(() => {
    if (!open) return;

    if (editingBank) {
      setForm({
        name: editingBank.name,
        shortName: editingBank.shortName ?? '',
        slug: editingBank.slug ?? '',
        isGlobal: editingBank.isGlobal,
      });
      setSlugEdited(true);
      setImageFile(null);
      setImagePreview(resolveImageUrl(editingBank.imageUrl) ?? null);
    } else {
      setForm(EMPTY_FORM);
      setSlugEdited(false);
      setImageFile(null);
      setImagePreview(null);
    }
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, editingBank]);

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const handleNameChange = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      slug: slugEdited ? current.slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugEdited(true);
    setForm((current) => ({ ...current, slug }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Logo must be an image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError(`Logo is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFormError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Bank name is required.');
      return;
    }

    if (!isEditing && !imageFile) {
      setFormError('Bank logo is required for new banks.');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name.trim());
    if (form.shortName.trim()) formData.append('shortName', form.shortName.trim());
    if (form.slug.trim()) formData.append('slug', form.slug.trim());
    formData.append('isGlobal', String(form.isGlobal));
    if (imageFile) formData.append('blob_image', imageFile);

    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (error as { message?: string })?.message ||
        'Unable to save bank.';
      setFormError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())} contentWrapperClassName="max-w-2xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${editingBank?.name}` : 'Add Bank'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update bank details and logo. Leave logo unchanged if you do not upload a new file.'
              : 'Create a bank master record with name, slug, visibility, and logo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bank-name">Bank name *</Label>
              <Input
                id="bank-name"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="e.g. HDFC Bank"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-short-name">Short name</Label>
              <Input
                id="bank-short-name"
                value={form.shortName}
                onChange={(event) => setForm((current) => ({ ...current, shortName: event.target.value }))}
                placeholder="e.g. HDFC"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-slug">Slug</Label>
              <Input
                id="bank-slug"
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="hdfc-bank"
                disabled={isSubmitting}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Used in URLs and imports. Auto-generated from name until you edit it.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Visibility</Label>
              <Select
                value={form.isGlobal ? 'global' : 'local'}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, isGlobal: value === 'global' }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global — visible to all users</SelectItem>
                  <SelectItem value="local">Local — creator only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>
                Bank logo {isEditing ? '(optional)' : '*'}
              </Label>
              <div className="flex items-start gap-4 rounded-lg border border-[var(--border)] p-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Bank logo preview" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-7 w-7 text-[var(--muted-foreground)]" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                    className="block w-full text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--background)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--accent)] cursor-pointer"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-red-500 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      Remove logo
                    </button>
                  )}
                  <p className="text-xs text-[var(--muted-foreground)]">Max 5 MB. JPG / PNG / WebP.</p>
                </div>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && !imageFile)}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create bank'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
