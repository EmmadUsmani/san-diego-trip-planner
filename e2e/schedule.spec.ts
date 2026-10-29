import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginViaApi, reseed } from "./helpers";

type Ev = { id: string; start: string; end: string; skipped: boolean; placeId: string | null };
async function getEvents(page: Page): Promise<Record<string, Ev>> {
  const trip = await (await page.request.get("/api/trip")).json();
  const out: Record<string, Ev> = {};
  for (const d of trip.days) for (const e of d.events) out[e.id] = e;
  return out;
}

async function center(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
}

/** Drag with real mouse events (dnd-kit PointerSensor). */
async function dragBy(page: Page, from: Locator, to: { x: number; y: number }) {
  const c = await center(from);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 10, c.y + 10, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

test.describe("desktop", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "desktop only");
    reseed();
    await page.goto("/schedule");
  });

  test("renders week grid with events, drive rows and prayers", async ({ page }) => {
    await expect(page.getByTestId("route-schedule")).toBeVisible();
    for (const d of ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]) await expect(page.getByTestId(`day-head-${d}`)).toBeVisible();
    await expect(page.getByTestId("event-ev_sat_brunch")).toContainText("Sugar and Scribe");
    await expect(page.getByTestId("event-ev_sat_checkin")).toHaveAttribute("data-kind", "locked");
    await expect(page.getByTestId("day-head-2026-11-01")).toContainText("Clocks fall back");
    await expect(page.getByTestId("prayer-fajr").first()).toBeVisible();
    await expect.poll(() => page.getByTestId("drive-row").count()).toBeGreaterThan(3);
    await expect(page.getByTestId("ideas-tray")).toContainText("Coast Walk Trail");
    // Sun 9:00 AM (PST) sits exactly 5 hours below the 4 AM top.
    const col = (await page.getByTestId("day-col-2026-11-01").boundingBox())!;
    const ev = (await page.getByTestId("event-ev_sun_brunch").boundingBox())!;
    expect(Math.round(ev.y - col.y)).toBe(400);
  });

  test("toggles drive, prayers, rain via URL", async ({ page }) => {
    const rainBefore = await page.getByTestId("rain-wash").count();
    await page.getByTestId("toggle-drive").click();
    await expect(page).toHaveURL(/drive=false/);
    await expect(page.getByTestId("drive-row")).toHaveCount(0);
    await page.getByTestId("toggle-prayers").click();
    await expect(page.getByTestId("prayer-fajr")).toHaveCount(0);
    await page.getByTestId("toggle-rain").click();
    await expect(page.getByTestId("rain-wash")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("toggle-drive")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("drive-row")).toHaveCount(0);
    await page.getByTestId("toggle-rain").click();
    await expect.poll(() => page.getByTestId("rain-wash").count()).toBe(rainBefore || (await page.getByTestId("rain-wash").count()));
  });

  test("day view shows a single column", async ({ page }) => {
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(page).toHaveURL(/view=day/);
    await expect(page.locator('[data-testid^="day-col-"]')).toHaveCount(1);
    await page.getByTestId("daypick-2026-11-02").click();
    await expect(page.getByTestId("event-ev_mon_zoo")).toBeVisible();
  });

  test("drag an event to a new time (persisted after reload)", async ({ page }) => {
    await loginViaApi(page);
    await page.reload();
    const ev = page.getByTestId("event-ev_sat_dinner");
    await expect(ev).toHaveAttribute("data-draggable", "true");
    await ev.scrollIntoViewIfNeeded();
    const c = await center(ev);
    await dragBy(page, ev, { x: c.x, y: c.y - 80 }); // one hour earlier: 7p -> 6p PDT
    await expect.poll(async () => (await getEvents(page)).ev_sat_dinner!.start).toBe("2026-11-01T01:00:00.000Z");
    await page.reload();
    const col = (await page.getByTestId("day-col-2026-10-31").boundingBox())!;
    const moved = (await page.getByTestId("event-ev_sat_dinner").boundingBox())!;
    expect(Math.round(moved.y - col.y)).toBe(14 * 80);
  });

  test("drag an idea from the tray onto the grid", async ({ page }) => {
    await loginViaApi(page);
    await page.reload();
    const idea = page.getByTestId("idea-pl_coast_walk");
    const col = (await page.getByTestId("day-col-2026-11-02").boundingBox())!;
    const ib = (await idea.boundingBox())!;
    // Land the card's top edge on 9:00 AM Monday (PST): 5 hours below the column top.
    const targetTop = col.y + 5 * 80;
    await dragBy(page, idea, { x: col.x + col.width / 2, y: targetTop + ib.height / 2 });
    await expect.poll(async () => Object.values(await getEvents(page)).find((e) => e.placeId === "pl_coast_walk")?.start).toBe("2026-11-02T17:00:00.000Z");
    await expect(page.getByTestId("idea-pl_coast_walk")).toHaveCount(0);
  });

  test("drag an event back to the tray unschedules it", async ({ page }) => {
    await loginViaApi(page);
    await page.reload();
    const ev = page.getByTestId("event-ev_sun_brunch");
    const tray = (await page.getByTestId("ideas-tray").boundingBox())!;
    await dragBy(page, ev, { x: tray.x + tray.width / 2, y: tray.y + 120 });
    await expect.poll(async () => (await getEvents(page)).ev_sun_brunch).toBeUndefined();
    await expect(page.getByTestId("ideas-tray")).toContainText("Fig Tree Cafe");
  });

  test("locked and booked events are not draggable", async ({ page }) => {
    await loginViaApi(page);
    await page.reload();
    const locked = page.getByTestId("event-ev_sat_checkin");
    const booked = page.getByTestId("event-ev_sun_harbor");
    await expect(locked).toHaveAttribute("data-draggable", "false");
    await expect(booked).toHaveAttribute("data-draggable", "false");
    const before = await getEvents(page);
    const c = await center(locked);
    await dragBy(page, locked, { x: c.x, y: c.y - 160 });
    const after = await getEvents(page);
    expect(after.ev_sat_checkin!.start).toBe(before.ev_sat_checkin!.start);
  });

  test("skip and unskip a booked event", async ({ page }) => {
    await loginViaApi(page);
    await page.reload();
    await page.getByTestId("skip-ev_sun_harbor").click();
    await expect.poll(async () => (await getEvents(page)).ev_sun_harbor!.skipped).toBe(true);
    await page.reload();
    await expect(page.getByTestId("skip-ev_sun_harbor")).toHaveText("Unskip");
    await page.getByTestId("skip-ev_sun_harbor").click();
    await expect.poll(async () => (await getEvents(page)).ev_sun_harbor!.skipped).toBe(false);
  });

  test("logged out: cannot edit, is prompted to log in", async ({ page }) => {
    await expect(page.getByTestId("event-ev_sat_dinner")).toHaveAttribute("data-draggable", "false");
    await expect(page.getByTestId("idea-pl_coast_walk")).toHaveAttribute("data-draggable", "false");
    const before = await getEvents(page);
    const ev = page.getByTestId("event-ev_sat_dinner");
    const c = await center(ev);
    await dragBy(page, ev, { x: c.x, y: c.y - 80 });
    expect((await getEvents(page)).ev_sat_dinner!.start).toBe(before.ev_sat_dinner!.start);
    await page.getByTestId("skip-ev_sun_harbor").click();
    await expect(page.getByLabel("Password")).toBeVisible();
    expect((await getEvents(page)).ev_sun_harbor!.skipped).toBe(false);
  });
});

test.describe("mobile", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile only");
    reseed();
    await page.goto("/schedule");
  });

  test("day agenda with day picker", async ({ page }) => {
    await expect(page.getByTestId("mobile-agenda")).toBeVisible();
    await expect(page.getByTestId("event-ev_sat_brunch")).toBeVisible();
    await expect(page.getByTestId("event-ev_sun_harbor")).toHaveCount(0);
    await page.getByTestId("daypick-2026-11-01").click();
    await expect(page).toHaveURL(/day=2026-11-01/);
    await expect(page.getByTestId("event-ev_sun_harbor")).toBeVisible();
    await expect(page.getByTestId("event-ev_sat_brunch")).toHaveCount(0);
    await expect(page.getByTestId("agenda-prayer-fajr")).toBeVisible();
    await expect(page.getByText("Clocks fall back")).toBeVisible();
  });
});
