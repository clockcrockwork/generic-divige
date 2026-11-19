import type { PanelType, Scenario, Panel } from "./domain/model";
import { recipes } from "./domain/round";
const continuation: PanelType[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "H",
  "A",
  "A",
  "B",
  "B",
  "C",
  "C",
  "D",
  "D",
  "E",
  "E",
  "H",
  "H",
  "H",
  "A",
  "B",
  "C",
  "D",
  "E",
  "H",
];
const queue = (prefix: PanelType[]) =>
  [...prefix, ...continuation].slice(0, 25);
const attack = (slots: Panel[][], type: "A" | "B" | "C") =>
  slots.some((s) => recipes(s).attacks[type] > 0);
export const scenarios: Scenario[] = [
  {
    id: "A",
    name: "基本コンボ",
    goal: "A・B・C の攻撃を1つずつ",
    guide: "Aを掴んで隣のAをなぞり、束を置く → 補充したBとCを並べてペアに。",
    initial: ["A", "A", "B", "C", "D"],
    queue: queue(["B", "C", "C", "D", "D", "E", "E"]),
    success: (s) => attack(s, "A") && attack(s, "B") && attack(s, "C"),
  },
  {
    id: "B",
    name: "捨てる判断",
    goal: "A・B の攻撃を1つずつ",
    guide:
      "最初は目標色がありません。右端を不要パネル置き場にして補充を引こう。",
    initial: ["C", "D", "E", "C", "D"],
    queue: queue(["A", "B", "A", "B"]),
    success: (s) => attack(s, "A") && attack(s, "B"),
  },
  {
    id: "C",
    name: "攻撃と回復",
    goal: "A攻撃 ＋ Heal IV以上",
    guide: "隣をなぞってAA → HH。補充のHを並べ替え、同じ回復枠へ重ねよう。",
    initial: ["A", "A", "H", "H", "B"],
    queue: queue(["H", "H", "H", "C", "D"]),
    success: (s) => attack(s, "A") && s.some((p) => recipes(p).heal >= 4),
  },
];
