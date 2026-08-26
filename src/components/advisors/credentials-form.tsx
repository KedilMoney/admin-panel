"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  CREDENTIAL_ISSUERS,
  emptyCredential,
  numberPlaceholder,
  selectIssuerValue,
  type Credential,
} from "@/lib/advisors/credentials";
import { SearchSelect } from "./search-select";

const GRID =
  "grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,1fr)_32px] items-center gap-x-4 gap-y-2";

export function CredentialsForm({
  rows,
  onChange,
  disabled,
}: {
  rows: Credential[];
  onChange: (next: Credential[]) => void;
  disabled?: boolean;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function patch(id: string, next: Partial<Credential>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  function remove(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((row) => row.id !== id));
  }

  function add() {
    const id = `cred-${Date.now()}`;
    onChange([...rows, emptyCredential(id)]);
    setFocusId(id);
  }

  return (
    <div className="flex flex-col gap-4 pt-3.5">
      <p className="max-w-[620px] text-[12px] leading-[1.5] text-[var(--muted-foreground)]">
        Add any registration, licence, or qualification they hold. Kedil does not verify these — they
        appear on the profile as stated.
      </p>

      <div className={GRID}>
        <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Issued by <span className="text-red-500">*</span>
        </div>
        <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Registered as <span className="text-red-500">*</span>
        </div>
        <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">
          Registration number <span className="font-normal"> · optional</span>
        </div>
        <div />

        {rows.map((row, index) => {
          const selected = selectIssuerValue(row.issuer);
          return (
            <div key={row.id} className="contents">
              <div>
                <SearchSelect
                  options={CREDENTIAL_ISSUERS}
                  value={selected}
                  placeholder="Select"
                  searchPlaceholder="Search issuers"
                  ariaLabel={`Issued by, row ${index + 1}`}
                  disabled={disabled}
                  triggerRef={(el) => {
                    triggerRefs.current[row.id] = el;
                    if (focusId === row.id) el?.focus();
                  }}
                  onChange={(next) => {
                    patch(row.id, { issuer: next === "Other" ? "Other" : next });
                  }}
                />
                {selected === "Other" ? (
                  <input
                    value={row.issuer === "Other" ? "" : row.issuer}
                    placeholder="Issuer name"
                    disabled={disabled}
                    aria-label={`Issuer name, row ${index + 1}`}
                    onChange={(e) => patch(row.id, { issuer: e.target.value || "Other" })}
                    className="mt-1 box-border h-11 w-full border-0 border-b border-[var(--border)] bg-transparent px-0.5 text-[15px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600"
                  />
                ) : null}
              </div>
              <input
                value={row.role}
                placeholder="e.g. Investment Adviser"
                disabled={disabled}
                aria-label={`Registered as, row ${index + 1}`}
                onChange={(e) => patch(row.id, { role: e.target.value })}
                className="box-border h-11 w-full border-0 border-b border-[var(--border)] bg-transparent px-0.5 text-[15px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600"
              />
              <input
                value={row.number ?? ""}
                placeholder={numberPlaceholder(selected === "Other" ? "" : selected)}
                disabled={disabled}
                aria-label={`Registration number, row ${index + 1}`}
                onChange={(e) => patch(row.id, { number: e.target.value })}
                className="box-border h-11 w-full border-0 border-b border-[var(--border)] bg-transparent px-0.5 text-[15px] tabular-nums outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600"
              />
              <button
                type="button"
                aria-label="Remove credential"
                disabled={disabled || rows.length === 1}
                onClick={() => remove(row.id)}
                className="flex size-8 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-500 disabled:opacity-40"
              >
                <X className="size-[15px]" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start pt-0.5 text-[13px] font-semibold text-[var(--foreground)] hover:text-green-700"
      >
        <Plus className="size-[15px]" />
        Add credential
      </button>
    </div>
  );
}
