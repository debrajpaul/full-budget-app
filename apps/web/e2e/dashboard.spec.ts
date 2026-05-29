import { test, expect } from "@playwright/test";

// Uses the authenticated storageState from e2e/setup/auth.setup.ts.
// All tests in this file start already logged in as dev@local.test.

test.describe("Dashboard smoke", () => {
  test("renders the three KPI cards", async ({ page }) => {
    await page.goto("/dashboard");

    // KPI card labels are always rendered even when amounts are zero
    await expect(page.getByText("Income")).toBeVisible();
    await expect(page.getByText("Expenses")).toBeVisible();
    await expect(page.getByText("Net savings")).toBeVisible();
  });

  test("KPI cards are not in an error state", async ({ page }) => {
    await page.goto("/dashboard");

    // None of the three KPI regions should contain an error message
    await expect(
      page.getByText(/failed to load|something went wrong|error/i)
    ).not.toBeVisible();
  });

  test("month picker navigates to previous month and updates URL", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Wait for the month display to be visible
    const monthLabel = page.locator('[aria-label="Previous month"]');
    await expect(monthLabel).toBeVisible();

    // Click Previous month
    await page.getByRole("link", { name: "Previous month" }).click();

    // URL should now carry explicit m= and y= query params
    await expect(page).toHaveURL(/[?&]m=\d+/);
    await expect(page).toHaveURL(/[?&]y=\d+/);
  });

  test("month picker navigates forward to next month", async ({ page }) => {
    // Start one month back so there is a valid "next" month to navigate to
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    await page.goto(`/dashboard?m=${prevMonth}&y=${prevYear}`);
    await page.getByRole("link", { name: "Next month" }).click();

    await expect(page).toHaveURL(/[?&]m=\d+/);
  });
});
