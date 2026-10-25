import { test, expect, type Page } from "@playwright/test";

async function point(page: Page, selector: string, index: number) {
  const r = await page.locator(selector).nth(index).boundingBox();
  if (!r) throw Error("missing panel");
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
async function pointer(page: Page, touch: boolean) {
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  return {
    async down(p: { x: number; y: number }) {
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 0 }] });
      else { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
    },
    async move(p: { x: number; y: number }) {
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...p, id: 0 }] });
      else await page.mouse.move(p.x, p.y);
    },
    async up() {
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else await page.mouse.up();
    },
    async cancel() {
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      else { await page.locator("#board").dispatchEvent("pointercancel", { pointerId: 1 }); await page.mouse.up(); }
    },
  };
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await page.goto("/");
});

test("adjacent equal panels still drop singly without gathering", async ({ page }, info) => {
  const p = await pointer(page, info.project.name === "touch");
  await p.down(await point(page, "#hand .panel", 0));
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.move(await point(page, ".slot", 0));
  await p.up();
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
  await expect(page.locator('#hand .panel[data-id="A-1"]')).toHaveCount(1);
  await expect(page.locator("#hand .panel")).toHaveCount(5);
  await expect(page.locator("#batch")).toHaveCount(0);
});

test("gather adds only the touched neighbor, one at a time, and retains the bundle", async ({ page }, info) => {
  await page.locator("#scenario").selectOption("2");
  const p = await pointer(page, info.project.name === "touch");
  // Spend AA individually to reveal H,H,B,H,H; move B aside to form H,H,H,H,B.
  for (let i = 0; i < 2; i++) {
    await p.down(await point(page, "#hand .panel", 0));
    await p.move(await point(page, ".slot", 0));
    await p.up();
  }
  await p.down(await point(page, "#hand .panel", 2));
  const last = await point(page, "#hand .panel", 4);
  await p.move({ x: last.x + 8, y: last.y });
  await p.up();
  await p.down(await point(page, "#hand .panel", 1));
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.move(await point(page, "#hand .panel", 3));
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.move(await point(page, "#hand .panel", 2));
  await expect(page.locator("#hand .held")).toHaveCount(2);
  await p.move(await point(page, "#hand .panel", 3));
  await expect(page.locator("#hand .held")).toHaveCount(3);
  await p.move(await point(page, "#hand .panel", 1));
  await expect(page.locator("#hand .held")).toHaveCount(3);
  await p.move(await point(page, "#hand .panel", 0));
  await expect(page.locator("#hand .held")).toHaveCount(4);
  await p.move(await point(page, ".slot", 1));
  await p.up();
  await expect(page.locator(".slot").nth(1)).toHaveAttribute("data-size", "4");
  await expect(page.locator(".slot").nth(1)).toContainText("Heal IV");
});

test("edge grazes, nonadjacent matches and different colors cannot gather", async ({ page }, info) => {
  const p = await pointer(page, info.project.name === "touch");
  await p.down(await point(page, "#hand .panel", 0));
  const neighbor = await page.locator("#hand .panel").nth(1).boundingBox();
  if (!neighbor) throw Error("no neighbor");
  await p.move({ x: neighbor.x + neighbor.width / 2, y: neighbor.y + 2 });
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.move(await point(page, "#hand .panel", 2));
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.up();
  await page.locator("#reset").click();
  // Move B between A,A using a single held B; A,B,A,C,D.
  await p.down(await point(page, "#hand .panel", 2));
  const a = await point(page, "#hand .panel", 1);
  await p.move({ x: a.x - 8, y: a.y });
  await p.up();
  await p.down(await point(page, "#hand .panel", 0));
  await p.move(await point(page, "#hand .panel", 2));
  await expect(page.locator("#hand .held")).toHaveCount(1);
  await p.move(await point(page, ".slot", 0));
  await p.up();
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
});

test("horizontal gather boundary excludes the edge and includes the center", async ({ page }, info) => {
  const p = await pointer(page, info.project.name === "touch");
  const r = await page.locator("#hand .panel").nth(1).boundingBox();
  if (!r) throw Error("missing neighbor");
  for (const side of [0.15, 0.85]) {
    await p.down(await point(page, "#hand .panel", 0));
    await p.move({ x: r.x + r.width * side, y: r.y + r.height / 2 });
    await expect(page.locator("#hand .held")).toHaveCount(1);
    await p.move({ x: r.x + r.width * (side < 0.5 ? 0.25 : 0.75), y: r.y + r.height / 2 });
    await expect(page.locator("#hand .held")).toHaveCount(2);
    await p.cancel();
  }
});

test("gathered bundles survive neither cancel, capture loss nor reset", async ({ page }, info) => {
  const p = await pointer(page, info.project.name === "touch");
  const ids = () => page.locator("#hand .panel").evaluateAll(els => els.map(e => (e as HTMLElement).dataset.id));
  for (const reason of ["cancel", "capture", "reset"]) {
    await page.locator("#reset").click();
    const before = await ids();
    await page.locator("#board").evaluate(board => board.addEventListener("pointerdown", event => {
      (board as HTMLElement).dataset.testPointer = String((event as PointerEvent).pointerId);
    }, { once: true }));
    await p.down(await point(page, "#hand .panel", 0));
    await p.move(await point(page, "#hand .panel", 1));
    await expect(page.locator("#hand .held")).toHaveCount(2);
    if (reason === "cancel") await p.cancel();
    else {
      if (reason === "capture") await page.locator("#board").evaluate(board => board.releasePointerCapture(Number((board as HTMLElement).dataset.testPointer)));
      else await page.locator("#reset").evaluate(e => (e as HTMLButtonElement).click());
      await p.move(await point(page, ".slot", 0));
      await p.up();
    }
    expect(await ids()).toEqual(before);
    await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
    await expect(page.locator("#ghost")).toBeHidden();
    await p.down(await point(page, "#hand .panel", 0));
    await p.move(await point(page, ".slot", 0));
    await p.up();
    await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
  }
});
