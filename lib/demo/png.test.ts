import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { gradientPng } from "./png";

describe("gradientPng", () => {
  it("writes a well-formed RGB PNG of the requested size", () => {
    const png = gradientPng(16, [10, 20, 30], [200, 210, 220], [255, 255, 255]);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR: length(4) type(4) width(4) height(4) depth colour
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(16);
    expect(png.readUInt32BE(20)).toBe(16);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(2);
    expect(png.subarray(png.length - 8, png.length - 4).toString("ascii")).toBe("IEND");
  });

  it("encodes one filter byte plus RGB per row", () => {
    const size = 8;
    const png = gradientPng(size, [0, 0, 0], [255, 255, 255], [128, 128, 128]);
    const idatLength = png.readUInt32BE(33);
    expect(png.subarray(37, 41).toString("ascii")).toBe("IDAT");
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    expect(raw.length).toBe(size * (size * 3 + 1));
    expect(raw[0]).toBe(0);
    // top row is the top colour, bottom row the bottom colour (outside the disc)
    expect(raw[1]).toBe(0);
    expect(raw[(size - 1) * (size * 3 + 1) + 1]).toBe(255);
  });
});
