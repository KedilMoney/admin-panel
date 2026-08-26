"use client";

import { useMemo, useState } from "react";
import { User, X } from "lucide-react";
import { CredentialsForm } from "@/components/advisors/credentials-form";
import { specialtyMatches } from "@/lib/advisors/specialties";
import type { ExpertFormData } from "@/types";

function underlineClass() {
  return "h-10 w-full border-0 border-b border-[var(--border)] bg-transparent px-0.5 text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600 disabled:opacity-50";
}

function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
      {label}{" "}
      {required ? (
        <span className="text-red-500">*</span>
      ) : (
        <span className="font-normal">· optional</span>
      )}
      {hint ? <span className="font-normal"> {hint}</span> : null}
    </span>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
        {subtitle ? (
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdvisorFormFields({
  form,
  set,
  disabled,
  photoPreview,
  photoInputRef,
  onPhotoChange,
  onRemovePhoto,
}: {
  form: ExpertFormData;
  set: <K extends keyof ExpertFormData>(field: K, value: ExpertFormData[K]) => void;
  disabled?: boolean;
  photoPreview: string;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
}) {
  const [query, setQuery] = useState("");
  const match = useMemo(
    () => specialtyMatches(query, form.specialisation),
    [query, form.specialisation]
  );
  const showSuggest =
    query.trim().length > 0 && (match.suggestions.length > 0 || match.canCreate);

  return (
    <div className="flex flex-col gap-5">
      <Section title="About you" subtitle="Step 1 of 5">
        <div className="grid grid-cols-1 gap-4 pt-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Full name" required />
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="One-line headline" required />
            <input
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              required
              disabled={disabled}
              placeholder="Investments & insurance"
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Years advising" required />
            <input
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
              type="number"
              min={0}
              max={80}
              required
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Cities you meet clients in" required hint="(comma-separated)" />
            <input
              value={form.cities}
              onChange={(e) => set("cities", e.target.value)}
              required
              disabled={disabled}
              placeholder="Madurai, Chennai"
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Languages" required hint="(comma-separated)" />
            <input
              value={form.languages}
              onChange={(e) => set("languages", e.target.value)}
              required
              disabled={disabled}
              placeholder="Tamil, English"
              className={underlineClass()}
            />
          </label>
          <label className="flex cursor-pointer flex-col gap-1.5 sm:col-span-2">
            <FieldLabel label="Profile photo" />
            <span className="flex min-h-[88px] items-center gap-4 rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-4 py-4">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--muted)]">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                ) : (
                  <User className="size-7 text-[var(--muted-foreground)]" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[var(--foreground)]">Choose file</span>
                <span className="text-[12px] text-[var(--muted-foreground)]">PNG or JPG, up to 5 MB</span>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemovePhoto();
                    }}
                    className="mt-1 self-start text-xs text-red-500 hover:text-red-700"
                  >
                    Remove photo
                  </button>
                ) : null}
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled}
                onChange={onPhotoChange}
              />
            </span>
          </label>
        </div>
      </Section>

      <Section title="What you help with" subtitle="Step 2 of 5">
        <div className="flex flex-col gap-2 pt-3.5">
          <FieldLabel label="Your specialties" required hint="— type to search or add your own" />
          <div className="flex flex-wrap gap-1.5">
            {form.specialisation.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-[7px] rounded-full bg-green-100 py-1.5 pr-2 pl-3 text-[13px] font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  disabled={disabled}
                  onClick={() =>
                    set(
                      "specialisation",
                      form.specialisation.filter((item) => item !== tag)
                    )
                  }
                  className="flex size-[18px] items-center justify-center opacity-65 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
            {showSuggest ? (
              <div className="absolute top-12 right-0 left-0 z-[5] max-h-[230px] overflow-y-auto rounded-[7px] border border-[var(--border)] bg-[var(--card)] p-1 shadow-[0_4px_12px_rgba(10,14,30,0.10)]">
                {match.suggestions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      set("specialisation", [...form.specialisation, label]);
                      setQuery("");
                    }}
                    className="block w-full rounded-[5px] px-3 py-2.5 text-left text-[14px] hover:bg-[var(--muted)]"
                  >
                    {label}
                  </button>
                ))}
                {match.canCreate ? (
                  <button
                    type="button"
                    onClick={() => {
                      set("specialisation", [...form.specialisation, query.trim()]);
                      setQuery("");
                    }}
                    className="block w-full rounded-[5px] px-3 py-2.5 text-left text-[14px] font-semibold text-green-700 hover:bg-green-50"
                  >
                    {match.createLabel}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="About your practice">
        <label className="flex flex-col gap-1.5 pt-3.5">
          <FieldLabel label="About your practice" required />
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            required
            disabled={disabled}
            rows={5}
            className={`${underlineClass()} h-auto min-h-[120px] py-2`}
          />
        </label>
      </Section>

      <Section title="Your fees" subtitle="Step 3 of 5">
        <p className="pt-3.5 text-[13px] text-[var(--muted-foreground)]">
          Fill in the ways they actually charge — at least one.
          <span className="text-red-500">*</span>
        </p>
        {[
          {
            name: "fixedFee" as const,
            label: "Fixed fee",
            hint: "One-time plan or review",
            prefix: "₹",
            suffix: "per plan",
            placeholder: "5000",
          },
          {
            name: "auaPercent" as const,
            label: "AUA-based",
            hint: "Share of assets under advice",
            prefix: "",
            suffix: "% p.a.",
            placeholder: "1.0",
          },
          {
            name: "consultationFee" as const,
            label: "Consultation",
            hint: "Per session or follow-up",
            prefix: "₹",
            suffix: "per session",
            placeholder: "2500",
          },
        ].map((fee) => (
          <div
            key={fee.name}
            className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-4"
          >
            <div>
              <div className="text-[14px] font-semibold text-[var(--foreground)]">{fee.label}</div>
              <div className="text-[12px] text-[var(--muted-foreground)]">{fee.hint}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="w-3.5 text-[14px]">{fee.prefix}</span>
              <input
                inputMode="decimal"
                placeholder={fee.placeholder}
                disabled={disabled}
                value={form[fee.name]}
                onChange={(e) => set(fee.name, e.target.value)}
                className="w-[150px] border-0 border-b border-[var(--border)] bg-transparent text-right text-[14px] tabular-nums outline-none placeholder:text-[var(--muted-foreground)] focus:border-green-600"
              />
              <span className="w-[84px] text-[14px] text-[var(--muted-foreground)]">{fee.suffix}</span>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <span className="text-[14px] font-semibold text-[var(--foreground)]">
            Do they offer a free first session? <span className="text-red-500">*</span>
          </span>
          <div className="flex rounded-full bg-[var(--muted)] p-0.5">
            {(["Yes", "No"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => set("freeSession", option)}
                className={`h-8 rounded-full px-4 text-[13px] font-semibold ${
                  form.freeSession === option
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Credentials" subtitle="Step 4 of 5">
        <CredentialsForm
          rows={form.credentials}
          onChange={(next) => set("credentials", next)}
          disabled={disabled}
        />
      </Section>

      <Section title="How clients reach you" subtitle="Step 5 of 5">
        <p className="pt-3.5 text-[13px] text-[var(--muted-foreground)]">
          Fill in only what they actually use. Whatever you leave blank will not appear on the profile.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Phone" />
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="WhatsApp" />
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Email" required />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel label="Website" />
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <FieldLabel label="Enquiry form URL" />
            <input
              value={form.enquiryFormUrl}
              onChange={(e) => set("enquiryFormUrl", e.target.value)}
              disabled={disabled}
              className={underlineClass()}
            />
          </label>
        </div>
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Where they publish</div>
          <div className="text-[12px] text-[var(--muted-foreground)]">
            Optional, but clients use these to judge how they explain things
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                ["youtube", "YouTube"],
                ["instagram", "Instagram"],
                ["linkedin", "LinkedIn"],
                ["facebook", "Facebook"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="flex flex-col gap-1.5">
                <FieldLabel label={label} />
                <input
                  value={form[name]}
                  onChange={(e) => set(name, e.target.value)}
                  disabled={disabled}
                  className={underlineClass()}
                />
              </label>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
