'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { SystemCategoryOption } from '@/types';
import {
  TYPES,
  VERIFICATION_LEVELS,
  VERIFICATION_META,
  confidenceTone,
  initials,
} from './data';
import type { EditorApi } from './use-merchant-editor';
import type { IdentifierType, MerchantProfile, MerchantType } from './types';

type Tab = 'overview' | 'identifiers' | 'aliases' | 'signals';

type DetailPanelProps = {
  merchant: MerchantProfile;
  editor: EditorApi;
  systemCategories: SystemCategoryOption[];
  onSave: () => void;
  onMerge?: () => void;
  saveError?: string;
  onSignalsTabOpen?: () => void;
  signalsLoading?: boolean;
  signalsError?: string | null;
  onSignalsRetry?: () => void;
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

const idTone = (t: IdentifierType) =>
  t === 'UPI' ? 'var(--info-100)' : t === 'NEFT' ? 'var(--purple-100)' : 'var(--surface-subtle)';

function CoreFields({
  m,
  editor,
  systemCategories,
}: {
  m: MerchantProfile;
  editor: EditorApi;
  systemCategories: SystemCategoryOption[];
}) {
  const [newTag, setNewTag] = useState('');
  const commitTag = () => {
    if (newTag.trim()) {
      editor.addTag(newTag.trim());
      setNewTag('');
    }
  };

  return (
    <>
      <label className="mm-field">
        <span className="mm-label">
          Canonical name <span className="mm-label__hint">· what users see</span>
        </span>
        <input
          className="mm-input mm-input--name"
          value={m.canonicalName}
          onChange={(e) => editor.setField('canonicalName', e.target.value)}
        />
      </label>

      <div className="mm-grid-2">
        <label className="mm-field">
          <span className="mm-label">System category</span>
          <select
            className="mm-select"
            style={{ width: '100%' }}
            value={m.systemCategoryId}
            onChange={(e) => {
              const category = systemCategories.find((item) => item.id === e.target.value);
              if (category) {
                editor.setCategory(category.id, category.name, category.type as MerchantType);
              }
            }}
          >
            {systemCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mm-field">
          <span className="mm-label">Type</span>
          <select
            className="mm-select"
            style={{ width: '100%' }}
            value={m.type}
            onChange={(e) => editor.setField('type', e.target.value as MerchantProfile['type'])}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mm-field">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span className="mm-label" style={{ marginBottom: 0 }}>
            Match confidence
          </span>
          <span
            className="mm-range-value"
            style={{
              color: `var(--${confidenceTone(m.confidence) === 'success' ? 'green-text' : confidenceTone(m.confidence) === 'warning' ? 'warn-text' : 'bad-text'})`,
            }}
          >
            {m.confidence.toFixed(2)}
          </span>
        </div>
        <input
          className="mm-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={m.confidence}
          onChange={(e) => editor.setField('confidence', parseFloat(e.target.value))}
        />
      </div>

      <label className="mm-field">
        <span className="mm-label">Verification level</span>
        <select
          className="mm-select"
          style={{ width: '100%' }}
          value={m.verificationLevel}
          onChange={(e) =>
            editor.setField('verificationLevel', e.target.value as MerchantProfile['verificationLevel'])
          }
        >
          {VERIFICATION_LEVELS.map((v) => (
            <option key={v} value={v}>
              {VERIFICATION_META[v].label}
            </option>
          ))}
        </select>
      </label>

      <div className="mm-field">
        <span className="mm-label">Taxonomy tags</span>
        <div className="mm-tags">
          {m.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="mm-tag">
              {tag}
              <button
                type="button"
                className="mm-tag__x"
                aria-label={`Remove ${tag}`}
                onClick={() => editor.removeTag(i)}
              >
                <X size={12} strokeWidth={2.2} />
              </button>
            </span>
          ))}
          <input
            className="mm-tag-input"
            placeholder="Add tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitTag()}
          />
        </div>
      </div>
    </>
  );
}

