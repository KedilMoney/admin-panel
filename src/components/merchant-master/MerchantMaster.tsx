'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { SystemCategoryOption } from '@/types';
import { MerchantDrawer, MerchantProfilePanel } from './MerchantDetail';
import {
  VERIFICATION_LEVELS,
  VERIFICATION_META,
  confidenceTone,
  initials,
  primaryIdentifier,
} from './data';
import type { MerchantMasterStats, MerchantProfile } from './types';
import { useMerchantEditor } from './use-merchant-editor';
import './tokens.css';
import './merchant-master.css';

export type MerchantMasterVariant = 'table-drawer' | 'split';

export interface MerchantMasterProps {
  variant: MerchantMasterVariant;
  onVariantChange: (variant: MerchantMasterVariant) => void;
  merchants: MerchantProfile[];
  setMerchants: React.Dispatch<React.SetStateAction<MerchantProfile[]>>;
  stats: MerchantMasterStats;
  systemCategories: SystemCategoryOption[];
  onSaveProfile: (merchant: MerchantProfile) => Promise<void>;
  onAddMerchant: () => void;
  onMerge?: (merchant: MerchantProfile) => void;
  onSignalsTabOpen?: (merchantId: string) => void;
  signalsLoadingId?: string | null;
  signalsError?: string | null;
  onSignalsRetry?: () => void;
  onTrackRemoveIdentifier?: (merchantId: string, identifierId: string) => void;
  onTrackRemoveAlias?: (merchantId: string, aliasId: string) => void;
  saveError?: string;
}

const confColorVar = (c: number) => {
  const t = confidenceTone(c);
  return t === 'success' ? 'var(--green-500)' : t === 'warning' ? 'var(--warn-500)' : 'var(--bad-500)';
};

