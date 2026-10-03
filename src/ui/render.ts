import type { Game } from "../domain/game";
import { recipes } from "../domain/round";
import type { Panel, PanelType } from "../domain/model";
export const shapes: Record<PanelType, string> = {
  A: "▲",
  B: "●",
  C: "◆",
  D: "■",
  E: "✦",
  H: "♥",
};
export const roman = ["", "I", "II", "III", "IV", "V"];
export const panelHTML = (p: Panel) =>
  `<button class="panel" data-id="${p.id}" data-type="${p.type}" aria-label="${p.type} パネル"><span>${shapes[p.type]}</span><small>${p.type}</small></button>`;
export function recipeText(panels: Panel[]) {
  const r = recipes(panels);
  return (
    [
      ...Object.entries(r.attacks)
        .filter(([, n]) => n > 0)
        .map(([t, n]) => `${t}攻撃 ×${n}`),
      ...(r.heal ? [`Heal ${roman[r.heal]}`] : []),
    ].join(" / ") || "未成立"
  );
}
export function renderRound(game: Game) {
  document.querySelector("#hand")!.innerHTML = game.round.hand
    .map(panelHTML)
    .join("");
  game.round.slots.forEach((panels, i) => {
    const slot = document.querySelector<HTMLElement>(`[data-slot="${i}"]`)!;
    slot.dataset.size = String(panels.length);
    slot.querySelector(".pips")!.innerHTML = Array.from(
      { length: 5 },
      (_, n) =>
        panels[n]
          ? `<span data-type="${panels[n].type}">${shapes[panels[n].type]}</span>`
          : '<span class="empty">·</span>',
    ).join("");
    slot.querySelector(".recipe")!.textContent = recipeText(panels);
    slot.classList.toggle("ready", recipes(panels).combo > 0);
  });
  document.querySelector("#combo")!.textContent = String(
    game.round.slots.reduce((sum, p) => sum + recipes(p).combo, 0),
  );
  document.querySelector("#goal")!.textContent = game.round.scenario.goal;
  document.querySelector("#scenario-guide")!.textContent =
    game.round.scenario.guide;
  document.querySelector("#goal-state")!.textContent =
    game.round.scenario.success(game.round.slots)
      ? "目標達成 ✓"
      : "目標を組み立てよう";
  document.querySelector("#waste")!.textContent =
    game.round.scenario.id === "B" ? "不要パネルの候補枠" : "5";
  renderClock(game);
}
export function renderClock(game: Game) {
  document.querySelector("#status")!.textContent = game.finished
    ? "終了"
    : game.clock.lastMs === null
      ? "準備 · 最初の配置でスタート"
      : `COUNT ${Math.min(5, Math.floor(game.clock.elapsed) + 1)} / 5`;
  const meter = document.querySelector<HTMLProgressElement>("#count-meter")!;
  meter.value = game.clock.elapsed;
  document.querySelector("#count-value")!.textContent =
    `${game.clock.elapsed.toFixed(2)} / 5`;
}
