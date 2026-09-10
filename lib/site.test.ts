import { describe, expect, it } from "vitest";

import { canonicalRedirect, strayAuthCodeRedirect } from "./site";

describe("canonicalRedirect", () => {
  const base = {
    canonicalOrigin: "https://www.santamore.me",
    pathname: "/en/dashboard/strava",
    search: "?strava=ok",
    production: true,
  };

  it("sends aliases to the canonical host, keeping path and query", () => {
    expect(canonicalRedirect({ ...base, host: "santamore.vercel.app" })).toBe(
      "https://www.santamore.me/en/dashboard/strava?strava=ok",
    );
    expect(canonicalRedirect({ ...base, host: "santamore.me" })).toBe(
      "https://www.santamore.me/en/dashboard/strava?strava=ok",
    );
  });

  it("serves the canonical host itself, case-insensitively", () => {
    expect(canonicalRedirect({ ...base, host: "www.santamore.me" })).toBeNull();
    expect(canonicalRedirect({ ...base, host: "WWW.Santamore.me" })).toBeNull();
  });

  it("leaves previews, local dev and unknown hosts alone", () => {
    expect(canonicalRedirect({ ...base, host: "santamore-git-x.vercel.app", production: false })).toBeNull();
    expect(canonicalRedirect({ ...base, canonicalOrigin: "http://localhost:3000", host: "127.0.0.1:3000" })).toBeNull();
    expect(canonicalRedirect({ ...base, canonicalOrigin: "not a url", host: "x" })).toBeNull();
    expect(canonicalRedirect({ ...base, host: null })).toBeNull();
  });
});

describe("strayAuthCodeRedirect", () => {
  const code = "7d1c6b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

  it("routes a Supabase auth code that landed on a page to the exchange route", () => {
    expect(strayAuthCodeRedirect({ pathname: "/en", code, locale: "en" })).toBe(
      `/api/auth/callback?code=${code}&next=%2Fen%2Fdashboard`,
    );
  });

  it("ignores other code parameters and API paths", () => {
    expect(strayAuthCodeRedirect({ pathname: "/en", code: "ABC123", locale: "en" })).toBeNull();
    expect(strayAuthCodeRedirect({ pathname: "/en", code: null, locale: "en" })).toBeNull();
    expect(strayAuthCodeRedirect({ pathname: "/api/x", code, locale: "en" })).toBeNull();
  });
});
