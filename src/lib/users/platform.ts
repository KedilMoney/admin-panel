export type ClientPlatform = "Web" | "Android" | "iOS" | "Other";

export type PlatformFilter = "all" | "Web" | "Android" | "iOS";

export function platformLabel(
  platform: ClientPlatform | null | undefined
): string {
  return platform ?? "—";
}

export function filterUsersBySignupPlatform<
  T extends { signupPlatform?: ClientPlatform | null }
>(users: T[], filter: PlatformFilter): T[] {
  if (filter === "all") return users;
  return users.filter((user) => user.signupPlatform === filter);
}
