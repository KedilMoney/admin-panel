export const SPECIALTY_CATALOG = [
  "Financial planning",
  "Investment advisory",
  "Mutual funds",
  "Insurance planning",
  "Fixed deposits",
  "Tax planning",
  "Retirement planning",
  "PMS & AIF",
  "Personal finance education",
  "NRI advisory",
] as const;

export function specialtyMatches(
  query: string,
  picked: string[],
  catalog: readonly string[] = SPECIALTY_CATALOG
): { suggestions: string[]; canCreate: boolean; createLabel: string } {
  const qq = query.trim().toLowerCase();
  if (!qq) return { suggestions: [], canCreate: false, createLabel: "" };
  const suggestions = catalog.filter(
    (item) => item.toLowerCase().includes(qq) && !picked.includes(item)
  );
  const canCreate =
    qq.length > 1 &&
    !catalog.some((item) => item.toLowerCase() === qq) &&
    !picked.some((item) => item.toLowerCase() === qq);
  return {
    suggestions,
    canCreate,
    createLabel: `Add "${query.trim()}"`,
  };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
