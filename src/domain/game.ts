import type { Round, Scenario } from "./model";
import { COUNT_LIMIT } from "./model";
import { createRound, commitPanels } from "./round";
import {
  createClock,
  advanceClock,
  changeCountDuration,
  type Clock,
} from "./countdown";
export interface Game {
  round: Round;
  clock: Clock;
  finished: boolean;
}
export function createGame(scenario: Scenario, durationMs = 1000): Game {
  return {
    round: createRound(scenario),
    clock: createClock(durationMs),
    finished: false,
  };
}
export function settle(game: Game, nowMs: number): Game {
  if (game.finished) return game;
  const clock = advanceClock(game.clock, nowMs);
  return { ...game, clock, finished: clock.elapsed >= COUNT_LIMIT };
}
export function drop(
  game: Game,
  ids: string[],
  slot: number,
  nowMs: number,
): Game {
  const next = settle(game, nowMs);
  if (next.finished || !Number.isFinite(nowMs)) return next;
  const round = commitPanels(next.round, ids, slot);
  if (round === next.round) return next;
  return {
    ...next,
    round,
    clock:
      next.clock.lastMs === null
        ? { ...next.clock, lastMs: nowMs }
        : next.clock,
  };
}
export function tune(game: Game, nowMs: number, durationMs: number): Game {
  const next = settle(game, nowMs);
  return { ...next, clock: changeCountDuration(next.clock, nowMs, durationMs) };
}
