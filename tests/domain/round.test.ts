import { describe, it, expect } from "vitest";
import {
  createRound,
  commitPanels,
  reorderHand,
  recipes,
  adjacentRun,
} from "../../src/domain/round";
import { scenarios } from "../../src/scenarios";
const drop = (
  s: ReturnType<typeof createRound>,
  indexes: number[],
  slot: number,
) =>
  commitPanels(
    s,
    indexes.map((i) => s.hand[i].id),
    slot,
  );
describe("round", () => {
  it("starts with five stable panels and empty slots", () => {
    const a = createRound(scenarios[0]);
    expect(a.hand).toHaveLength(5);
    expect(a.slots).toEqual([[], [], [], [], []]);
    expect(a).toEqual(createRound(scenarios[0]));
  });
  it("selects contiguous runs, not matches across gaps", () => {
    const s = createRound(scenarios[1]);
    expect(adjacentRun(s.hand, s.hand[0].id)).toEqual([s.hand[0].id]);
    const a = createRound(scenarios[0]);
    expect(adjacentRun(a.hand, a.hand[1].id)).toEqual(
      a.hand.slice(0, 2).map((p) => p.id),
    );
  });
  it("reorders without consuming or changing panel multiset", () => {
    const s = createRound(scenarios[0]);
    const r = reorderHand(s, [s.hand[0].id, s.hand[1].id], 5);
    expect(r.hand.map((p) => p.type)).toEqual(["B", "C", "D", "A", "A"]);
    expect(r.cursor).toBe(0);
    expect([...r.hand].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...s.hand].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
  it.each([0, 1, 2, 3, 4, 5])("derives disjoint attack pairs for %i", (n) => {
    expect(
      recipes(
        Array.from({ length: n }, (_, i) => ({
          id: String(i),
          type: "A" as const,
        })),
      ).attacks.A,
    ).toBe(Math.floor(n / 2));
  });
  it.each([1, 2, 3, 4, 5])("healing has one role at tier %i", (n) => {
    const r = recipes(
      Array.from({ length: n }, (_, i) => ({
        id: String(i),
        type: "H" as const,
      })),
    );
    expect(r.heal).toBe(n);
    expect(r.combo).toBe(1);
  });
  it("counts colors independently", () => {
    expect(
      recipes(
        ["A", "B", "A", "B", "H"].map((type, i) => ({
          id: String(i),
          type: type as "A",
        })),
      ),
    ).toMatchObject({ combo: 3, heal: 1, attacks: { A: 1, B: 1 } });
  });
  it("commits atomically and immediately refills; overflow leaves cursor untouched", () => {
    let s = createRound(scenarios[0]);
    s = drop(s, [0, 1, 2, 3], 0);
    expect(s.hand).toHaveLength(5);
    expect(s.cursor).toBe(4);
    const rejected = drop(s, [0, 1], 0);
    expect(rejected).toEqual(s);
    expect(drop(s, [0], 1).cursor).toBe(5);
  });
  it("rejects duplicate and foreign IDs and invalid slots", () => {
    const s = createRound(scenarios[0]);
    for (const ids of [[], ["missing"], [s.hand[0].id, s.hand[0].id]])
      expect(commitPanels(s, ids, 0)).toBe(s);
    expect(drop(s, [0], -1)).toBe(s);
  });
  it("A target is reachable", () => {
    let s = createRound(scenarios[0]);
    s = drop(s, [0, 1], 0);
    s = drop(s, [0, 3], 1);
    s = drop(s, [0, 2], 2);
    expect(scenarios[0].success(s.slots)).toBe(true);
  });
  it("B needs waste and reaches both targets", () => {
    let s = createRound(scenarios[1]);
    expect(s.hand.some((p) => p.type === "A" || p.type === "B")).toBe(false);
    s = drop(s, [0, 1, 2, 3], 4);
    s = drop(s, [1, 3], 0);
    s = drop(s, [1, 2], 1);
    expect(scenarios[1].success(s.slots)).toBe(true);
  });
  it("C upgrades one heal role to V", () => {
    let s = createRound(scenarios[2]);
    s = drop(s, [0, 1], 0);
    s = drop(s, [0, 1], 1);
    s = reorderHand(s, [s.hand[1].id, s.hand[2].id], 0);
    s = drop(s, [0, 1, 3], 1);
    expect(recipes(s.slots[1])).toMatchObject({ heal: 5, combo: 1 });
    expect(scenarios[2].success(s.slots)).toBe(true);
  });
  it.each(scenarios)(
    "$id has 25 deterministic replacements and supports full capacity",
    (scenario) => {
      let s = createRound(scenario);
      expect(scenario.queue).toHaveLength(25);
      for (let i = 0; i < 5; i++) s = drop(s, [0, 1, 2, 3, 4], i);
      expect(s.cursor).toBe(25);
      expect(s.hand).toHaveLength(5);
    },
  );
});
