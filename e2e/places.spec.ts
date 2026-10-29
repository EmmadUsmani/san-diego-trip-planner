import { expect, test, type Page } from "@playwright/test";
import { loginViaApi, reseed } from "./helpers";

/** On mobile only one section shows at a time; pick it via the segmented control. */
async function showSection(page: Page, isMobile: boolean, name: "Scheduled" | "Ideas" | "Food" | "Chargers") {
  if (isMobile) await page.getByRole("tab", { name }).click();
}

test.describe("places", () => {
  test.beforeEach(() => reseed());

  test("sections render with seed data", async ({ page, isMobile }) => {
    await page.goto("/places");
    await expect(page.getByRole("heading", { name: "Places", level: 1 })).toBeVisible();
    await showSection(page, isMobile, "Scheduled");
    const sched = page.getByTestId("sec-schedule");
    await expect(sched.getByTestId("sched-ev_sat_brunch")).toContainText("Sugar and Scribe");
    await expect(sched.getByTestId("sched-ev_sat_checkin")).toContainText("Fixed");
    await expect(sched.getByTestId("sched-ev_sun_harbor")).toContainText("Booked");
    await showSection(page, isMobile, "Ideas");
    await expect(page.getByTestId("place-pl_rose_canyon")).toBeVisible();
    await showSection(page, isMobile, "Food");
    await expect(page.getByTestId("place-pl_akhis")).toBeVisible();
    await showSection(page, isMobile, "Chargers");
    await expect(page.getByTestId("sec-chargers").getByRole("listitem")).toHaveCount(6);
  });

  test("filters and search", async ({ page, isMobile }) => {
    await page.goto("/places");
    await page.getByRole("button", { name: "Halal" }).click();
    await showSection(page, isMobile, "Food");
    await expect(page.getByTestId("place-pl_akhis")).toBeVisible();
    await expect(page.getByTestId("place-pl_georges")).toHaveCount(0);
    await page.getByRole("button", { name: "Chargers" }).click();
    await showSection(page, isMobile, "Chargers");
    await expect(page.getByTestId("sec-chargers")).toBeVisible();
    await expect(page.getByTestId("sec-food")).toHaveCount(0);
    await page.getByRole("button", { name: "All" }).click();
    await page.getByRole("searchbox", { name: "Search places" }).fill("geisel");
    await showSection(page, isMobile, "Ideas");
    await expect(page.getByTestId("place-pl_geisel")).toBeVisible();
    await expect(page.getByTestId("place-pl_padel")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search places" }).fill("zzzzqq");
    await expect(page.getByText("No places match.")).toBeVisible();
  });

  test("add place (explicit coordinates, no network)", async ({ page, isMobile }) => {
    await loginViaApi(page);
    await page.goto("/places");
    await page.getByRole("button", { name: "Add place" }).click();
    const dlg = page.getByRole("dialog", { name: "Add place" });
    await dlg.getByLabel("Name").fill("Test Taqueria");
    await dlg.getByLabel("Address").fill("1 Test St, La Jolla, CA");
    await dlg.getByLabel("Category").selectOption("food");
    await dlg.getByLabel("Tags").fill("halal, tacos");
    await dlg.getByLabel("Latitude (optional)").fill("32.85");
    await dlg.getByLabel("Longitude (optional)").fill("-117.27");
    await dlg.getByRole("button", { name: "Add place" }).click();
    await expect(dlg).toBeHidden();
    await showSection(page, isMobile, "Food");
    await expect(page.getByTestId("sec-food").getByText("Test Taqueria")).toBeVisible();
  });

  test("edit place persists", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/places/pl_rose_canyon");
    await expect(page.getByTestId("route-place-detail")).toBeVisible();
    const form = page.getByRole("form", { name: "Edit place" });
    await form.getByLabel("Name").fill("Rose Canyon Renamed");
    await form.getByLabel("Tags").fill("hike, shade");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(form.getByRole("status")).toHaveText("Saved");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Rose Canyon Renamed" })).toBeVisible();
    await expect(page.getByText("Shade", { exact: true })).toBeVisible();
  });

  test("add idea to a day, then remove from schedule", async ({ page, isMobile }) => {
    await loginViaApi(page);
    await page.goto("/places");
    await showSection(page, isMobile, "Ideas");
    await page.getByTestId("place-pl_geisel").getByRole("button", { name: "Add to day" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Day").selectOption("2026-11-02");
    await dlg.getByLabel("Time").fill("19:30");
    await dlg.getByRole("button", { name: "Add to day" }).click();
    await expect(dlg).toBeHidden();
    await showSection(page, isMobile, "Ideas");
    await expect(page.getByTestId("place-pl_geisel")).toHaveCount(0);
    await showSection(page, isMobile, "Scheduled");
    const row = page.getByTestId("sec-schedule").locator("[data-testid^=sched-]").filter({ hasText: "UCSD Geisel Library" });
    await expect(row).toContainText("7:30p");
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row).toHaveCount(0);
    await showSection(page, isMobile, "Ideas");
    await expect(page.getByTestId("place-pl_geisel")).toBeVisible();
  });

  test("skip booked, locked has no remove", async ({ page, isMobile }) => {
    await loginViaApi(page);
    await page.goto("/places");
    await showSection(page, isMobile, "Scheduled");
    const harbor = page.getByTestId("sched-ev_sun_harbor");
    await harbor.getByRole("button", { name: "Skip" }).click();
    await expect(harbor.getByRole("button", { name: "Unskip" })).toBeVisible();
    await harbor.getByRole("button", { name: "Unskip" }).click();
    await expect(harbor.getByRole("button", { name: "Skip", exact: true })).toBeVisible();
    const locked = page.getByTestId("sched-ev_sat_checkin");
    await expect(locked.getByRole("button")).toHaveCount(0);
    await expect(locked).toContainText("Fixed");
  });

  test("detail page: navigation, change time, move to ideas, delete", async ({ page, isMobile }) => {
    await loginViaApi(page);
    await page.goto("/places");
    await showSection(page, isMobile, "Scheduled");
    await page.getByTestId("sched-ev_sat_dinner").getByRole("link").click();
    await expect(page).toHaveURL(/\/places\/pl_/);
    await expect(page.getByRole("heading", { name: "Zoya", level: 1 })).toBeVisible();
    const card = page.getByTestId("scheduled-card");
    await expect(card).toContainText("7:00 PM");
    await card.getByRole("button", { name: "Change time" }).click();
    await page.getByRole("dialog").getByLabel("Time").fill("18:00");
    await page.getByRole("dialog").getByRole("button", { name: "Save time" }).click();
    await expect(card).toContainText("6:00 PM");
    await card.getByRole("button", { name: "Move to ideas" }).click();
    await expect(card).toContainText("Not scheduled");
    await page.getByRole("button", { name: "Delete place" }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page).toHaveURL(/\/places$/);
    await showSection(page, isMobile, "Food");
    await expect(page.getByTestId("sec-food").getByText("Zoya")).toHaveCount(0);
  });

  test("logged out is read-only", async ({ page, isMobile }) => {
    await page.goto("/places");
    await expect(page.getByRole("button", { name: "Add place" })).toBeDisabled();
    await showSection(page, isMobile, "Scheduled");
    await expect(page.getByTestId("sched-ev_sat_brunch").getByRole("button", { name: "Remove" })).toBeDisabled();
    await showSection(page, isMobile, "Ideas");
    await expect(page.getByTestId("place-pl_geisel").getByRole("button", { name: "Add to day" })).toBeDisabled();
    await page.goto("/places/pl_geisel");
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete place" })).toBeDisabled();
  });

  test("layout: segmented control on mobile only", async ({ page, isMobile }) => {
    await page.goto("/places");
    await expect(page.getByRole("tab", { name: "Scheduled" })).toBeVisible({ visible: isMobile });
    if (isMobile) {
      await expect(page.getByTestId("sec-ideas")).toBeHidden();
      await page.getByRole("tab", { name: "Ideas" }).click();
      await expect(page.getByTestId("sec-ideas")).toBeVisible();
      await expect(page.getByTestId("sec-schedule")).toBeHidden();
    } else {
      await expect(page.getByTestId("sec-ideas")).toBeVisible();
      await expect(page.getByTestId("sec-schedule")).toBeVisible();
    }
  });
});
