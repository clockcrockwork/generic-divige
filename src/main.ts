import "./style.css";
import { createGame, drop, settle, tune } from "./domain/game";
import { commitPanels, reorderHand, recipes } from "./domain/round";
import { scenarios } from "./scenarios";
import { bindInput } from "./ui/input";
import { renderClock, renderRound, recipeText, shapes } from "./ui/render";
import { Effects } from "./ui/effects";
import { Metrics } from "./ui/metrics";
import { TYPES } from "./domain/model";
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `<main><header><div><span class="eyebrow">INTENTIONAL COMBO / FEEL TEST</span><h1>Generic <em>Divige</em><span class="lab">COMBO LAB</span></h1></div><span class="prototype">PLAYABLE PoC · 01</span></header>
<section class="toolbar"><label>シナリオ<select id="scenario">${scenarios.map((s, i) => `<option value="${i}">${s.id} / ${s.name}</option>`).join("")}</select></label><button id="reset">もう一度 <span>↻</span></button></section>
<section class="arena" aria-label="コンボ実験場"><div class="actors"><div class="actor ally"><svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 5 65 25 59 60 40 74 21 60 15 25Z"/><path d="m25 30 15-12 15 12-15 29Z" class="inner"/></svg><div><small>ATTACK SOURCE</small><strong>あなたのユニット</strong></div></div><div class="versus">→</div><div class="actor enemy"><div><small>TRAINING TARGET</small><strong>訓練用ターゲット</strong></div><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30"/><circle cx="40" cy="40" r="17" class="inner"/><path d="M40 0v20m0 40v20M0 40h20m40 0h20"/></svg></div></div>
<div class="hud"><div><small>FIVE COUNTS</small><strong id="status"></strong></div><div class="combo"><b id="combo">0</b><span>COMBO</span></div></div><div class="meter-row"><progress id="count-meter" max="5" value="0" aria-label="経過カウント"></progress><span id="count-value"></span></div>
<div class="objective"><span>今回の目標</span><strong id="goal"></strong><small id="goal-state"></small></div>
<div id="board"><div class="section-label">FIELD <span>各枠 5枚まで · 同色2枚で攻撃</span></div><div id="field">${Array.from({ length: 5 }, (_, i) => `<div class="slot" data-slot="${i}" data-size="0" aria-label="場 ${i + 1}"><small ${i === 4 ? 'id="waste"' : ""}>${i + 1}</small><div class="pips"></div><strong class="recipe"></strong></div>`).join("")}</div>
<div class="drag-guide"><svg width="64" height="26" viewBox="0 0 64 26" aria-hidden="true"><path d="M2 23Q30 23 52 4m-12 1 13-2-2 12"/></svg><span>手札をドラッグして配置。手札内では並べ替え。</span></div><div class="section-label">HAND <label class="mode"><input type="checkbox" id="batch" checked> 隣接する同色をまとめる</label></div><div id="hand"></div></div>
<div id="preview" class="preview">同じ形を隣に並べて、まとめて置こう。</div><p id="feedback" role="status" aria-live="polite">準備は時間無制限です。</p>
<section id="result" hidden aria-live="polite"><span class="eyebrow">ROUND RESULT</span><h2 id="result-title"></h2><p id="result-detail"></p><small>「もう一度」で同じ手札・補充順をリプレイ。</small></section></section>
<section class="bottom"><div class="guide-card"><span class="eyebrow">RECIPE NOTES</span><div class="legend">${TYPES.map((t) => `<span data-type="${t}">${shapes[t]} ${t}${t === "H" ? "" : " ×2"}</span>`).join("")}</div><p>攻撃 A〜E：同色2枚で1コンボ。<br>♥ H：1〜5枚で Heal I〜V。回復は1枠1コンボ。</p><p id="scenario-guide"></p></div><div class="tuning"><span class="eyebrow">LIVE TUNING</span><label for="duration">カウント間隔 <output id="duration-output">1000 ms / count</output></label><input id="duration" type="range" min="400" max="2000" step="50" value="1000"><label for="speed">演出の速さ <output id="speed-output">1.00×</output></label><input id="speed" type="range" min="0.25" max="2" step="0.05" value="1"><small>間隔は進行速度、演出は見た目だけ。初期値は試遊用です。</small></div></section>
<details id="diagnostics"><summary>入力計測 · ローカルのみ</summary><p>DOM更新までのブラウザ側近似値（ms）。表示遅延の実測ではありません。各系列は直近120件まで。</p><pre id="metrics">まだ操作がありません。</pre></details><footer>Original shapes & interface · 再現性のある操作感テスト</footer></main><div id="ghost" hidden aria-hidden="true"></div>`;
let game = createGame(scenarios[0]);
let duration = 1000;
const effects = new Effects();
const metrics = new Metrics();
const feedback = document.querySelector<HTMLElement>("#feedback")!;
const result = document.querySelector<HTMLElement>("#result")!;
function publishMetrics() {
  document.querySelector("#metrics")!.textContent = metrics
    .summary()
    .map(
      (m) =>
        `${m.name}: n=${m.count} avg=${m.mean.toFixed(2)} max=${m.max.toFixed(2)} ms`,
    )
    .join("\n");
}
function finishIfNeeded(wasFinished: boolean) {
  if (!wasFinished && game.finished) {
    input.cancel();
    effects.clear();
    renderRound(game);
    result.hidden = false;
    document.querySelector("#result-title")!.textContent =
      game.round.scenario.success(game.round.slots)
        ? "目標達成！"
        : "次の組み立てを試そう";
    const roles = game.round.slots.map(recipes);
    document.querySelector("#result-detail")!.textContent =
      `${roles.reduce((s, r) => s + r.combo, 0)} COMBO · 攻撃 ${roles.reduce((s, r) => s + Object.values(r.attacks).reduce((a, b) => a + b, 0), 0)}回 / 回復 ${
        roles
          .filter((r) => r.heal > 0)
          .map((r) => `Heal ${["", "I", "II", "III", "IV", "V"][r.heal]}`)
          .join("・") || "なし"
      }`;
    feedback.textContent = "5カウント終了。配置を確定しました。";
    effects.flash(document.querySelector(".enemy")!);
  }
}
function tick(now: number) {
  const was = game.finished;
  game = settle(game, now);
  finishIfNeeded(was);
  renderClock(game);
}
const input = bindInput(document.querySelector("#board")!, {
  hand: () => game.round.hand,
  batch: () => document.querySelector<HTMLInputElement>("#batch")!.checked,
  active: () => {
    tick(performance.now());
    return !game.finished;
  },
  metrics,
  drop: (ids, slot, now) => {
    const previous = game;
    game = drop(game, ids, slot, now);
    const committed = performance.now();
    finishIfNeeded(previous.finished);
    if (game.round !== previous.round) {
      metrics.record("up → commit", committed - now);
      renderRound(game);
      metrics.record("commit → refill", performance.now() - committed);
      feedback.textContent = `枠${slot + 1}：${recipeText(game.round.slots[slot])} · ${ids.length}枚補充`;
      metrics.record("recipe → feedback", performance.now() - committed);
      effects.flash(document.querySelector(`[data-slot="${slot}"]`)!);
    } else if (!game.finished)
      feedback.textContent =
        "入りきりません。別の枠へどうぞ（手札はそのまま）。";
    publishMetrics();
  },
  reorder: (ids, index, now) => {
    tick(now);
    if (game.finished) return;
    game = { ...game, round: reorderHand(game.round, ids, index) };
    renderRound(game);
    feedback.textContent = "手札を並べ替えました。";
  },
  preview: (ids, slot) => {
    const preview = document.querySelector("#preview")!;
    if (!ids.length) {
      preview.textContent = "同じ形を隣に並べて、まとめて置こう。";
      return;
    }
    if (slot < 0) {
      preview.textContent = `${ids.length}枚を選択中 · 場へ置く / 手札内で並べ替え`;
      return;
    }
    const projected = commitPanels(game.round, ids, slot);
    preview.textContent =
      projected === game.round
        ? "容量オーバー · 全枚数そのまま戻ります"
        : `配置後 → ${recipeText(projected.slots[slot])}`;
  },
  cancelled: () => {
    feedback.textContent = "キャンセル · 手札はそのままです。";
  },
});
function reset() {
  input.cancel();
  effects.clear();
  game = createGame(
    scenarios[
      Number(document.querySelector<HTMLSelectElement>("#scenario")!.value)
    ],
    duration,
  );
  result.hidden = true;
  feedback.textContent = "準備は時間無制限です。";
  renderRound(game);
}
document.querySelector("#reset")!.addEventListener("click", reset);
document.querySelector("#scenario")!.addEventListener("change", reset);
document.querySelector("#duration")!.addEventListener("input", (e) => {
  duration = Number((e.target as HTMLInputElement).value);
  const was = game.finished;
  game = tune(game, performance.now(), duration);
  finishIfNeeded(was);
  document.querySelector("#duration-output")!.textContent =
    `${game.clock.durationMs} ms / count`;
  renderClock(game);
});
document.querySelector("#speed")!.addEventListener("input", (e) => {
  effects.setSpeed(Number((e.target as HTMLInputElement).value));
  document.querySelector("#speed-output")!.textContent =
    `${effects.speed.toFixed(2)}×`;
});
document.addEventListener("visibilitychange", () => tick(performance.now()));
function frame(now: number) {
  tick(now);
  requestAnimationFrame(frame);
}
renderRound(game);
requestAnimationFrame(frame);
