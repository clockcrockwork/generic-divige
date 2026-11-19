import { it, expect } from "vitest";
import {
  advanceClock,
  changeCountDuration,
  createClock,
} from "../../src/domain/countdown";
it("preparation has no elapsed time", () =>
  expect(advanceClock(createClock(1000), 90000).elapsed).toBe(0));
it("preserves fractional progress and settles old rate before tuning", () => {
  const c = { ...createClock(1000), lastMs: 0 };
  const next = changeCountDuration(c, 1500, 500);
  expect(next.elapsed).toBe(1.5);
  expect(advanceClock(next, 2000).elapsed).toBe(2.5);
});
it("caps at five and never returns time for a backward event", () => {
  const c = { ...createClock(1000), lastMs: 0 };
  const ended = advanceClock(c, 9000);
  expect(ended.elapsed).toBe(5);
  expect(advanceClock(ended, 100).elapsed).toBe(5);
});
it("clamps finite duration and rejects invalid numbers", () => {
  const c = createClock(1000);
  expect(changeCountDuration(c, 0, 10).durationMs).toBe(400);
  expect(changeCountDuration(c, 0, 9999).durationMs).toBe(2000);
  for (const n of [NaN, Infinity, -Infinity])
    expect(changeCountDuration(c, 0, n)).toEqual(c);
});
