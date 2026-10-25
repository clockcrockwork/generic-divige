import {
  SLOT_CAPACITY,
  type Panel,
  type Round,
  type Scenario,
  type AttackType,
} from "./model";
export function createRound(scenario: Scenario): Round {
  return {
    scenario,
    hand: scenario.initial.map((type, i) => ({
      id: `${scenario.id}-${i}`,
      type,
    })),
    slots: Array.from({ length: 5 }, () => []),
    cursor: 0,
  };
}
function validSelection(state: Round, ids: string[]) {
  return (
    ids.length > 0 &&
    new Set(ids).size === ids.length &&
    ids.every((id) => state.hand.some((p) => p.id === id))
  );
}
export function reorderHand(
  state: Round,
  ids: string[],
  insertionIndex: number,
): Round {
  if (
    !validSelection(state, ids) ||
    !Number.isInteger(insertionIndex) ||
    insertionIndex < 0 ||
    insertionIndex > 5
  )
    return state;
  const moving = state.hand.filter((p) => ids.includes(p.id));
  const remaining = state.hand.filter((p) => !ids.includes(p.id));
  const index =
    insertionIndex -
    state.hand.slice(0, insertionIndex).filter((p) => ids.includes(p.id))
      .length;
  return {
    ...state,
    hand: [...remaining.slice(0, index), ...moving, ...remaining.slice(index)],
  };
}
export function commitPanels(
  state: Round,
  ids: string[],
  slotIndex: number,
): Round {
  if (
    !validSelection(state, ids) ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= 5 ||
    state.slots[slotIndex].length + ids.length > SLOT_CAPACITY ||
    state.cursor + ids.length > state.scenario.queue.length
  )
    return state;
  const moving = state.hand.filter((p) => ids.includes(p.id));
  const refill = state.scenario.queue
    .slice(state.cursor, state.cursor + ids.length)
    .map((type, i) => ({
      id: `${state.scenario.id}-${5 + state.cursor + i}`,
      type,
    }));
  return {
    ...state,
    cursor: state.cursor + ids.length,
    hand: [...state.hand.filter((p) => !ids.includes(p.id)), ...refill],
    slots: state.slots.map((slot, i) =>
      i === slotIndex ? [...slot, ...moving] : slot,
    ),
  };
}
export function recipes(panels: Panel[]) {
  const attacks = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const type of Object.keys(attacks) as AttackType[])
    attacks[type] = Math.floor(
      panels.filter((p) => p.type === type).length / 2,
    );
  const heal = Math.min(5, panels.filter((p) => p.type === "H").length);
  return {
    attacks,
    heal,
    combo:
      Object.values(attacks).reduce((a, b) => a + b, 0) + (heal > 0 ? 1 : 0),
  };
}
