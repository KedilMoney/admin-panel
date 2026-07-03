'use client';

import { Nunito } from 'next/font/google';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayout } from '@/components/layout/admin-layout';
import MerchantMaster, { type MerchantMasterVariant } from '@/components/merchant-master/MerchantMaster';
import {
  computeStats,
  toBatchSavePayload,
  toHandoffMerchant,
} from '@/components/merchant-master/adapters';
import { CreateMerchantDialog } from '@/components/merchant-master/create-merchant-dialog';
import { MerchantProfileMergeDialog } from '@/components/merchant-master/merchant-profile-merge-dialog';
import type { MerchantProfile as UiProfile } from '@/components/merchant-master/types';
import {
  useMerchantProfileDetail,
  useMerchantProfiles,
  useRunMerchantAliasCleanup,
  useSaveMerchantProfileBatch,
} from '@/lib/hooks/useMerchantProfiles';
import type { MerchantAliasCleanupAction, MerchantAliasCleanupResult } from '@/types';
import '@/components/merchant-master/tokens.css';
import '@/components/merchant-master/merchant-master.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

const LAYOUT_KEY = 'merchant-master-layout';

const formatSubmitError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response.data.message) ||
      error.message ||
      'Unable to save merchant profile.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'Unable to save merchant profile.';
};

const cleanupSampleGroups: Array<{
  key: keyof MerchantAliasCleanupResult['samples'];
  label: string;
}> = [
  { key: 'normalized', label: 'Will normalize' },
  { key: 'merged', label: 'Will merge duplicates' },
  { key: 'deleted', label: 'Will delete' },
  { key: 'ambiguous', label: 'Needs review' },
];

const formatCleanupAction = (action: MerchantAliasCleanupAction) => {
  if (action.type === 'delete') return action.rawName;
  if (action.type === 'merge') return `${action.rawName} -> ${action.sanitizedName}`;
  return `${action.rawName} -> ${action.sanitizedName}`;
};

