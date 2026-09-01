import { describe, expect, it } from "vitest";

import { formatMetricValue, metricValue } from "@/lib/metrics";

describe("formatMetricValue", () => {
  it("formats distance to one decimal with the locale separator", () => {
    expect(formatMetricValue(12345, "distance_m", "me")).toBe("12,3 km");
    expect(formatMetricValue(12345, "distance_m", "en")).toBe("12.3 km");
    expect(formatMetricValue(5000, "distance_m", "me")).toBe("5 km");
    expect(formatMetricValue(0, "distance_m", "me")).toBe("0 km");
    // 12.35 km rounds to 12.4 (nearest tenth)
    expect(formatMetricValue(12350, "distance_m", "en")).toBe("12.4 km");
  });

  it("formats moving time as h/min", () => {
    expect(formatMetricValue(12240, "moving_time_s", "me")).toBe("3 h 24 min");
    expect(formatMetricValue(1500, "moving_time_s", "me")).toBe("25 min");
    expect(formatMetricValue(0, "moving_time_s", "me")).toBe("0 min");
  });

  it("formats count and elevation", () => {
    expect(formatMetricValue(18, "activity_count", "me")).toBe("18×");
    expect(formatMetricValue(1240, "elevation_m", "me")).toBe("1240 m");
  });
});

describe("metricValue", () => {
  it("picks the declared metric from the totals row", () => {
    const totals = {
      distance_m: 1,
      moving_time_s: 2,
      activity_count: 3,
      elevation_m: 4,
    };
    expect(metricValue(totals, "activity_count")).toBe(3);
    expect(metricValue(totals, "elevation_m")).toBe(4);
  });
});
