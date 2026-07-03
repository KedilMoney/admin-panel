'use client';

import { useMemo, useState } from 'react';
import type { MerchantAliasCleanupAction, MerchantAliasCleanupResult } from '@/types';

type CleanupFilter = 'all' | 'update' | 'merge' | 'delete';

const FILTER_LABELS: Record<CleanupFilter, string> = {
  all: 'All changes',
  update: 'Renames',
  merge: 'Duplicates',
  delete: 'Junk',
};

function actionId(action: MerchantAliasCleanupAction): string {
  if (action.type === 'merge') return action.sourceAliasId ?? action.aliasId ?? action.rawName;
  return action.aliasId ?? action.rawName;
}

function actionKind(action: MerchantAliasCleanupAction): CleanupFilter {
  if (action.type === 'merge') return 'merge';
  if (action.type === 'delete') return 'delete';
  return 'update';
}

function actionLabel(action: MerchantAliasCleanupAction): string {
  if (action.type === 'delete') return 'Remove junk alias';
  if (action.type === 'merge') return 'Merge into existing alias';
  return 'Rename alias';
}

function reasonText(action: MerchantAliasCleanupAction): string {
  if (action.reasons.length === 0) return 'Looks like bank-statement noise';
  const labels: Record<string, string> = {
    payment_reference: 'Contains a payment reference number',
    upi_handle: 'Contains a UPI handle',
    bank_or_payment_noise: 'Contains bank/payment boilerplate',
    only_noise: 'No merchant name left after cleanup',
    too_short: 'Too short to be a useful alias',
    normalized: 'Cleaned up formatting',
  };
  return action.reasons.map((reason) => labels[reason] ?? reason).join(' · ');
}

export interface MerchantAliasCleanupPanelProps {
  report: MerchantAliasCleanupResult | null;
  isRunning: boolean;
  error: string;
  onRunDryScan: () => void;
  onApply: (skipAliasIds: string[]) => void;
}

export function MerchantAliasCleanupPanel({
  report,
  isRunning,
  error,
  onRunDryScan,
  onApply,
}: MerchantAliasCleanupPanelProps) {
  const [filter, setFilter] = useState<CleanupFilter>('all');
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [showReview, setShowReview] = useState(false);

  const changes =
    report?.changes ??
    [
      ...(report?.samples.normalized ?? []),
      ...(report?.samples.merged ?? []),
      ...(report?.samples.deleted ?? []),
      ...(report?.samples.ambiguous ?? []),
    ];

  const visibleChanges = useMemo(() => {
    if (filter === 'all') return changes;
    return changes.filter((action) => actionKind(action) === filter);
  }, [changes, filter]);

  const selectedCount = useMemo(() => {
    return changes.filter((action) => !skippedIds.has(actionId(action))).length;
  }, [changes, skippedIds]);

  const skippedCount = changes.length - selectedCount;

  const toggleSkip = (id: string) => {
    setSkippedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDryScan = () => {
    setSkippedIds(new Set());
    setShowReview(false);
    onRunDryScan();
  };

  const handleApply = () => {
    onApply([...skippedIds]);
  };

  const summary = report?.summary;

  return (
    <section className="mm-maintenance" aria-label="Merchant alias cleanup">
      <div>
        <div className="mm-maintenance__title">Alias cleanup</div>
        <div className="mm-maintenance__copy">
          Aliases are the raw names saved from bank statements. This tool finds payment IDs, UPI
          handles, and descriptor noise, then suggests cleaner aliases for the same merchant.
        </div>
      </div>
      <div className="mm-maintenance__actions">
        <button
          type="button"
          className="mm-btn mm-btn--secondary"
          disabled={isRunning}
          onClick={handleDryScan}
        >
          {isRunning ? 'Running...' : 'Run dry scan'}
        </button>
        <button
          type="button"
          className="mm-btn mm-btn--dark"
          disabled={isRunning || !report || selectedCount === 0}
          onClick={handleApply}
        >
          Apply {selectedCount} change{selectedCount === 1 ? '' : 's'}
        </button>
      </div>

      {error ? <div className="mm-maintenance__error">{error}</div> : null}

      {report && summary ? (
        <div className="mm-cleanup-report">
          <div className="mm-cleanup-report__meta">
            Last run: {report.mode === 'apply' ? 'applied' : 'dry scan only — nothing changed yet'}
          </div>

          <div className="mm-cleanup-explainer">
            <p>
              Scanned <strong>{summary.scanned}</strong> aliases across all merchants.{' '}
              <strong>{summary.kept}</strong> already look fine and will be left alone.
            </p>
            <ul>
              <li>
                <strong>{summary.normalized}</strong> messy aliases would be renamed to a cleaner
                merchant name
              </li>
              <li>
                <strong>{summary.merged}</strong> duplicate aliases would fold into an existing
                alias for the same merchant
              </li>
              <li>
                <strong>{summary.deleted}</strong> junk-only aliases would be removed entirely
              </li>
            </ul>
            <p className="mm-cleanup-explainer__hint">
              Uncheck any row below to skip it. Skipped items will not be changed when you apply.
            </p>
          </div>

          <div className="mm-cleanup-summary">
            <span>{summary.scanned} scanned</span>
            <span>{summary.normalized} renames</span>
            <span>{summary.merged} merges</span>
            <span>{summary.deleted} deletes</span>
            {skippedCount > 0 ? <span>{skippedCount} skipped</span> : null}
          </div>

          <div className="mm-cleanup-review-toolbar">
            <div className="mm-seg">
              {(Object.keys(FILTER_LABELS) as CleanupFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={filter === key ? 'is-active' : ''}
                  onClick={() => setFilter(key)}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mm-btn mm-btn--secondary"
              onClick={() => setShowReview((current) => !current)}
            >
              {showReview ? 'Hide review table' : `Review ${changes.length} proposed changes`}
            </button>
          </div>

          {showReview ? (
            <div className="mm-cleanup-table-wrap">
              <table className="mm-cleanup-table">
                <thead>
                  <tr>
                    <th>Apply</th>
                    <th>Merchant</th>
                    <th>Action</th>
                    <th>Current alias (from bank)</th>
                    <th>Proposed alias</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleChanges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="mm-cleanup-table__empty">
                        No changes in this filter.
                      </td>
                    </tr>
                  ) : (
                    visibleChanges.map((action) => {
                      const id = actionId(action);
                      const selected = !skippedIds.has(id);
                      return (
                        <tr key={id} className={selected ? '' : 'is-skipped'}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected}
                              aria-label={`Apply ${actionLabel(action)}`}
                              onChange={() => toggleSkip(id)}
                            />
                          </td>
                          <td>{action.merchantName ?? 'Unknown merchant'}</td>
                          <td>{actionLabel(action)}</td>
                          <td className="mm-cleanup-table__mono">{action.rawName}</td>
                          <td className="mm-cleanup-table__mono">
                            {action.type === 'delete' ? '— remove —' : action.sanitizedName}
                          </td>
                          <td>{reasonText(action)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
