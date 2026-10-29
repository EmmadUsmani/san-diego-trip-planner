import { expect, test } from "@playwright/test";
import { loginViaApi, reseed } from "./helpers";

const num = async (loc: import("@playwright/test").Locator) => Number((await loc.textContent())?.replace(/[^\d.-]/g, ""));

test.describe("range", () => {
  test.beforeEach(() => reseed());
  test.afterAll(() => reseed());

  test("renders the chart, drives by day and chargers", async ({ page }) => {
    await page.goto("/range");
    const chart = page.getByTestId("range-chart");
    await expect(chart).toBeVisible();
    await expect(chart.getByText("Sat", { exact: true })).toBeVisible();
    await expect(chart.getByText("90%")).toBeVisible();
    await expect(page.getByTestId("range-low-line")).toBeAttached();
    await expect(page.getByTestId("range-day-2026-10-31")).toContainText("Ömer's home");
    await expect(page.getByTestId("range-day-2026-11-02")).toContainText("Liberty Park");
    await expect(page.getByRole("heading", { name: "Chargers nearby" })).toBeVisible();
    await expect(page.getByText("Liberty Park Plaza").last()).toBeVisible();
    // Real OSRM legs are seeded: Sat's long drive is ~138 mi, not the old heuristic's ~165.
    await expect(page.getByTestId("range-day-2026-10-31")).toContainText(/Ömer's home→Sugar and Scribe/);
  });

  test("logged out: changing start charge is a local preview and does not persist", async ({ page }) => {
    await page.goto("/range");
    await expect(page.getByTestId("range-save-hint")).toContainText("Preview only");
    const before = await num(page.locator('[data-kind="day-end"]').first());
    await page.getByLabel("Starting charge").fill("100");
    await expect.poll(() => num(page.locator('[data-kind="day-end"]').first())).toBeGreaterThan(before);
    await page.reload();
    await expect(page.getByLabel("Starting charge")).toHaveValue("90");
  });

  test("logged in: start charge updates the chart and persists after reload", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/range");
    const startInput = page.getByLabel("Starting charge");
    await expect(startInput).toHaveValue("90");
    const before = await num(page.locator('[data-kind="day-end"]').first());
    await startInput.fill("100");
    await expect(page.getByTestId("range-chart").getByText("100%").first()).toBeVisible();
    await expect.poll(() => num(page.locator('[data-kind="day-end"]').first())).toBeGreaterThan(before);
    await expect(page.getByTestId("range-save-hint")).toHaveText("Saved to the trip");
    await page.reload();
    await expect(page.getByLabel("Starting charge")).toHaveValue("100");
  });

  test("efficiency changes the end percentage", async ({ page }) => {
    await page.goto("/range");
    const before = await num(page.getByTestId("range-end-pct"));
    await page.getByLabel("Efficiency").fill("30");
    await expect.poll(() => num(page.getByTestId("range-end-pct"))).toBeLessThan(before);
  });
});
