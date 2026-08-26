"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search issuers",
  ariaLabel,
  triggerRef,
  disabled,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel: string;
  triggerRef?: (el: HTMLButtonElement | null) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    setActive(0);
  }, [open]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(option: string) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((next) => !next)}
        className={cn(
          "flex box-border h-11 w-full items-center justify-between border-0 border-b border-[var(--border)] bg-transparent px-0.5 text-left text-[15px] font-normal text-[var(--foreground)] outline-none",
          "focus-visible:border-green-600"
        )}
      >
        <span className={value ? "" : "text-[var(--muted-foreground)]"}>{value || placeholder}</span>
      </button>
      {open ? (
        <div className="absolute top-12 right-0 left-0 z-10 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--card)] shadow-[0_4px_12px_rgba(10,14,30,0.10)]">
          <input
            ref={searchRef}
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[active]) choose(filtered[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className="h-10 w-full border-0 border-b border-[var(--border)] bg-transparent px-3 text-[14px] outline-none"
          />
          <ul id={listId} role="listbox" className="max-h-[230px] overflow-y-auto p-1">
            {filtered.map((option, index) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    "block w-full rounded-[5px] px-3 py-2.5 text-left text-[14px] text-[var(--foreground)]",
                    index === active ? "bg-[var(--muted)]" : ""
                  )}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
