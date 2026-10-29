import { execSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "dev"; // APP_PASSWORD in .dev.vars

/** Restore the seed data in the running local D1 (also clears the travel-leg cache). ~2s. */
export function reseed() {
  execSync("pnpm db:seed:local", { stdio: "ignore" });
}

/** Log in through the real UI dialog. */
export async function loginViaUi(page: Page, password = PASSWORD) {
  await page.getByRole("button", { name: "Log in to edit" }).click();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

/** Fast login: sets the session cookie on the page's context via the API (no UI). */
export async function loginViaApi(page: Page, password = PASSWORD) {
  const res = await page.request.post("/api/auth/login", { data: { password } });
  expect(res.ok()).toBe(true);
}
