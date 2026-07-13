'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayout } from '@/components/layout/admin-layout';
import { EnricherTabWorkspace } from '@/components/enricher/enricher-tab-workspace';
import type { EnricherDomain } from '@/types';

const TABS: { id: EnricherDomain; label: string }[] = [
  { id: 'merchant', label: 'Merchant' },
  { id: 'category', label: 'Categorization' },
  { id: 'tag', label: 'Tag' },
];

function parseTab(value: string | null): EnricherDomain {
  if (value === 'category' || value === 'tag' || value === 'merchant') return value;
  return 'merchant';
}

function EnricherPageContent() {
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => parseTab(searchParams.get('tab')),
    [searchParams]
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-7 w-7" />
          <h1 className="text-3xl font-bold tracking-tight">Enricher</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          One workspace for improving merchant names, categories, and tags. Each tab runs its own
          LLM job with a focused prompt. Review suggestions, apply fixes, and changes propagate
          to users over time.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {TABS.map((tab) => {
          const href = `/enricher?tab=${tab.id}`;
          const isActive = activeTab === tab.id;
          return (
            <a
              key={tab.id}
              href={href}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      <EnricherTabWorkspace key={activeTab} domain={activeTab} />
    </div>
  );
}

export default function EnricherPage() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Suspense
          fallback={
            <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading Enricher…</div>
          }
        >
          <EnricherPageContent />
        </Suspense>
      </AdminLayout>
    </AuthGuard>
  );
}
