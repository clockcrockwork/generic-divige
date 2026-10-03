import { adjacentRun } from "../domain/round";
import type { Panel } from "../domain/model";
import type { Metrics } from "./metrics";
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export function hitSlot(x: number, y: number, rects: Rect[]): number {
  let index = -1,
    distance = Infinity;
  rects.forEach((r, i) => {
    if (
      x < r.left - 12 ||
      x > r.left + r.width + 12 ||
      y < r.top - 12 ||
      y > r.top + r.height + 12
    )
      return;
    const d = (x - r.left - r.width / 2) ** 2 + (y - r.top - r.height / 2) ** 2;
    if (d < distance) {
      distance = d;
      index = i;
    }
  });
  return index;
}
export const acceptsPointer = (
  primary: boolean,
  button: number,
  busy: boolean,
) => primary && button === 0 && !busy;
interface InputOptions {
  hand: () => Panel[];
  batch: () => boolean;
  active: () => boolean;
  drop: (ids: string[], slot: number, now: number) => void;
  reorder: (ids: string[], index: number, now: number) => void;
  preview: (ids: string[], slot: number) => void;
  cancelled: () => void;
  metrics: Metrics;
}
export function bindInput(board: HTMLElement, o: InputOptions) {
  let drag: { pointer: number; ids: string[] } | null = null;
  const ghost = document.querySelector<HTMLElement>("#ghost")!;
  const slotElements = () => [...board.querySelectorAll<HTMLElement>(".slot")];
  function clear(notify = false) {
    const old = drag;
    drag = null;
    if (old && board.hasPointerCapture(old.pointer))
      board.releasePointerCapture(old.pointer);
    ghost.hidden = true;
    board
      .querySelectorAll(".held,.target")
      .forEach((e) => e.classList.remove("held", "target"));
    o.preview([], -1);
    if (notify && old) o.cancelled();
  }
  function position(e: PointerEvent) {
    const start = performance.now();
    ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    const slots = slotElements();
    const target = hitSlot(
      e.clientX,
      e.clientY,
      slots.map((s) => s.getBoundingClientRect()),
    );
    slots.forEach((s, i) => s.classList.toggle("target", i === target));
    o.preview(drag!.ids, target);
    o.metrics.record("move → position", performance.now() - start);
  }
  board.addEventListener("pointerdown", (e) => {
    if (!acceptsPointer(e.isPrimary, e.button, drag !== null) || !o.active())
      return;
    const panel = (e.target as Element).closest<HTMLElement>("#hand .panel");
    if (!panel) return;
    e.preventDefault();
    const start = performance.now();
    const ids = o.batch()
      ? adjacentRun(o.hand(), panel.dataset.id!)
      : [panel.dataset.id!];
    drag = { pointer: e.pointerId, ids };
    board.setPointerCapture(e.pointerId);
    board
      .querySelectorAll<HTMLElement>("#hand .panel")
      .forEach((p) => p.classList.toggle("held", ids.includes(p.dataset.id!)));
    ghost.textContent = `${panel.dataset.type} × ${ids.length}`;
    ghost.dataset.type = panel.dataset.type;
    ghost.hidden = false;
    position(e);
    o.metrics.record("down → visual", performance.now() - start);
  });
  board.addEventListener("pointermove", (e) => {
    if (drag?.pointer !== e.pointerId) return;
    // Pending capture can be released before any lostpointercapture event exists.
    if (!board.hasPointerCapture(e.pointerId) || !o.active()) {
      clear(true);
      return;
    }
    position(e);
  });
  board.addEventListener("pointerup", (e) => {
    if (drag?.pointer !== e.pointerId) return;
    if (!board.hasPointerCapture(e.pointerId)) {
      clear(true);
      return;
    }
    const ids = drag.ids;
    const now = performance.now();
    const slot = hitSlot(
      e.clientX,
      e.clientY,
      slotElements().map((s) => s.getBoundingClientRect()),
    );
    const hand = board
      .querySelector<HTMLElement>("#hand")!
      .getBoundingClientRect();
    const inHand =
      e.clientY >= hand.top &&
      e.clientY <= hand.bottom &&
      e.clientX >= hand.left &&
      e.clientX <= hand.right;
    const panels = [...board.querySelectorAll<HTMLElement>("#hand .panel")];
    const index = panels.findIndex(
      (p) =>
        e.clientX <
        p.getBoundingClientRect().left + p.getBoundingClientRect().width / 2,
    );
    clear();
    if (slot >= 0) o.drop(ids, slot, now);
    else if (inHand) o.reorder(ids, index < 0 ? 5 : index, now);
    else o.cancelled();
  });
  board.addEventListener("pointercancel", (e) => {
    if (drag?.pointer === e.pointerId) clear(true);
  });
  board.addEventListener("lostpointercapture", (e) => {
    if (drag?.pointer === e.pointerId) clear(true);
  });
  return { cancel: () => clear() };
}
