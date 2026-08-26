export const CREDENTIAL_ISSUERS = [
  "SEBI",
  "AMFI",
  "NISM",
  "APMI",
  "IRDAI",
  "PFRDA",
  "RBI",
  "IBBI",
  "ICAI",
  "ICSI",
  "ICMAI",
  "FPSB India",
  "CFA Institute",
  "Other",
] as const;

export type Credential = {
  id: string;
  issuer: string;
  role: string;
  number?: string;
};

const NUMBER_PLACEHOLDERS: Record<string, string> = {
  SEBI: "INA000012345",
  AMFI: "ARN-113075",
  APMI: "APRN09158",
  IRDAI: "Agent code",
};

export function isValidCredential(row: Credential): boolean {
  const issuer = row.issuer.trim();
  const role = row.role.trim();
  return issuer.length > 0 && issuer !== "Other" && role.length > 0;
}

export function validCredentials(rows: Credential[]): Credential[] {
  return rows.filter(isValidCredential).map((row) => ({
    ...row,
    issuer: row.issuer.trim(),
    role: row.role.trim(),
    number: row.number?.trim() ? row.number.trim() : undefined,
  }));
}

export function numberPlaceholder(issuer: string): string {
  return NUMBER_PLACEHOLDERS[issuer] ?? "Optional";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function issuerSelectValue(issuer: string): string {
  const trimmed = issuer.trim();
  if (!trimmed) return "";
  if (CREDENTIAL_ISSUERS.includes(trimmed as (typeof CREDENTIAL_ISSUERS)[number])) {
    return trimmed;
  }
  return "Other";
}

export function parseAdvisorCredentials(
  rawCredentials: unknown,
  rawRegistrations?: unknown
): Credential[] {
  const creds = Array.isArray(rawCredentials) ? rawCredentials : [];
  const fromNew: Credential[] = [];
  for (const [index, row] of creds.entries()) {
    const record = asRecord(row);
    if (!record) continue;
    const issuer = asText(record.issuer);
    const role = asText(record.role);
    if (!issuer && !role) continue;
    fromNew.push({
      id: asText(record.id) || `legacy-${index}`,
      issuer,
      role,
      ...(asText(record.number) ? { number: asText(record.number) } : {}),
    });
  }

  if (fromNew.some((row) => row.issuer && row.role)) {
    return fromNew;
  }

  const fromLegacyCreds: Credential[] = [];
  for (const [index, row] of creds.entries()) {
    const record = asRecord(row);
    if (!record) continue;
    const issuer = asText(record.name);
    const role = asText(record.meta) || issuer;
    if (!issuer) continue;
    fromLegacyCreds.push({ id: `legacy-${index}`, issuer, role });
  }

  const fromLegacyRegs: Credential[] = [];
  const regs = Array.isArray(rawRegistrations) ? rawRegistrations : [];
  for (const [index, row] of regs.entries()) {
    const record = asRecord(row);
    if (!record) continue;
    const role = asText(record.label);
    const number = asText(record.value);
    if (!role && !number) continue;
    fromLegacyRegs.push({
      id: `legacy-reg-${index}`,
      issuer: role,
      role: role || "Registration",
      ...(number ? { number } : {}),
    });
  }

  const merged = [...fromLegacyCreds, ...fromLegacyRegs];
  return merged.length > 0 ? merged : [{ id: "cred-1", issuer: "", role: "", number: "" }];
}

export function emptyCredential(id: string): Credential {
  return { id, issuer: "", role: "", number: "" };
}
