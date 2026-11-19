import { test, expect, type Page } from "@playwright/test";
async function drag(page: Page, from: number, to: number, hand = false, gather: number[] = []) {
  const a = await page.locator("#hand .panel").nth(from).boundingBox();
  const b = await page
    .locator(hand ? "#hand .panel" : ".slot")
    .nth(to)
    .boundingBox();
  if (!a || !b) throw Error("missing board");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (const i of gather) {
    const p = await page.locator("#hand .panel").nth(i).boundingBox();
    if (!p) throw Error("missing neighbor");
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  }
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 3 });
  await page.mouse.up();
}
test("preparation, immediate batch refill, tuning and replay", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#hand .panel")).toHaveCount(5);
  await expect(page.locator("#status")).toContainText("準備");
  await drag(page, 0, 4, true);
  await expect(page.locator("#status")).toContainText("準備");
  await page.getByRole("button", { name: "もう一度" }).click();
  await drag(page, 0, 0, false, [1]);
  await expect(page.locator(".slot").nth(0)).toHaveAttribute("data-size", "2");
  await expect(page.locator("#hand .panel")).toHaveCount(5);
  await expect(page.locator("#combo")).toHaveText("1");
  await page.locator("#duration").fill("400");
  await page.locator("#speed").fill("0.25");
  await expect(page.locator("#result")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "もう一度" }).click();
  await expect(page.locator("#status")).toContainText("準備");
  await expect(page.locator("#duration")).toHaveValue("400");
});

async function setRange(page: Page, id: string, value: string) {
  await page.locator(id).fill(value);
}
async function color(page: Page, type: string, slot: number) {
  const i = await page
    .locator("#hand .panel")
    .evaluateAll(
      (els, t) => els.findIndex((e) => (e as HTMLElement).dataset.type === t),
      type,
    );
  if (i < 0) throw Error(`missing ${type}`);
  await drag(page, i, slot);
}
for (const scenario of ["A", "B", "C"])
  test(`scenario ${scenario} reaches goal, resolves and resets`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
    await page.goto("/");
    await page
      .locator("#scenario")
      .selectOption(String(["A", "B", "C"].indexOf(scenario)));
    await setRange(page, "#duration", "2000");
    await setRange(page, "#speed", "0.25");
    if (scenario === "A") {
      await drag(page, 0, 0, false, [1]);
      await color(page, "B", 1);
      await color(page, "B", 1);
      await color(page, "C", 2);
      await color(page, "C", 2);
    }
    if (scenario === "B") {
      for (let i = 0; i < 4; i++) await drag(page, 0, 4);
      await color(page, "A", 0);
      await color(page, "A", 0);
      await color(page, "B", 1);
      await color(page, "B", 1);
    }
    if (scenario === "C") {
      await drag(page, 0, 0, false, [1]);
      await drag(page, 0, 1, false, [1]);
      await color(page, "H", 1);
      await color(page, "H", 1);
      await color(page, "H", 1);
      await expect(page.locator(".slot").nth(1)).toContainText("Heal V");
      await expect(page.locator("#combo")).toHaveText("2");
    }
    await expect(page.locator("#goal-state")).toHaveText("目標達成 ✓");
    await page.clock.fastForward(11000);
    await expect(page.locator("#result-title")).toHaveText("目標達成！");
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `docs/scenario-${scenario}-${info.project.name}.jpg`,
      fullPage: true,
      scale: "css",
      type: "jpeg",
      quality: 70,
    });
    await page.getByRole("button", { name: "もう一度" }).click();
    await expect(page.locator("#hand .panel")).toHaveCount(5);
    await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
    await expect(page.locator("#result")).toBeHidden();
  });
test("overflow is atomic; outside, cancel, reset and scenario switch cannot leak a drag", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await page.goto("/");
  await setRange(page, "#duration", "2000");
  for (let i = 0; i < 4; i++) await drag(page, 0, 0);
  const before = await page.locator("#hand").innerHTML();
  await drag(page, 2, 0, false, [3]);
  expect(await page.locator("#hand").innerHTML()).toBe(before);
  await expect(page.locator(".slot").nth(0)).toHaveAttribute("data-size", "4");
  await drag(page, 2, 1, false, [3]);
  await expect(page.locator(".slot").nth(1)).toHaveAttribute("data-size", "2");
  const panel = page.locator("#hand .panel").first();
  const p = await panel.boundingBox();
  if (!p) throw Error("no hand");
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(page.locator("#ghost")).toBeHidden();
});
test("real pointer cancellation and stale release do not commit", async ({
  page,
}) => {
  await page.goto("/");
  const p = await page.locator("#hand .panel").first().boundingBox();
  if (!p) throw Error("missing panel");
  await page.mouse.move(p.x + 10, p.y + 10);
  await page.mouse.down();
  await page.locator("#board").dispatchEvent("pointercancel", { pointerId: 1 });
  await expect(page.locator("#ghost")).toBeHidden();
  await page.mouse.up();
  await expect(page.locator("#status")).toContainText("準備");
  await page.mouse.move(p.x + 10, p.y + 10);
  await page.mouse.down();
  await page
    .locator("#reset")
    .evaluate((e) => (e as HTMLButtonElement).click());
  await page.mouse.up();
  await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
  await expect(page.locator("#ghost")).toBeHidden();
});

