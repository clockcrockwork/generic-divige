import { it, expect } from "vitest";
import { createGame, drop, settle, tune } from "../../src/domain/game";
import { scenarios } from "../../src/scenarios";
it("invalid drops and preparation do not start; accepted starts once", () => {
  let g = createGame(scenarios[0]);
  expect(settle(g, 50000).clock.lastMs).toBe(null);
  expect(drop(g, ["bad"], 0, 50000).clock.lastMs).toBe(null);
  g = drop(g, [g.round.hand[0].id], 0, 100);
  expect(g.clock.lastMs).toBe(100);
  g = drop(g, [g.round.hand[0].id], 0, 1100);
  expect(g.clock.elapsed).toBe(1);
});
it("accepts 4.999 counts and rejects exactly 5 before render", () => {
  const base = createGame(scenarios[0]);
  const g = drop(base, [base.round.hand[0].id], 0, 0);
  expect(drop(g, [g.round.hand[0].id], 0, 4999).round.cursor).toBe(2);
  const ended = drop(g, [g.round.hand[0].id], 0, 5000);
  expect(ended.round.cursor).toBe(1);
  expect(ended.finished).toBe(true);
  expect(settle(ended, 9000)).toBe(ended);
});
it("live tuning settles previous rate and background gap ends once", () => {
  const base = createGame(scenarios[0]);
  const g = tune(drop(base, [base.round.hand[0].id], 0, 0), 1500, 2000);
  expect(g.clock.elapsed).toBe(1.5);
  expect(settle(g, 8500).finished).toBe(true);
});
