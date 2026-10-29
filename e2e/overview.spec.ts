import { expect, test } from "@playwright/test";
import { loginViaApi } from "./helpers";

test.describe("overview desktop", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop layout"));

  test("renders hero, four day cards with plans and prayer times", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("route-overview")).toBeVisible();
    await expect(page.getByRole("heading", { name: /La Jolla/ })).toBeVisible();
    await expect(page.getByTestId("countdown")).toBeVisible();
    for (const d of ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]) {
      const card = page.getByTestId(`day-card-${d}`);
      await expect(card).toBeVisible();
      for (const p of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) await expect(card.getByTestId(`prayer-${d}-${p}`)).toBeVisible();
      await expect(card).toContainText(/Battery ~-?\d+%/);
    }
    const sat = page.getByTestId("day-card-2026-10-31");
    await expect(sat).toContainText("Sugar and Scribe");
    await expect(sat.getByTestId("prayer-2026-10-31-fajr")).toContainText(/5:5\d|5:6\d|6:0\d/);
    await expect(page.getByTestId("day-card-2026-11-01")).toContainText("Clocks fall back");
    // equal heights
    const heights = await page.locator('[data-testid^="day-card-"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
  });

  test("door code hidden when logged out, revealable when logged in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("door-code")).toHaveText("••••");
    await expect(page.getByText("8038")).toHaveCount(0);
    await expect(page.getByTestId("door-code-toggle")).toHaveCount(0);

    await loginViaApi(page);
    await page.reload();
    await expect(page.getByText("8038")).toHaveCount(0);
    await page.getByTestId("door-code-toggle").click();
    await expect(page.getByTestId("door-code")).toHaveText("8038");
    await page.getByTestId("door-code-toggle").click();
    await expect(page.getByTestId("door-code")).toHaveText("••••");
  });
});

test.describe("overview mobile today", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "mobile layout"));

  test("shows now/next, prayer and battery during the trip", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-01T19:10:00Z") }); // Sun 11:10 AM PST
    await page.goto("/");
    const today = page.getByTestId("mobile-today");
    await expect(today).toBeVisible();
    await expect(page.getByTestId("overview-desktop")).toBeHidden();
    await expect(today.getByRole("heading", { name: "Sunday" })).toBeVisible();
    await expect(page.getByTestId("today-now")).toContainText("Birch Aquarium");
    await expect(page.getByTestId("today-next")).toContainText("Harbor Tour");
    await expect(page.getByTestId("today-prayer")).toContainText("Dhuhr");
    await expect(page.getByTestId("today-prayer")).toContainText("11:3");
    await expect(page.getByTestId("today-battery")).toContainText(/~-?\d+%/);
  });

  test("before the trip shows Day 1", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-28T20:00:00Z") });
    await page.goto("/");
    await expect(page.getByTestId("mobile-today").getByRole("heading", { name: "Day 1" })).toBeVisible();
    await expect(page.getByTestId("today-next")).toContainText("Leave Valencia");
    await expect(page.getByTestId("today-prayer")).toContainText("Fajr");
  });

  test("after the trip shows the last day", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-20T20:00:00Z") });
    await page.goto("/");
    await expect(page.getByTestId("mobile-today").getByRole("heading", { name: "Trip complete" })).toBeVisible();
  });
});
