import { describe, expect, it } from "vitest";

import {
  hasActivityScope,
  mapStravaActivity,
  normalizeSportType,
  signState,
  verifyHandshake,
  verifyState,
  webhookEventKey,
} from "./rules";

describe("mapStravaActivity", () => {
  it("stores integers and the athlete's local calendar day", () => {
    const row = mapStravaActivity({
      id: 123456789,
      name: "  Morning Run ",
      sport_type: "Run",
      distance: 5012.7,
      moving_time: 1499.6,
      total_elevation_gain: 33.4,
      start_date: "2026-09-09T22:30:00Z",
      start_date_local: "2026-09-10T00:30:00Z",
      timezone: "(GMT+01:00) Europe/Podgorica",
    });
    expect(row).toEqual({
      source: "strava",
      external_id: "123456789",
      sport_type: "Run",
      name: "Morning Run",
      started_at: "2026-09-09T22:30:00.000Z",
      started_on: "2026-09-10",
      distance_m: 5013,
      moving_time_s: 1500,
      elevation_m: 33,
      is_manual: false,
    });
  });

  it("flags activities typed in by hand on Strava", () => {
    const row = mapStravaActivity({
      id: 1,
      type: "Run",
      distance: 5000,
      start_date: "2026-09-10T06:00:00Z",
      manual: true,
    });
    expect(row.is_manual).toBe(true);
  });

  it("falls back to type when sport_type is missing and never goes negative", () => {
    const row = mapStravaActivity({
      id: 1,
      type: "Trail Run",
      distance: -3,
      start_date: "2026-01-01T10:00:00Z",
    });
    expect(row.sport_type).toBe("TrailRun");
    expect(row.distance_m).toBe(0);
    expect(row.moving_time_s).toBe(0);
    expect(row.started_on).toBe("2026-01-01");
    expect(row.name).toBeNull();
  });

  it("normalises sport types with spaces", () => {
    expect(normalizeSportType({ sport_type: "Virtual Run" })).toBe("VirtualRun");
    expect(normalizeSportType({})).toBe("Workout");
  });
});

describe("webhookEventKey", () => {
  it("is stable per event and distinct per aspect and time", () => {
    const base = {
      object_type: "activity" as const,
      object_id: 42,
      aspect_type: "create" as const,
      owner_id: 7,
      subscription_id: 1,
      event_time: 1700000000,
    };
    expect(webhookEventKey(base)).toBe("strava:activity:42:create:1700000000");
    expect(webhookEventKey({ ...base, aspect_type: "update" })).not.toBe(webhookEventKey(base));
    expect(webhookEventKey({ ...base, event_time: 1700000001 })).not.toBe(webhookEventKey(base));
  });
});

describe("verifyHandshake", () => {
  const params = (token: string) =>
    new URLSearchParams({ "hub.mode": "subscribe", "hub.challenge": "abc", "hub.verify_token": token });

  it("echoes the challenge only for the configured token", () => {
    expect(verifyHandshake(params("secret"), "secret")).toEqual({ ok: true, challenge: "abc" });
    expect(verifyHandshake(params("wrong"), "secret")).toEqual({ ok: false });
    expect(verifyHandshake(params("secret"), "")).toEqual({ ok: false });
  });

  it("rejects other modes", () => {
    const p = params("secret");
    p.set("hub.mode", "unsubscribe");
    expect(verifyHandshake(p, "secret")).toEqual({ ok: false });
  });
});

describe("OAuth state", () => {
  const state = { userId: "u1", locale: "me", sharePublic: true, exp: 2_000_000_000 };

  it("round-trips a signed state", () => {
    const signed = signState(state, "k");
    expect(verifyState(signed, "k", 1_900_000_000)).toEqual(state);
  });

  it("rejects tampering, wrong keys and expiry", () => {
    const signed = signState(state, "k");
    expect(verifyState(signed, "other", 1_900_000_000)).toBeNull();
    expect(verifyState(`${signed}x`, "k", 1_900_000_000)).toBeNull();
    expect(verifyState(signed, "k", 2_100_000_000)).toBeNull();
    expect(verifyState(null, "k")).toBeNull();
  });
});

describe("hasActivityScope", () => {
  it("accepts either activity scope, comma or space separated", () => {
    expect(hasActivityScope("read,activity:read")).toBe(true);
    expect(hasActivityScope("read activity:read_all")).toBe(true);
    expect(hasActivityScope("read")).toBe(false);
    expect(hasActivityScope(null)).toBe(false);
  });
});
