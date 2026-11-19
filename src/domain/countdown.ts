import { COUNT_LIMIT } from "./model";
export interface Clock {
  elapsed: number;
  lastMs: number | null;
  durationMs: number;
}
export function createClock(durationMs = 1000): Clock {
  return {
    elapsed: 0,
    lastMs: null,
    durationMs: Number.isFinite(durationMs)
      ? Math.max(400, Math.min(2000, durationMs))
      : 1000,
  };
}
export function advanceClock(clock: Clock, nowMs: number): Clock {
  if (clock.lastMs === null || !Number.isFinite(nowMs) || nowMs < clock.lastMs)
    return clock;
  return {
    ...clock,
    elapsed: Math.min(
      COUNT_LIMIT,
      clock.elapsed + (nowMs - clock.lastMs) / clock.durationMs,
    ),
    lastMs: nowMs,
  };
}
export function changeCountDuration(
  clock: Clock,
  nowMs: number,
  durationMs: number,
): Clock {
  if (!Number.isFinite(durationMs)) return clock;
  return {
    ...advanceClock(clock, nowMs),
    durationMs: Math.min(2000, Math.max(400, durationMs)),
  };
}
