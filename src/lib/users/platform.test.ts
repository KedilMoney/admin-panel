import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterUsersBySignupPlatform, platformLabel } from "./platform.ts";

describe("platformLabel", () => {
  it("renders an em dash when platform is missing", () => {
    assert.equal(platformLabel(null), "—");
    assert.equal(platformLabel(undefined), "—");
  });

  it("returns the platform name when present", () => {
    assert.equal(platformLabel("Web"), "Web");
    assert.equal(platformLabel("Android"), "Android");
    assert.equal(platformLabel("iOS"), "iOS");
    assert.equal(platformLabel("Other"), "Other");
  });
});

describe("filterUsersBySignupPlatform", () => {
  const users = [
    { email: "web@kedil.com", username: "webuser", signupPlatform: "Web" as const },
    { email: "android@kedil.com", username: "droid", signupPlatform: "Android" as const },
    { email: "ios@kedil.com", username: "iphone", signupPlatform: "iOS" as const },
    { email: "none@kedil.com", username: "ghost", signupPlatform: null },
  ];

  it("returns all users when filter is all", () => {
    assert.equal(filterUsersBySignupPlatform(users, "all").length, 4);
  });

  it("filters to Android signups only", () => {
    const filtered = filterUsersBySignupPlatform(users, "Android");
    assert.deepEqual(
      filtered.map((u) => u.email),
      ["android@kedil.com"]
    );
  });

  it("composes with a search query on the already-filtered set", () => {
    const androidOnly = filterUsersBySignupPlatform(users, "Android");
    const searched = androidOnly.filter(
      (u) =>
        u.email.includes("android") || u.username.includes("android")
    );
    assert.equal(searched.length, 1);
    assert.equal(searched[0].email, "android@kedil.com");
  });
});
