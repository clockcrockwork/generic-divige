export const TYPES = ["A", "B", "C", "D", "E", "H"] as const;
export type PanelType = (typeof TYPES)[number];
export type AttackType = Exclude<PanelType, "H">;
export interface Panel {
  id: string;
  type: PanelType;
}
export interface Scenario {
  id: string;
  name: string;
  guide: string;
  goal: string;
  initial: PanelType[];
  queue: PanelType[];
  success: (slots: Panel[][]) => boolean;
}
export interface Round {
  scenario: Scenario;
  hand: Panel[];
  slots: Panel[][];
  cursor: number;
}
export const COUNT_LIMIT = 5;
export const SLOT_CAPACITY = 5;