test("touch drag, second finger ownership and touch cancellation", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await page.goto("/");
  const cdp = await page.context().newCDPSession(page);
  const a = await page.locator("#hand .panel").first().boundingBox();
  const b = await page.locator(".slot").first().boundingBox();
  if (!a || !b) throw Error("board absent");
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 0 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 0 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  });
  await expect(page.locator("#ghost")).toBeVisible();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start, { x: start.x + 150, y: start.y, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [end, { x: start.x + 150, y: start.y, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
  await expect(page.locator("#hand .panel")).toHaveCount(5);
  const next = await page.locator("#hand .panel").first().boundingBox();
  if (!next) throw Error("hand absent");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: next.x + 15, y: next.y + 15, id: 0 }],
  });
  await expect(page.locator("#ghost")).toBeVisible();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator("#ghost")).toBeHidden();
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
});
test("live count rate preserves progress; animation rate only affects cosmetics", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await page.goto("/");
  await setRange(page, "#speed", "0.25");
  await drag(page, 0, 0);
  await page.clock.runFor(1500);
  await setRange(page, "#duration", "2000");
  const progress = await page
    .locator("#count-meter")
    .evaluate((e) => (e as HTMLProgressElement).value);
  expect(progress).toBeCloseTo(1.5, 1);
  await setRange(page, "#speed", "2");
  await page.clock.runFor(1000);
  expect(
    await page
      .locator("#count-meter")
      .evaluate((e) => (e as HTMLProgressElement).value),
  ).toBeCloseTo(2, 1);
  await expect(page.locator("#combo")).toHaveText("0");
  await page
    .locator("#diagnostics")
    .evaluate((e) => ((e as HTMLDetailsElement).open = true));
  for (const label of [
    "down → visual",
    "move → position",
    "up → commit",
    "commit → refill",
    "recipe → feedback",
  ])
    await expect(page.locator("#metrics")).toContainText(label);
  await page.clock.fastForward(6000);
  await expect(page.locator("#result")).toBeVisible();
});
test("expiry during drag cancels it; right button and stale scenario release are ignored", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:10:00Z"));
  await page.goto("/");
  await drag(page, 0, 0);
  const p = await page.locator("#hand .panel").first().boundingBox();
  if (!p) throw Error("hand absent");
  await page.mouse.move(p.x + 15, p.y + 15);
  await page.mouse.down();
  await page.clock.fastForward(5000);
  await expect(page.locator("#ghost")).toBeHidden();
  await page.mouse.up();
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
  await page.getByRole("button", { name: "もう一度" }).click();
  await page.mouse.move(p.x + 15, p.y + 15);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await expect(page.locator("#ghost")).toBeHidden();
  await expect(page.locator("#status")).toContainText("準備");
  await page.mouse.down();
  await page.locator("#scenario").evaluate((e) => {
    (e as HTMLSelectElement).value = "2";
    e.dispatchEvent(new Event("change"));
  });
  await page.mouse.up();
  await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
  await expect(page.locator('#hand .panel[data-type="H"]')).toHaveCount(2);
  await expect(page.locator("#ghost")).toBeHidden();
});

test("outside and lost capture preserve panel IDs and field; next input works", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page
    .locator("#hand .panel")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
  const a = await page.locator("#hand .panel").first().boundingBox();
  const b = await page.locator(".slot").first().boundingBox();
  if (!a || !b) throw Error("board missing");
  await page.mouse.move(a.x + 15, a.y + 15);
  await page.mouse.down();
  await expect(page.locator("#ghost")).toBeVisible();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  expect(
    await page
      .locator("#hand .panel")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id)),
  ).toEqual(before);
  await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
  await page.mouse.move(a.x + 15, a.y + 15);
  await page.mouse.down();
  await expect(page.locator("#ghost")).toBeVisible();
  await page.locator("#board").evaluate((e) => e.releasePointerCapture(1));
  await page.mouse.move(b.x + 15, b.y + 15);
  await page.mouse.up();
  await expect(page.locator("#ghost")).toBeHidden();
  expect(
    await page
      .locator("#hand .panel")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id)),
  ).toEqual(before);
  await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
  await drag(page, 0, 0);
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
});

test("release during pointerdown cannot commit before lostpointercapture is delivered", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page
    .locator("#hand .panel")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
  await page.locator("#board").evaluate((board) => {
    board.addEventListener(
      "pointerdown",
      (event) => {
        board.releasePointerCapture((event as PointerEvent).pointerId);
      },
      { once: true },
    );
  });
  await drag(page, 0, 0);
  expect(
    await page
      .locator("#hand .panel")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id)),
  ).toEqual(before);
  await expect(page.locator('.slot[data-size="0"]')).toHaveCount(5);
  await expect(page.locator("#ghost")).toBeHidden();
  await drag(page, 0, 0);
  await expect(page.locator(".slot").first()).toHaveAttribute("data-size", "1");
});
