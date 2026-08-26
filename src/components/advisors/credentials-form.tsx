"use client";

import { Plus, X } from "lucide-react";
import {
  CREDENTIAL_ISSUERS,
  emptyCredential,
  numberPlaceholder,
  type Credential,
} from "@/lib/advisors/credentials";

const ISSUERS = CREDENTIAL_ISSUERS.filter((issuer) => issuer !== "Other");

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-[var(--muted-foreground)] md:hidden">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {optional ? <span className="font-normal"> · optional</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600 focus:ring-1 focus:ring-green-600 disabled:opacity-50";

export function CredentialsForm({
  rows,
  onChange,
  disabled,
}: {
  rows: Credential[];
  onChange: (next: Credential[]) => void;
  disabled?: boolean;
}) {
  function patch(id: string, next: Partial<Credential>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  function remove(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((row) => row.id !== id));
  }

  function add() {
    onChange([...rows, emptyCredential(`cred-${Date.now()}`)]);
  }

  return (
    <div className="flex flex-col gap-3 pt-3.5">
      <p className="text-[12px] leading-[1.5] text-[var(--muted-foreground)]">
        One row per registration or qualification. Type to search issuers, or enter your own.
      </p>

      <div className="hidden gap-3 px-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_40px]">
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Issued by <span className="text-red-500">*</span>
        </span>
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Registered as <span className="text-red-500">*</span>
        </span>
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Registration number <span className="font-normal">· optional</span>
        </span>
        <span />
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_40px]"
        >
          <Field label="Issued by" required>
            <input
              list={`issuer-list-${row.id}`}
              value={row.issuer === "Other" ? "" : row.issuer}
              placeholder="SEBI, AMFI, NISM…"
              disabled={disabled}
              aria-label={`Issued by, row ${index + 1}`}
              onChange={(e) => patch(row.id, { issuer: e.target.value })}
              className={inputClass}
            />
            <datalist id={`issuer-list-${row.id}`}>
              {ISSUERS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Registered as" required>
            <input
              value={row.role}
              placeholder="e.g. Investment Adviser"
              disabled={disabled}
              aria-label={`Registered as, row ${index + 1}`}
              onChange={(e) => patch(row.id, { role: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Registration number" optional>
            <input
              value={row.number ?? ""}
              placeholder={numberPlaceholder(row.issuer)}
              disabled={disabled}
              aria-label={`Registration number, row ${index + 1}`}
              onChange={(e) => patch(row.id, { number: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <button
            type="button"
            aria-label="Remove credential"
            disabled={disabled || rows.length === 1}
            onClick={() => remove(row.id)}
            className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-500 disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-[var(--foreground)] hover:text-green-700"
      >
        <Plus className="size-[15px]" />
        Add credential
      </button>
    </div>
  );
}
