export function draftAdvisorName(payload: unknown): string {
  if (payload && typeof payload === "object" && "name" in payload) {
    const name = (payload as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "Untitled draft";
}

export function canPublishAdvisor(expert: { status?: string; isActive?: boolean }): boolean {
  return expert.status === "PENDING";
}
