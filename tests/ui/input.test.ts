import { it, expect } from "vitest";
import { hitSlot, acceptsPointer } from "../../src/ui/input";
import { Metrics } from "../../src/ui/metrics";
it("expanded hit areas use nearest center then stable index", () => {
  const rects = [
    { left: 0, top: 0, width: 50, height: 50 },
    { left: 60, top: 0, width: 50, height: 50 },
  ];
  expect(hitSlot(-12, 25, rects)).toBe(0);
  expect(hitSlot(-13, 25, rects)).toBe(-1);
  expect(hitSlot(55, 25, rects)).toBe(0);
  expect(hitSlot(56, 25, rects)).toBe(1);
});
it("owns only a primary left pointer", () => {
  expect(acceptsPointer(true, 0, false)).toBe(true);
  expect(acceptsPointer(false, 0, false)).toBe(false);
  expect(acceptsPointer(true, 2, false)).toBe(false);
  expect(acceptsPointer(true, 0, true)).toBe(false);
});
it("metrics stay bounded and ignore nonfinite samples", () => {
  const m = new Metrics();
  for (let i = 0; i < 200; i++) m.record("up → commit", i);
  m.record("up → commit", NaN);
  expect(m.summary()[0]).toMatchObject({ count: 120, min: 80, max: 199 });
});