function IdentifiersSection({ m, editor }: { m: MerchantProfile; editor: EditorApi }) {
  return (
    <div className="mm-stack" style={{ gap: 10 }}>
      <div className="mm-section-head" style={{ marginBottom: 2 }}>
        <div className="mm-section-title">Payment identifiers</div>
        <button type="button" className="mm-btn mm-btn--secondary" onClick={editor.addIdentifier}>
          <Plus size={15} />
          Add ID
        </button>
      </div>
      {m.identifiers.map((id) => (
        <div key={id.id} className="mm-listitem">
          <select
            className="mm-select"
            style={{ width: 108, background: idTone(id.type) }}
            value={id.type}
            onChange={(e) => editor.updateIdentifier(id.id, { type: e.target.value as IdentifierType })}
          >
            <option value="UPI">UPI</option>
            <option value="NEFT">NEFT</option>
            <option value="ACCOUNT">ACCOUNT</option>
          </select>
          <input
            className="mm-input mm-input--mono mm-input--sm"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Payment ID value"
            value={id.value}
            onChange={(e) => editor.updateIdentifier(id.id, { value: e.target.value })}
          />
          <button
            type="button"
            className="mm-iconbtn mm-iconbtn--danger"
            aria-label="Remove identifier"
            onClick={() => editor.removeIdentifier(id.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {m.identifiers.length === 0 && <div className="mm-dashed">No payment identifiers yet.</div>}

      <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line-100)' }}>
        <div className="mm-label" style={{ marginBottom: 10 }}>
          Legacy fields
        </div>
        <div className="mm-grid-2">
          <label className="mm-field">
            <span
              className="mm-label"
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              Legacy UPI
            </span>
            <input
              className="mm-input mm-input--mono mm-input--sm"
              placeholder="none"
              value={m.upiId}
              onChange={(e) => editor.setField('upiId', e.target.value)}
            />
          </label>
          <label className="mm-field">
            <span
              className="mm-label"
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              Account no.
            </span>
            <input
              className="mm-input mm-input--mono mm-input--sm"
              placeholder="none"
              value={m.accountNumber}
              onChange={(e) => editor.setField('accountNumber', e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function AliasesSection({ m, editor }: { m: MerchantProfile; editor: EditorApi }) {
  return (
    <div className="mm-stack" style={{ gap: 10 }}>
      <div className="mm-section-head" style={{ marginBottom: 2 }}>
        <div className="mm-section-title">Bank-statement aliases</div>
        <button type="button" className="mm-btn mm-btn--secondary" onClick={editor.addAlias}>
          <Plus size={15} />
          Add alias
        </button>
      </div>
      {m.aliases.map((al) => (
        <div key={al.id} className="mm-listitem">
          <input
            className="mm-input mm-input--mono mm-input--sm"
            style={{ flex: 1.6, minWidth: 0 }}
            placeholder="Raw name"
            value={al.rawName}
            onChange={(e) => editor.updateAlias(al.id, { rawName: e.target.value })}
          />
          <input
            className="mm-input mm-input--sm"
            style={{ flex: 0.9, minWidth: 0 }}
            placeholder="Bank"
            value={al.bankSource ?? ''}
            onChange={(e) => editor.updateAlias(al.id, { bankSource: e.target.value })}
          />
          <span className="mm-sub" style={{ whiteSpace: 'nowrap' }}>
            {al.seenCount}×
          </span>
          <button
            type="button"
            className="mm-iconbtn mm-iconbtn--danger"
            aria-label="Remove alias"
            onClick={() => editor.removeAlias(al.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SignalsSection({
  m,
  isLoading,
  error,
  onRetry,
}: {
  m: MerchantProfile;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return <div className="mm-dashed">Loading signals…</div>;
  }

  if (error) {
    return (
      <div className="mm-stack" style={{ gap: 12 }}>
        <div className="mm-dashed" style={{ color: 'var(--bad-text)' }}>
          {error}
        </div>
        {onRetry ? (
          <button type="button" className="mm-btn mm-btn--secondary" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const maxVote = Math.max(1, ...m.categoryVotes.map((v) => v.points));

  return (
    <div className="mm-stack" style={{ gap: 20 }}>
      <div className="mm-grid-2" style={{ gap: 12 }}>
        <div className="mm-tile">
          <div className="mm-tile__label">Times matched</div>
          <div className="mm-tile__value">{m.seenCount}</div>
        </div>
        <div className="mm-tile">
          <div className="mm-tile__label">Linked transactions</div>
          <div className="mm-tile__value">{m.transactionCount}</div>
        </div>
      </div>
      <div>
        <div className="mm-label" style={{ marginBottom: 10 }}>
          Category votes
        </div>
        {m.categoryVotes.map((v) => (
          <div key={v.systemCategoryId} className="mm-vote">
            <span className="mm-vote__name">{v.category}</span>
            <div className="mm-vote__track">
              <div
                className="mm-vote__fill"
                style={{ width: `${Math.round((v.points / maxVote) * 100)}%` }}
              />
            </div>
            <span className="mm-vote__pts">{v.points} pts</span>
          </div>
        ))}
      </div>
      <div>
        <div className="mm-label" style={{ marginBottom: 10 }}>
          Per-user mappings
        </div>
        {m.userMappings.length === 0 ? (
          <div className="mm-dashed">No per-user mappings yet.</div>
        ) : (
          m.userMappings.map((mp) => (
            <div key={mp.merchantKey} className="mm-mapping">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="mm-mono"
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-strong)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {mp.merchantKey}
                </div>
                <div className="mm-sub" style={{ marginTop: 2 }}>
                  {mp.category} · {mp.firstSeen} → {mp.lastSeen}
                </div>
              </div>
              {mp.userCorrected ? (
                <span className="mm-chip mm-tone--warning" style={{ fontSize: 11 }}>
                  Corrected
                </span>
              ) : null}
              <span
                className={`mm-chip ${mp.confirmed ? 'mm-tone--success' : 'mm-tone--warning'}`}
                style={{ fontSize: 11 }}
              >
                {mp.confirmed ? 'Confirmed' : 'Pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SaveActions({
  onSave,
  onMerge,
  onClose,
  saveError,
  showCancel,
}: {
  onSave: () => void;
  onMerge?: () => void;
  onClose?: () => void;
  saveError?: string;
  showCancel?: boolean;
}) {
  return (
    <>
      {saveError ? (
        <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--bad-text)' }}>{saveError}</p>
      ) : null}
      {onMerge ? (
        <button type="button" className="mm-btn mm-btn--secondary mm-btn--block" onClick={onMerge}>
          Merge with another profile
        </button>
      ) : null}
      <button type="button" className="mm-btn mm-btn--dark mm-btn--block" onClick={onSave}>
        Save profile
      </button>
      {showCancel && onClose ? (
        <button
          type="button"
          className="mm-btn mm-btn--secondary"
          onClick={onClose}
          style={{ padding: '12px 20px', borderRadius: 10 }}
        >
          Cancel
        </button>
      ) : null}
    </>
  );
}

export function MerchantDrawer({
  merchant,
  editor,
  systemCategories,
  onClose,
  onSave,
  onMerge,
  saveError,
  onSignalsTabOpen,
  signalsLoading,
  signalsError,
  onSignalsRetry,
}: DetailPanelProps & { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const v = VERIFICATION_META[merchant.verificationLevel];

  useEffect(() => {
    if (tab === 'signals') {
      onSignalsTabOpen?.();
    }
  }, [tab, onSignalsTabOpen]);

  return (
    <>
      <div className="mm-scrim" onClick={onClose} />
      <div className="mm-drawer" role="dialog" aria-label={`Edit ${merchant.canonicalName}`}>
        <div className="mm-drawer__head">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="mm-drawer__title">{merchant.canonicalName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span className={`mm-chip mm-tone--${v.tone}`}>
                  <span className="mm-dot" />
                  {v.label}
                </span>
                <span className="mm-sub">
                  {merchant.transactionCount} txns · {merchant.seenCount}× seen
                </span>
              </div>
            </div>
            <button type="button" className="mm-iconbtn" aria-label="Close" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
          <div className="mm-tabs">
            {(['overview', 'identifiers', 'aliases', 'signals'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? 'is-active' : ''}
                onClick={() => setTab(t)}
              >
                {t === 'overview'
                  ? 'Overview'
                  : t === 'identifiers'
                    ? 'Payment IDs'
                    : t === 'aliases'
                      ? 'Aliases'
                      : 'Signals'}
              </button>
            ))}
          </div>
        </div>

        <div className="mm-drawer__body">
          {tab === 'overview' && (
            <div className="mm-stack">
              <CoreFields m={merchant} editor={editor} systemCategories={systemCategories} />
            </div>
          )}
          {tab === 'identifiers' && <IdentifiersSection m={merchant} editor={editor} />}
          {tab === 'aliases' && <AliasesSection m={merchant} editor={editor} />}
          {tab === 'signals' && (
            <SignalsSection
              m={merchant}
              isLoading={signalsLoading}
              error={signalsError}
              onRetry={onSignalsRetry}
            />
          )}
        </div>

        <div className="mm-drawer__foot">
          <SaveActions
            onSave={onSave}
            onMerge={onMerge}
            onClose={onClose}
            saveError={saveError}
            showCancel
          />
        </div>
      </div>
    </>
  );
}

export function MerchantProfilePanel({
  merchant,
  editor,
  systemCategories,
  onSave,
  onMerge,
  saveError,
  onSignalsTabOpen,
  signalsLoading,
  signalsError,
  onSignalsRetry,
}: DetailPanelProps) {
  const v = VERIFICATION_META[merchant.verificationLevel];
  const av = avatarTone(merchant.id);

  useEffect(() => {
    onSignalsTabOpen?.();
  }, [onSignalsTabOpen]);

  return (
    <div className="mm-profile">
      <div className="mm-profile__head">
        <span className="mm-avatar mm-avatar--lg" style={{ background: av.bg, color: av.fg }}>
          {initials(merchant.canonicalName)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mm-drawer__title" style={{ fontSize: 24 }}>
            {merchant.canonicalName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span className={`mm-chip mm-tone--${v.tone}`}>
              <span className="mm-dot" />
              {v.label}
            </span>
            <span className="mm-sub">
              {merchant.category} · {merchant.type} · {merchant.transactionCount} txns · updated{' '}
              {merchant.updatedAt}
            </span>
          </div>
        </div>
        <div className="mm-stack" style={{ gap: 8, alignItems: 'stretch' }}>
          {saveError ? (
            <p style={{ fontSize: 13, color: 'var(--bad-text)', margin: 0 }}>{saveError}</p>
          ) : null}
          {onMerge ? (
            <button type="button" className="mm-btn mm-btn--secondary" onClick={onMerge}>
              Merge with another profile
            </button>
          ) : null}
          <button type="button" className="mm-btn mm-btn--dark" onClick={onSave}>
            Save profile
          </button>
        </div>
      </div>

      <div className="mm-profile__body">
        <div className="mm-section-card">
          <div className="mm-section-title" style={{ marginBottom: 18 }}>
            Core profile
          </div>
          <div className="mm-stack">
            <CoreFields m={merchant} editor={editor} systemCategories={systemCategories} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="mm-section-card">
            <IdentifiersSection m={merchant} editor={editor} />
          </div>
          <div className="mm-section-card">
            <AliasesSection m={merchant} editor={editor} />
          </div>
        </div>

        <div className="mm-section-card">
          <div className="mm-section-title" style={{ marginBottom: 18 }}>
            Signals &amp; usage
          </div>
          <SignalsSection
            m={merchant}
            isLoading={signalsLoading}
            error={signalsError}
            onRetry={onSignalsRetry}
          />
        </div>
      </div>
    </div>
  );
}
