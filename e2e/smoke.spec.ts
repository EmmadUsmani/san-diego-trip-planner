import { expect, test } from "@playwright/test";
import { loginViaUi } from "./helpers";

const ROUTES: [string, string][] = [
  ["/", "route-overview"],
  ["/schedule", "route-schedule"],
  ["/schedule?view=day&day=2026-11-01&drive=false", "route-schedule"],
  ["/map", "route-map"],
  ["/places", "route-places"],
  ["/places/pl_airbnb", "route-place-detail"],
  ["/range", "route-range"],
];

test.describe("smoke", () => {
  for (const [path, testId] of ROUTES) {
    test(`loads ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.getByTestId(testId)).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("trip data loads through the API", async ({ request }) => {
    const res = await request.get("/api/trip");
    expect(res.ok()).toBe(true);
    const trip = await res.json();
    expect(trip.days).toHaveLength(4);
    expect(trip.places.length).toBeGreaterThanOrEqual(33);
  });

  test("navigation: header on desktop, tab bar on mobile", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) {
      const tabs = page.getByRole("navigation", { name: "Tabs" });
      await expect(tabs).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
      await tabs.getByRole("link", { name: "Schedule" }).click();
    } else {
      await expect(page.getByRole("navigation", { name: "Tabs" })).toBeHidden();
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Schedule" }).click();
    }
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.getByTestId("route-schedule")).toBeVisible();
  });

  test("login persists across reload and logout clears it", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Log in to edit" })).toBeVisible();
    await loginViaUi(page);
    await page.reload();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Log in to edit" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Log in to edit" })).toBeVisible();
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Log in to edit" }).click();
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Wrong password");
  });
});
