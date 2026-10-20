import { expect, test } from "@playwright/test";

/**
 * Authenticated dashboard tests.
 *
 * These require a seeded environment. They are skipped automatically when
 * the test credentials are not configured, so the suite can run in CI
 * without a database.
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

const testSkip = adminEmail && adminPassword ? false : true;

test.describe("Administrative dashboard", () => {
  test.skip(testSkip, "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are not configured.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Email address/i).fill(adminEmail!);
    await page.getByLabel(/Password/i).fill(adminPassword!);
    await page.getByRole("button", { name: /Sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("the dashboard shows the overview statistics", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Dashboard overview/i })
    ).toBeVisible();
    await expect(page.getByText(/Total members/i)).toBeVisible();
    await expect(page.getByText(/Members by service unit/i)).toBeVisible();
  });

  test("the member directory loads with a table and filters", async ({ page }) => {
    await page.goto("/dashboard/members");

    await expect(
      page.getByRole("heading", { name: /Member directory/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Search the directory/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
  });

  test("the member directory can switch to the card view", async ({ page }) => {
    await page.goto("/dashboard/members");

    await page.getByRole("button", { name: "Cards" }).click();
    await expect(page).toHaveURL(/view=cards/);
  });

  test("the search field filters the directory", async ({ page }) => {
    await page.goto("/dashboard/members");

    await page.getByLabel(/Search the directory/i).fill("a");
    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/q=a/);
  });

  test("duplicate review is reachable", async ({ page }) => {
    await page.goto("/dashboard/duplicates");
    await expect(
      page.getByRole("heading", { name: /Duplicate review/i })
    ).toBeVisible();
  });

  test("the application settings page is reachable", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(
      page.getByRole("heading", { name: /Application settings/i })
    ).toBeVisible();
  });
});