export default function MerchantMasterPage() {
  const [layout, setLayout] = useState<MerchantMasterVariant>('table-drawer');
  const [merchants, setMerchants] = useState<UiProfile[]>([]);
  const originalsRef = useRef<Map<string, UiProfile>>(new Map());
  const removedIdentifiersRef = useRef<Map<string, Set<string>>>(new Map());
  const removedAliasesRef = useRef<Map<string, Set<string>>>(new Map());
  const [signalsMerchantId, setSignalsMerchantId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSurvivorId, setMergeSurvivorId] = useState<string | null>(null);
  const [mergeDuplicateIds, setMergeDuplicateIds] = useState<string[]>([]);
  const [cleanupReport, setCleanupReport] = useState<MerchantAliasCleanupResult | null>(null);
  const [cleanupError, setCleanupError] = useState('');

  const { data, isLoading, error, refetch } = useMerchantProfiles();
  const saveBatch = useSaveMerchantProfileBatch();
  const aliasCleanup = useRunMerchantAliasCleanup();
  const {
    data: detailData,
    isLoading: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useMerchantProfileDetail(signalsMerchantId, Boolean(signalsMerchantId));

  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (stored === 'table-drawer' || stored === 'split') {
      setLayout(stored);
    }
  }, []);

  useEffect(() => {
    if (!data?.merchants) return;
    const adapted = data.merchants.map(toHandoffMerchant);
    setMerchants(adapted);
    const nextOriginals = new Map<string, UiProfile>();
    for (const merchant of adapted) {
      nextOriginals.set(merchant.id, structuredClone(merchant));
    }
    originalsRef.current = nextOriginals;
    removedIdentifiersRef.current = new Map();
    removedAliasesRef.current = new Map();
  }, [data?.merchants]);

  useEffect(() => {
    if (!detailData?.userMappings || !signalsMerchantId) return;
    setMerchants((current) =>
      current.map((merchant) =>
        merchant.id === signalsMerchantId
          ? {
              ...merchant,
              userMappings: detailData.userMappings.map((mapping) => ({
                merchantKey: mapping.merchantKey,
                systemCategoryId: '',
                category: mapping.category,
                userCorrected: mapping.userCorrected,
                confirmed: mapping.confirmed,
                firstSeen: mapping.firstSeen,
                lastSeen: mapping.lastSeen,
              })),
            }
          : merchant
      )
    );
  }, [detailData, signalsMerchantId]);

  const stats = useMemo(
    () => computeStats(data?.merchants ?? []),
    [data?.merchants]
  );

  const systemCategories = data?.systemCategories ?? [];
  const apiMerchants = data?.merchants ?? [];

  const handleVariantChange = (next: MerchantMasterVariant) => {
    setLayout(next);
    window.localStorage.setItem(LAYOUT_KEY, next);
  };

  const trackRemoveIdentifier = useCallback((merchantId: string, identifierId: string) => {
    const original = originalsRef.current.get(merchantId);
    if (!original?.identifiers.some((item) => item.id === identifierId)) return;
    const bucket = removedIdentifiersRef.current.get(merchantId) ?? new Set<string>();
    bucket.add(identifierId);
    removedIdentifiersRef.current.set(merchantId, bucket);
  }, []);

  const trackRemoveAlias = useCallback((merchantId: string, aliasId: string) => {
    const original = originalsRef.current.get(merchantId);
    if (!original?.aliases.some((item) => item.id === aliasId)) return;
    const bucket = removedAliasesRef.current.get(merchantId) ?? new Set<string>();
    bucket.add(aliasId);
    removedAliasesRef.current.set(merchantId, bucket);
  }, []);

  const handleSaveProfile = async (merchant: UiProfile) => {
    setSaveError('');
    const original = originalsRef.current.get(merchant.id);
    if (!original) {
      setSaveError('Original profile state is missing.');
      throw new Error('Original profile state is missing.');
    }

    const payload = toBatchSavePayload({
      merchant,
      original,
      removedIdentifierIds: [...(removedIdentifiersRef.current.get(merchant.id) ?? [])],
      removedAliasIds: [...(removedAliasesRef.current.get(merchant.id) ?? [])],
    });

    try {
      const saved = await saveBatch.mutateAsync({ id: merchant.id, payload });
      const adapted = toHandoffMerchant(saved);
      setMerchants((current) =>
        current.map((item) =>
          item.id === adapted.id
            ? {
                ...adapted,
                userMappings: item.userMappings,
              }
            : item
        )
      );
      originalsRef.current.set(adapted.id, structuredClone(adapted));
      removedIdentifiersRef.current.delete(adapted.id);
      removedAliasesRef.current.delete(adapted.id);
    } catch (saveFailure) {
      const message = formatSubmitError(saveFailure);
      setSaveError(message);
      throw saveFailure;
    }
  };

  const openMergeDialog = (merchant?: UiProfile, duplicateIds: string[] = []) => {
    setMergeSurvivorId(merchant?.id ?? null);
    setMergeDuplicateIds(duplicateIds.filter((id) => id !== merchant?.id));
    setIsMergeOpen(true);
  };

  const runAliasCleanup = async (apply: boolean) => {
    setCleanupError('');
    try {
      const report = await aliasCleanup.mutateAsync({ apply });
      setCleanupReport(report);
      if (apply) {
        await refetch();
      }
    } catch (failure) {
      setCleanupError(formatSubmitError(failure));
    }
  };

  const cleanupMaintenancePanel = (
    <section className="mm-maintenance" aria-label="Merchant alias cleanup">
      <div>
        <div className="mm-maintenance__title">Alias cleanup</div>
        <div className="mm-maintenance__copy">
          Scan global merchant aliases for UPI refs, payment IDs, and bank descriptor noise before
          applying safe fixes.
        </div>
      </div>
      <div className="mm-maintenance__actions">
        <button
          type="button"
          className="mm-btn mm-btn--secondary"
          disabled={aliasCleanup.isPending}
          onClick={() => runAliasCleanup(false)}
        >
          {aliasCleanup.isPending ? 'Running...' : 'Run dry scan'}
        </button>
        <button
          type="button"
          className="mm-btn mm-btn--dark"
          disabled={aliasCleanup.isPending || !cleanupReport}
          onClick={() => runAliasCleanup(true)}
        >
          Apply cleanup
        </button>
      </div>

      {cleanupError ? <div className="mm-maintenance__error">{cleanupError}</div> : null}

      {cleanupReport ? (
        <div className="mm-cleanup-report">
          <div className="mm-cleanup-report__meta">
            Last run: {cleanupReport.mode === 'apply' ? 'applied' : 'dry scan'}
          </div>
          <div className="mm-cleanup-summary">
            <span>Scanned {cleanupReport.summary.scanned}</span>
            <span>Normalize {cleanupReport.summary.normalized}</span>
            <span>Merge {cleanupReport.summary.merged}</span>
            <span>Delete {cleanupReport.summary.deleted}</span>
            <span>Review {cleanupReport.summary.ambiguous}</span>
          </div>
          <div className="mm-cleanup-samples">
            {cleanupSampleGroups.map(({ key, label }) => {
              const samples = cleanupReport.samples[key];
              if (samples.length === 0) return null;
              return (
                <div key={key} className="mm-cleanup-sample">
                  <div className="mm-cleanup-sample__title">{label}</div>
                  <ul>
                    {samples.slice(0, 5).map((sample) => (
                      <li key={`${key}-${sample.aliasId ?? sample.sourceAliasId}`}>
                        {formatCleanupAction(sample)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );

  if (isLoading) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className={`mm ${nunito.className}`}>
            <div className="mm-page">
              <p className="mm-subtitle">Loading merchant profiles…</p>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <AdminLayout>
          <div className={`mm ${nunito.className}`}>
            <div className="mm-page">
              <p className="mm-subtitle">Unable to load merchant profiles.</p>
              <button type="button" className="mm-btn mm-btn--secondary" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <div className={`mm ${nunito.className}`}>
          <MerchantMaster
            variant={layout}
            onVariantChange={handleVariantChange}
            merchants={merchants}
            setMerchants={setMerchants}
            stats={stats}
            systemCategories={systemCategories}
            onSaveProfile={handleSaveProfile}
            onAddMerchant={() => setIsCreateOpen(true)}
            onMerge={(merchant) => openMergeDialog(merchant)}
            onBulkMerge={(merchantIds) => openMergeDialog(undefined, merchantIds)}
            onSignalsTabOpen={setSignalsMerchantId}
            signalsLoadingId={isDetailLoading ? signalsMerchantId : null}
            signalsError={
              detailError ? formatSubmitError(detailError) : null
            }
            onSignalsRetry={() => refetchDetail()}
            onTrackRemoveIdentifier={trackRemoveIdentifier}
            onTrackRemoveAlias={trackRemoveAlias}
            saveError={saveError}
            maintenancePanel={cleanupMaintenancePanel}
          />
        </div>

        <CreateMerchantDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          systemCategories={systemCategories}
        />

        <MerchantProfileMergeDialog
          key={`${isMergeOpen ? 'open' : 'closed'}-${mergeSurvivorId ?? 'none'}-${mergeDuplicateIds.join(',')}`}
          merchants={apiMerchants}
          systemCategories={systemCategories}
          open={isMergeOpen}
          onOpenChange={(open) => {
            setIsMergeOpen(open);
            if (!open) {
              setMergeSurvivorId(null);
              setMergeDuplicateIds([]);
            }
          }}
          initialSurvivorId={mergeSurvivorId}
          initialDuplicateIds={mergeDuplicateIds}
        />
      </AdminLayout>
    </AuthGuard>
  );
}
