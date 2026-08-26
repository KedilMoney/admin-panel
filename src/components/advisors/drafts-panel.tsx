'use client';

import { FormEvent, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import { draftAdvisorName } from '@/lib/advisors/drafts';
import { useCreateExpertDraft, useDeleteExpertDraft, useExpertDrafts, useMarkDraftSent } from '@/lib/hooks/useExperts';
import { Copy, Mail, Plus, Trash2 } from 'lucide-react';

export function AdvisorDraftsPanel() {
  const { data: drafts, isLoading, refetch } = useExpertDrafts();
  const createDraft = useCreateExpertDraft();
  const markSent = useMarkDraftSent();
  const deleteDraft = useDeleteExpertDraft();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payloadText, setPayloadText] = useState('{\n  "name": "",\n  "email": ""\n}');
  const [sourceUrl, setSourceUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Payload must be a JSON object');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    try {
      const created = await createDraft.mutateAsync({
        payload,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      setCreatedUrl(created.url);
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Failed to create draft';
      setFormError(apiMessage);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Listing drafts</CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{drafts?.length || 0}</Badge>
              <Button size="sm" onClick={() => { setCreatedUrl(''); setFormError(''); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create draft
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Advisor</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                    Loading drafts...
                  </TableCell>
                </TableRow>
              ) : drafts && drafts.length > 0 ? (
                drafts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell className="font-semibold">{draftAdvisorName(draft.payload)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {draft.sourceUrl ? (
                        <a href={draft.sourceUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                          {draft.sourceUrl}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{formatDateTime(draft.createdAt)}</TableCell>
                    <TableCell className="text-sm">{draft.sentAt ? formatDateTime(draft.sentAt) : 'Not sent'}</TableCell>
                    <TableCell>
                      {draft.submittedAt ? (
                        <Badge>Submitted</Badge>
                      ) : (
                        <Badge variant="secondary">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          title="Copy link"
                          disabled={!draft.url}
                          onClick={() => draft.url && copy(draft.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          title="Mark as sent"
                          disabled={!!draft.sentAt || markSent.isPending}
                          onClick={() => markSent.mutate(draft.id)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          title="Delete draft"
                          disabled={deleteDraft.isPending}
                          onClick={() => {
                            if (!confirm(`Delete draft for "${draftAdvisorName(draft.payload)}"? This cannot be undone.`)) return;
                            deleteDraft.mutate(draft.id);
                          }}
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
                    No drafts yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} contentWrapperClassName="max-w-2xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create listing draft</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Extracted JSON payload</span>
              <textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                rows={12}
                className="w-full rounded-md border border-[var(--border)] bg-transparent p-3 font-mono text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Source URL</span>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://advisor-site.in"
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </label>
            {createdUrl ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm">
                <div className="mb-1 font-medium">Private link</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate">{createdUrl}</code>
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(createdUrl)}>
                    Copy link
                  </Button>
                </div>
              </div>
            ) : null}
            {formError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); refetch(); }}>
                Close
              </Button>
              <Button type="submit" disabled={createDraft.isPending}>
                {createDraft.isPending ? 'Creating...' : 'Create draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