const avatarTone = (id: string) => {
  const tones = [
    { bg: 'var(--green-100)', fg: 'var(--green-text)' },
    { bg: 'var(--info-100)', fg: 'var(--info-text)' },
    { bg: 'var(--purple-100)', fg: 'var(--purple-text)' },
    { bg: 'var(--warn-100)', fg: 'var(--warn-text)' },
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return tones[h % tones.length];
};

export default function MerchantMaster({
  variant,
  onVariantChange,
  merchants,
  setMerchants,
  stats,
  systemCategories,
  onSaveProfile,
  onAddMerchant,
  onMerge,
  onSignalsTabOpen,
  signalsLoadingId = null,
  signalsError = null,
  onSignalsRetry,
  onTrackRemoveIdentifier,
  onTrackRemoveAlias,
  saveError,
}: MerchantMasterProps) {
  const [query, setQuery] = useState('');
  const [trust, setTrust] = useState('all');
  const [category, setCategory] = useState('all');
  const [quick, setQuick] = useState<'all' | 'review' | 'noid'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    variant === 'split' ? (merchants[0]?.id ?? null) : null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statsHover, setStatsHover] = useState(true);
  const [toast, setToast] = useState('');

  const merchantActive =
    variant === 'table-drawer' ? drawerOpen : Boolean(selectedId);
  const showStats = !merchantActive && statsHover;

  const editorFor = useMerchantEditor(
    setMerchants,
    (identifierId) => {
      if (selectedId) onTrackRemoveIdentifier?.(selectedId, identifierId);
    },
    (aliasId) => {
      if (selectedId) onTrackRemoveAlias?.(selectedId, aliasId);
    }
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merchants.filter((m) => {
      if (q) {
        const hay = [
          m.canonicalName,
          m.tags.join(' '),
          m.upiId,
          m.identifiers.map((i) => i.value).join(' '),
          m.aliases.map((a) => a.rawName).join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (trust !== 'all' && m.verificationLevel !== trust) return false;
      if (category !== 'all' && m.systemCategoryId !== category) return false;
      if (
        quick === 'review' &&
        !(
          m.confidence < 0.6 ||
          m.verificationLevel === 'llm_low' ||
          m.verificationLevel === 'llm_medium'
        )
      ) {
        return false;
      }
      if (quick === 'noid' && !(!m.upiId && m.identifiers.length === 0)) return false;
      return true;
    });
  }, [merchants, query, trust, category, quick]);

  const selected = merchants.find((m) => m.id === selectedId) ?? null;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((flash as typeof flash & { _t?: number })._t);
    (flash as typeof flash & { _t?: number })._t = window.setTimeout(() => setToast(''), 1900);
  }, []);

  const save = async (merchant: MerchantProfile | null, closeDrawerOnSave = false) => {
    if (!merchant) return;
    try {
      await onSaveProfile(merchant);
      flash('Profile saved');
      if (closeDrawerOnSave) closeDrawer();
    } catch {
      // Parent surfaces saveError
    }
  };

  const openRow = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
    setStatsHover(false);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setStatsHover(true);
  };

  const handleSplitSelect = (id: string) => {
    setSelectedId(id);
    setStatsHover(false);
  };

  const signalsProps = selected
    ? {
        onSignalsTabOpen: () => onSignalsTabOpen?.(selected.id),
        signalsLoading: signalsLoadingId === selected.id,
        signalsError: signalsLoadingId === selected.id ? signalsError : null,
        onSignalsRetry,
      }
    : {};

  return (
    <div className="mm">
      <div className="mm-page">
        <div className="mm-header">
          <div>
            <div className="mm-eyebrow">Merchant master</div>
            <div className="mm-title">Merchant profiles</div>
            <div className="mm-subtitle">
              Global merchant identities matched from bank statements &amp; UPI — de-duplicated,
              categorised and trust-scored.
            </div>
          </div>
          <div className="mm-header-actions">
            <div className="mm-seg">
              <button
                type="button"
                className={variant === 'table-drawer' ? 'is-active' : ''}
                onClick={() => onVariantChange('table-drawer')}
              >
                Table
              </button>
              <button
                type="button"
                className={variant === 'split' ? 'is-active' : ''}
                onClick={() => onVariantChange('split')}
              >
                Split
              </button>
            </div>
            <div className="mm-search">
              <Search size={17} />
              <input
                placeholder="Search name, UPI, alias…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="button" className="mm-btn mm-btn--primary" onClick={onAddMerchant}>
              <Plus size={17} />
              Add merchant
            </button>
          </div>
        </div>

        {!showStats && !merchantActive ? (
          <div
            className="mm-stats-reveal"
            onMouseEnter={() => setStatsHover(true)}
            aria-hidden
          />
        ) : null}

        <div
          className={`mm-stats-wrap${showStats ? '' : ' is-collapsed'}`}
          onMouseEnter={() => setStatsHover(true)}
          onMouseLeave={() => setStatsHover(false)}
        >
          <div className="mm-stats">
            <div className="mm-stat">
              <div className="mm-stat__label">Total profiles</div>
              <div className="mm-stat__value">{stats.totalProfiles}</div>
            </div>
            <div className="mm-stat">
              <div className="mm-stat__label">Needs review</div>
              <div className="mm-stat__value mm-stat__value--accent">{stats.needsReview}</div>
            </div>
            <div className="mm-stat">
              <div className="mm-stat__label">User confirmed</div>
              <div className="mm-stat__value">{stats.userConfirmed}</div>
            </div>
            <div className="mm-stat">
              <div className="mm-stat__label">With identifiers</div>
              <div className="mm-stat__value">{stats.withIdentifiers}</div>
            </div>
            <div className="mm-stat">
              <div className="mm-stat__label">Duplicate groups</div>
              <div className="mm-stat__value mm-stat__value--brand">{stats.duplicateGroups}</div>
            </div>
          </div>
        </div>

        {variant === 'table-drawer' ? (
          <TableWorkspace
            filtered={filtered}
            trust={trust}
            setTrust={setTrust}
            category={category}
            setCategory={setCategory}
            quick={quick}
            setQuick={setQuick}
            systemCategories={systemCategories}
            openRow={openRow}
            selectedId={selectedId}
            drawerOpen={drawerOpen}
            statsCollapsed={!showStats}
            drawer={
              drawerOpen && selected ? (
                <MerchantDrawer
                  merchant={selected}
                  editor={editorFor(selected.id)}
                  systemCategories={systemCategories}
                  onClose={closeDrawer}
                  onSave={() => save(selected, true)}
                  onMerge={onMerge ? () => onMerge(selected) : undefined}
                  saveError={saveError}
                  {...signalsProps}
                />
              ) : null
            }
          />
        ) : (
          <SplitWorkspace
            filtered={filtered}
            trust={trust}
            setTrust={setTrust}
            selectedId={selectedId}
            setSelectedId={handleSplitSelect}
            statsCollapsed={!showStats}
            profile={
              selected ? (
                <MerchantProfilePanel
                  merchant={selected}
                  editor={editorFor(selected.id)}
                  systemCategories={systemCategories}
                  onSave={() => save(selected)}
                  onMerge={onMerge ? () => onMerge(selected) : undefined}
                  saveError={saveError}
                  {...signalsProps}
                />
              ) : null
            }
          />
        )}
      </div>

      {toast ? (
        <div className="mm-toast">
          <span style={{ color: 'var(--green-500)', display: 'inline-flex' }}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function TableWorkspace(props: {
  filtered: MerchantProfile[];
  trust: string;
  setTrust: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  quick: 'all' | 'review' | 'noid';
  setQuick: (v: 'all' | 'review' | 'noid') => void;
  systemCategories: SystemCategoryOption[];
  openRow: (id: string) => void;
  selectedId: string | null;
  drawerOpen: boolean;
  statsCollapsed: boolean;
  drawer: React.ReactNode;
}) {
  const {
    filtered,
    trust,
    setTrust,
    category,
    setCategory,
    quick,
    setQuick,
    systemCategories,
    openRow,
    selectedId,
    drawerOpen,
    statsCollapsed,
    drawer,
  } = props;
  const cols = {
    display: 'grid',
    gridTemplateColumns: '2.3fr 1.3fr 1.7fr 0.8fr 0.8fr 1.3fr 1.5fr 1.1fr',
  } as const;

  return (
    <div className={`mm-workspace${drawerOpen ? ' mm-workspace--drawer-open' : ''}`}>
      <div className="mm-toolbar">
        <div className="mm-toolbar__count">{filtered.length} profiles</div>
        <div className="mm-spacer" />
        <select className="mm-select" value={trust} onChange={(e) => setTrust(e.target.value)}>
          <option value="all">All trust levels</option>
          {VERIFICATION_LEVELS.map((v) => (
            <option key={v} value={v}>
              {VERIFICATION_META[v].label}
            </option>
          ))}
        </select>
        <select className="mm-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {systemCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="mm-seg">
          <button
            type="button"
            className={quick === 'review' ? 'is-active' : ''}
            onClick={() => setQuick(quick === 'review' ? 'all' : 'review')}
          >
            Review queue
          </button>
          <button
            type="button"
            className={quick === 'noid' ? 'is-active' : ''}
            onClick={() => setQuick(quick === 'noid' ? 'all' : 'noid')}
          >
            Missing IDs
          </button>
        </div>
      </div>

      <div className={`mm-table__scroll${statsCollapsed ? ' is-expanded' : ''}`}>
        <div className="mm-row mm-thead" style={cols}>
          <div className="mm-th">Merchant</div>
          <div className="mm-th">Category</div>
          <div className="mm-th">Primary ID</div>
          <div className="mm-th mm-th--right">Aliases</div>
          <div className="mm-th mm-th--right">Txns</div>
          <div className="mm-th">Confidence</div>
          <div className="mm-th">Trust</div>
          <div className="mm-th mm-th--right">Updated</div>
        </div>

        {filtered.map((m) => {
          const p = primaryIdentifier(m);
          const v = VERIFICATION_META[m.verificationLevel];
          const av = avatarTone(m.id);
          const selected = drawerOpen && selectedId === m.id;
          return (
            <div
              key={m.id}
              className={`mm-row mm-trow ${selected ? 'is-selected' : ''}`}
              style={cols}
              onClick={() => openRow(m.id)}
            >
              <div className="mm-merchant">
                <span className="mm-avatar mm-avatar--sm" style={{ background: av.bg, color: av.fg }}>
                  {initials(m.canonicalName)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="mm-name">{m.canonicalName}</div>
                  <div className="mm-sub">{m.seenCount}× seen</div>
                </div>
              </div>
              <div>
                <span className="mm-chip mm-chip--category">{m.category}</span>
                <div className="mm-sub" style={{ marginTop: 3 }}>
                  {m.type}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  className="mm-mono"
                  style={{
                    fontSize: 12.5,
                    color: p ? 'var(--text-strong)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p ? p.value : 'No payment ID'}
                </div>
                <div className="mm-sub">
                  {p ? `${p.type} · ${m.identifiers.length} IDs` : `${m.identifiers.length} IDs`}
                </div>
              </div>
              <div
                className="mm-cell-right mm-num"
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-700)' }}
              >
                {m.aliases.length}
              </div>
              <div
                className="mm-cell-right mm-num"
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-700)' }}
              >
                {m.transactionCount}
              </div>
              <div className="mm-conf">
                <div className="mm-conf__track">
                  <div
                    className="mm-conf__fill"
                    style={{
                      width: `${Math.round(m.confidence * 100)}%`,
                      background: confColorVar(m.confidence),
                    }}
                  />
                </div>
                <span className="mm-conf__num">{m.confidence.toFixed(2)}</span>
              </div>
              <div>
                <span className={`mm-chip mm-tone--${v.tone}`}>
                  <span className="mm-dot" />
                  {v.label}
                </span>
              </div>
              <div className="mm-cell-right" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {m.updatedAt.split(' · ')[0]}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="mm-empty">No merchants match these filters.</div>}
      </div>

      {drawer}
    </div>
  );
}

function SplitWorkspace(props: {
  filtered: MerchantProfile[];
  trust: string;
  setTrust: (v: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  statsCollapsed: boolean;
  profile: React.ReactNode;
}) {
  const { filtered, trust, setTrust, selectedId, setSelectedId, statsCollapsed, profile } = props;
  return (
    <div className={`mm-split${statsCollapsed ? ' mm-split--stats-collapsed' : ''}`}>
      <div className="mm-list">
        <div className="mm-list__head">
          <span className="mm-toolbar__count" style={{ fontSize: 14 }}>
            {filtered.length} profiles
          </span>
          <select
            className="mm-select"
            style={{ fontSize: 12, padding: '7px 30px 7px 10px' }}
            value={trust}
            onChange={(e) => setTrust(e.target.value)}
          >
            <option value="all">All trust levels</option>
            {VERIFICATION_LEVELS.map((v) => (
              <option key={v} value={v}>
                {VERIFICATION_META[v].label}
              </option>
            ))}
          </select>
        </div>
        <div className="mm-list__scroll">
          {filtered.map((m) => {
            const v = VERIFICATION_META[m.verificationLevel];
            const av = avatarTone(m.id);
            return (
              <div
                key={m.id}
                className={`mm-listrow ${selectedId === m.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(m.id)}
              >
                <span className="mm-avatar mm-avatar--md" style={{ background: av.bg, color: av.fg }}>
                  {initials(m.canonicalName)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mm-name">{m.canonicalName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                    <span className="mm-chip mm-chip--category" style={{ fontSize: 11, padding: '2px 8px' }}>
                      {m.category}
                    </span>
                    <span className="mm-sub" style={{ fontSize: 11.5 }}>
                      {m.transactionCount} txns
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 300,
                      color: confColorVar(m.confidence),
                      letterSpacing: '-0.02em',
                    }}
                    className="mm-num"
                  >
                    {m.confidence.toFixed(2)}
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: `var(--${v.tone === 'success' ? 'green-500' : v.tone === 'warning' ? 'warn-500' : v.tone === 'info' ? 'info-500' : 'bad-500'})`,
                      marginTop: 4,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="mm-empty">No matches.</div>}
        </div>
      </div>

      {profile}
    </div>
  );
}
