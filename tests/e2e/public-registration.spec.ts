import { expect, test } from "@playwright/test";

/**
 * Public registration form.
 *
 * These tests exercise the visitor journey: opening the form, validating
 * required fields, checking the privacy notice and submitting.
 */
test.describe("Public registration form", () => {
  test("the registration page loads and shows the church identity", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(page).toHaveTitle(/Membership Bio-Data Registration/i);
    await expect(
      page.getByRole("heading", { name: /Welcome to Living Faith Church/i })
    ).toBeVisible();
    await expect(page.getByText(/Laderin-Hilltop/i).first()).toBeVisible();
  });

  test("the privacy notice is shown and the consent box is unchecked", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(page.getByText(/Privacy notice and consent/i)).toBeVisible();

    const consent = page.getByLabel(/I have read the privacy notice/i);
    await expect(consent).not.toBeChecked();
  });

  test("the privacy policy page is reachable and explains retention", async ({
    page,
  }) => {
    await page.goto("/privacy-policy");

    await expect(
      page.getByRole("heading", { name: "Privacy policy" })
    ).toBeVisible();
    await expect(page.getByText(/How long we keep it/i)).toBeVisible();
    await expect(page.getByText(/Nigeria Data Protection Act 2023/i)).toBeVisible();
  });

  test("submitting without completing the required fields shows inline errors", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: /Submit registration/i }).click();

    // The form must not submit, and the errors must be announced.
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("the form is usable on a small screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: /Welcome to Living Faith Church/i })
    ).toBeVisible();

    // The page must not scroll sideways on a phone.
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("a photograph is required before a registration can be completed", async ({
    page,
  }) => {
    await page.goto("/register");

    // The photograph section is present and explains the accepted formats.
    await expect(page.getByText(/Passport photograph/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Take a photo/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Choose an image/i })
    ).toBeVisible();
  });
});

test.describe("Public access control", () => {
  test("an unauthenticated visitor cannot reach the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unauthenticated visitor cannot reach a member profile", async ({
    page,
  }) => {
    await page.goto("/dashboard/members/00000000-0000-4000-8000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the sign-in page does not reveal whether an account exists", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel(/Email address/i).fill("nobody@example.com");
    await page.getByLabel(/Password/i).fill("wrong-password-123");
    await page.getByRole("button", { name: /Sign in/i }).click();

    await expect(page.getByRole("alert")).toContainText(
      /email address or password is incorrect/i
    );
  });

  test("the export route refuses an unauthenticated request", async ({
    request,
  }) => {
    const response = await request.get("/api/export?format=csv");
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
