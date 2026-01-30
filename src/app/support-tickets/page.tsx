'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useDocIssues, useUpdateDocIssueStatus } from '@/lib/hooks/useDocIssues';
import { DocIssue, DocIssueStatus } from '@/lib/api/docIssues';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  Headphones,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Pencil,
  FileText,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') : '';

const STATUS_OPTIONS: { value: DocIssueStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

function statusVariant(status: DocIssueStatus) {
  switch (status) {
    case 'PENDING':
      return 'destructive';
    case 'IN_PROGRESS':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getDownloadUrl(ticket: DocIssue): string | null {
  if (!ticket.documentPath || !API_BASE) return null;
  const path = ticket.documentPath.startsWith('/') ? ticket.documentPath : `/${ticket.documentPath}`;
  return `${API_BASE}${path}`;
}

export default function SupportTicketsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocIssueStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullViewTicket, setFullViewTicket] = useState<DocIssue | null>(null);
  const [editStatus, setEditStatus] = useState<DocIssueStatus | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
    limit: 20,
  };

  const { data, isLoading, error, refetch } = useDocIssues(params);
  const updateStatus = useUpdateDocIssueStatus();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as DocIssueStatus | 'ALL');
    setPage(1);
  };

  const handleStatusUpdate = (id: string, newStatus: DocIssueStatus) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  const openFullView = (ticket: DocIssue) => {
    setFullViewTicket(ticket);
    setEditStatus(ticket.status);
  };

  const saveAndCloseFullView = () => {
    if (fullViewTicket && editStatus !== null && editStatus !== fullViewTicket.status) {
      handleStatusUpdate(fullViewTicket.id, editStatus);
    }
    setFullViewTicket(null);
    setEditStatus(null);
  };

  if (error) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center">
            <p className="text-sm text-red-800">
              Error loading support tickets. Make sure your account has admin access.
            </p>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Headphones className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Support Tickets
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Document upload failures and support requests
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    placeholder="Search by email, file name, or failure reason..."
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-9 border-[var(--border)] bg-[var(--background)]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-full sm:w-[160px] border-[var(--border)]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
                </div>
              ) : !data?.issues?.length ? (
                <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
                  No support tickets found.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[var(--border)] hover:bg-transparent">
                          <TableHead className="w-9 text-[var(--muted-foreground)] font-medium" />
                          <TableHead className="text-[var(--muted-foreground)] font-medium">User</TableHead>
                          <TableHead className="text-[var(--muted-foreground)] font-medium">File</TableHead>
                          <TableHead className="text-[var(--muted-foreground)] font-medium">Failure reason</TableHead>
                          <TableHead className="text-[var(--muted-foreground)] font-medium">Status</TableHead>
                          <TableHead className="text-[var(--muted-foreground)] font-medium">Created</TableHead>
                          <TableHead className="w-[120px] text-right text-[var(--muted-foreground)] font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.issues.map((ticket) => {
                          const downloadUrl = getDownloadUrl(ticket);
                          return (
                            <React.Fragment key={ticket.id}>
                              <TableRow
                                className="cursor-pointer border-[var(--border)] hover:bg-[var(--accent)]/50"
                                onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                              >
                                <TableCell className="text-[var(--muted-foreground)]">
                                  {expandedId === ticket.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-[var(--foreground)]">
                                      {ticket.user?.username ?? ticket.user?.email ?? '—'}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">
                                      {ticket.user?.email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-0.5">
                                    <p
                                      className="max-w-[180px] truncate text-sm text-[var(--foreground)]"
                                      title={ticket.fileName}
                                    >
                                      {ticket.fileName}
                                    </p>
                                    <p className="text-xs text-[var(--muted-foreground)]">
                                      {ticket.fileType.toUpperCase()}
                                      {ticket.fileSizeBytes != null &&
                                        ` · ${(ticket.fileSizeBytes / 1024).toFixed(1)} KB`}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="max-w-[220px] line-clamp-2 text-sm text-[var(--foreground)]">
                                    {ticket.failureReason}
                                  </p>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={ticket.status}
                                    onValueChange={(v) => handleStatusUpdate(ticket.id, v as DocIssueStatus)}
                                  >
                                    <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent shadow-none hover:bg-[var(--accent)]">
                                      <Badge
                                        variant={statusVariant(ticket.status)}
                                        className="w-full justify-center font-normal"
                                      >
                                        {ticket.status.replace('_', ' ')}
                                      </Badge>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PENDING">Pending</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-sm text-[var(--muted-foreground)]">
                                  {formatDate(ticket.createdAt)}
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    {downloadUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        asChild
                                      >
                                        <a
                                          href={downloadUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download={ticket.fileName}
                                          title="Download document"
                                        >
                                          <Download className="h-4 w-4 text-[var(--muted-foreground)]" />
                                        </a>
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => openFullView(ticket)}
                                      title="Full view"
                                    >
                                      <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)]" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {expandedId === ticket.id && (
                                <TableRow className="border-[var(--border)] bg-[var(--muted)]/30">
                                  <TableCell colSpan={7} className="py-4">
                                    <div className="grid grid-cols-1 gap-4 px-2 text-sm md:grid-cols-2">
                                      <div>
                                        <p className="mb-1 font-medium text-[var(--muted-foreground)]">
                                          User comments
                                        </p>
                                        <p className="whitespace-pre-wrap text-[var(--foreground)]">
                                          {ticket.userComments || '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="mb-1 font-medium text-[var(--muted-foreground)]">
                                          Metadata
                                        </p>
                                        <pre className="max-h-28 overflow-auto rounded border border-[var(--border)] bg-[var(--card)] p-2 text-xs">
                                          {ticket.metadata
                                            ? JSON.stringify(ticket.metadata, null, 2)
                                            : '—'}
                                        </pre>
                                      </div>
                                      {ticket.errorDetails && (
                                        <div className="md:col-span-2">
                                          <p className="mb-1 font-medium text-[var(--muted-foreground)]">
                                            Error details
                                          </p>
                                          <pre className="max-h-28 overflow-auto rounded border border-[var(--border)] bg-[var(--card)] p-2 text-xs">
                                            {JSON.stringify(ticket.errorDetails, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {downloadUrl && (
                                        <div className="md:col-span-2">
                                          <Button variant="outline" size="sm" className="gap-2" asChild>
                                            <a
                                              href={downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download={ticket.fileName}
                                            >
                                              <Download className="h-4 w-4" />
                                              Download document
                                            </a>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {data.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Page {data.page} of {data.totalPages} · {data.total} total
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= data.totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full view / Edit modal */}
        <Dialog
          open={!!fullViewTicket}
          onOpenChange={(open) => !open && setFullViewTicket(null)}
          contentWrapperClassName="max-w-2xl"
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            {fullViewTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    Ticket details
                  </DialogTitle>
                  <DialogDescription>
                    View and edit this support ticket
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                  {/* User */}
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
                      <User className="h-4 w-4" />
                      User
                    </h3>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
                      <p className="font-medium text-[var(--foreground)]">
                        {fullViewTicket.user?.username ?? fullViewTicket.user?.email ?? '—'}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {fullViewTicket.user?.email}
                      </p>
                    </div>
                  </section>

                  {/* Document */}
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
                      <FileText className="h-4 w-4" />
                      Document
                    </h3>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
                      <p className="text-sm text-[var(--foreground)]">{fullViewTicket.fileName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {fullViewTicket.fileType.toUpperCase()}
                        {fullViewTicket.fileSizeBytes != null &&
                          ` · ${(fullViewTicket.fileSizeBytes / 1024).toFixed(1)} KB`}
                      </p>
                      {getDownloadUrl(fullViewTicket) && (
                        <Button variant="outline" size="sm" className="mt-2 gap-2" asChild>
                          <a
                            href={getDownloadUrl(fullViewTicket)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fullViewTicket.fileName}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </section>

                  {/* Failure reason */}
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
                      <AlertCircle className="h-4 w-4" />
                      Failure reason
                    </h3>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
                      <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                        {fullViewTicket.failureReason}
                      </p>
                    </div>
                  </section>

                  {/* Edit status */}
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
                      <Pencil className="h-4 w-4" />
                      Status
                    </h3>
                    <Select
                      value={editStatus ?? fullViewTicket.status}
                      onValueChange={(v) => setEditStatus(v as DocIssueStatus)}
                    >
                      <SelectTrigger className="w-full border-[var(--border)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </section>

                  {/* User comments */}
                  {fullViewTicket.userComments && (
                    <section>
                      <h3 className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                        User comments
                      </h3>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
                        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                          {fullViewTicket.userComments}
                        </p>
                      </div>
                    </section>
                  )}

                  {/* Metadata */}
                  {fullViewTicket.metadata && Object.keys(fullViewTicket.metadata).length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                        Metadata
                      </h3>
                      <pre className="max-h-40 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-xs">
                        {JSON.stringify(fullViewTicket.metadata, null, 2)}
                      </pre>
                    </section>
                  )}

                  {/* Error details */}
                  {fullViewTicket.errorDetails &&
                    Object.keys(fullViewTicket.errorDetails).length > 0 && (
                      <section>
                        <h3 className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                          Error details
                        </h3>
                        <pre className="max-h-40 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-xs">
                          {JSON.stringify(fullViewTicket.errorDetails, null, 2)}
                        </pre>
                      </section>
                    )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setFullViewTicket(null); setEditStatus(null); }}>
                    Close
                  </Button>
                  <Button
                    onClick={saveAndCloseFullView}
                    disabled={editStatus === fullViewTicket.status}
                  >
                    Save status
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AuthGuard>
  );
}
