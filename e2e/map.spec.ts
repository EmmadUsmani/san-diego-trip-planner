import { expect, test } from "@playwright/test";
import { loginViaApi, reseed } from "./helpers";

// Tiles/style come from the network and may not load in CI; tests assert on DOM markers and panels only.
test.beforeEach(async ({ page }) => {
  await page.route(/tiles\.openfreemap\.org/, (r) => r.abort());
});

test.describe("map", () => {
  test.beforeAll(() => reseed());

  test("renders container, airbnb pin and day switch updates stop list", async ({ page }) => {
    await page.goto("/map?day=2026-10-31");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    await expect(page.getByTestId("marker-airbnb")).toHaveCount(1);
    const panel = page.getByTestId("stop-panel");
    if (page.viewportSize()!.width < 720) await page.getByTestId("sheet-handle").click();
    await expect(panel.getByText("Sugar and Scribe").first()).toBeVisible();
    await expect(page.getByTestId("marker-plan")).toHaveCount(3);

    await page.getByRole("button", { name: "Mon", exact: true }).click();
    await expect(page).toHaveURL(/day=2026-11-02/);
    await expect(panel.getByText(/San Diego Zoo/).first()).toBeVisible();
    await expect(panel.getByText("Sugar and Scribe")).toHaveCount(0);
    await expect(panel.getByTestId("stop-item").first()).toContainText("min drive");

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page).not.toHaveURL(/day=/);
    await expect(panel.getByText("Sugar and Scribe").first()).toBeVisible();
    await expect(panel.getByText(/San Diego Zoo/).first()).toBeVisible();
  });

  test("layer toggles change marker counts", async ({ page }) => {
    await page.goto("/map?day=2026-11-02");
    await expect(page.getByTestId("marker-plan").first()).toBeVisible();
    const ideas = page.getByTestId("marker-idea");
    expect(await ideas.count()).toBeGreaterThan(0);
    await page.getByTestId("layer-ideas").click();
    await expect(ideas).toHaveCount(0);
    await expect(page.getByTestId("marker-charger")).toHaveCount(0);
    await page.getByTestId("layer-chargers").click();
    expect(await page.getByTestId("marker-charger").count()).toBeGreaterThan(0);
    await page.getByTestId("layer-plan").click();
    await expect(page.getByTestId("marker-plan")).toHaveCount(0);
  });

  test("popup shows distance, details link, add to day when logged in", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/map?day=2026-11-02");
    await page.locator('[data-testid="marker-idea"]').first().click({ force: true });
    const popup = page.getByTestId("map-popup");
    await expect(popup).toBeVisible();
    await expect(popup.getByTestId("popup-distance")).toContainText(/\d+(\.\d)? mi.*min/);
    await expect(popup.getByTestId("popup-details")).toHaveAttribute("href", /\/places\/pl_/);
    await expect(popup.getByTestId("popup-add")).toHaveText("Add to day");
    await popup.getByRole("button", { name: "Close" }).click();
    await expect(popup).toHaveCount(0);
  });

  test("popup add is gated when logged out", async ({ page }) => {
    await page.goto("/map?day=2026-11-02");
    await page.locator('[data-testid="marker-idea"]').first().click({ force: true });
    await expect(page.getByTestId("popup-add")).toHaveText("Log in to add");
  });

  test("measure flow shows a distance", async ({ page }) => {
    await page.goto("/map?day=2026-11-02");
    await page.getByTestId("measure-toggle").click();
    await page.getByTestId("marker-airbnb").click({ force: true });
    await page.locator('[data-testid="marker-plan"]').first().click({ force: true });
    await expect(page.getByTestId("measure-result")).toContainText(/\d+(\.\d)? mi straight line.*min drive/);
  });

  test("mobile bottom sheet toggles stop list", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/map?day=2026-10-31");
    const item = page.getByTestId("stop-item").first();
    await expect(item).toBeHidden();
    await page.getByTestId("sheet-handle").click();
    await expect(item).toBeVisible();
  });
});
