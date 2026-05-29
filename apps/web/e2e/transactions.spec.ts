import { test, expect } from "@playwright/test";

// Uses the authenticated storageState from e2e/setup/auth.setup.ts.
// Seed data is read-only — these tests never mutate any records.

test.describe("Transactions smoke", () => {
  test("page loads the transactions table or empty state", async ({ page }) => {
    await page.goto("/transactions");

    // Either the table renders (with column headers) or the empty-state message
    // appears. Both are valid — the smoke test only verifies no crash/error.
    const table = page.getByRole("table");
    const emptyState = page.getByText(/no transactions found/i);

    await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });

  test("table header columns are present when data is loaded", async ({
    page,
  }) => {
    await page.goto("/transactions");

    // Check for the table. If there are no transactions we skip column checks.
    const table = page.getByRole("table");
    const hasTable = await table
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasTable) return;

    await expect(
      page.getByRole("columnheader", { name: "Date" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Description" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Bank" })
    ).toBeVisible();
  });

  test("filter by category updates the URL", async ({ page }) => {
    await page.goto("/transactions");

    // Wait for the filter bar to appear (the category combobox is always rendered)
    const categoryTrigger = page
      .getByRole("combobox")
      .filter({ hasText: /all categories/i });
    await expect(categoryTrigger).toBeVisible();

    // Open the dropdown
    await categoryTrigger.click();

    // Pick the first real category option (skip "All categories" which is index 0)
    const options = page.getByRole("option");
    await options.first().waitFor();
    const count = await options.count();

    if (count <= 1) {
      // Only "All categories" is present — no seed categories to pick
      await page.keyboard.press("Escape");
      return;
    }

    // Click the second option (first real category)
    const categoryName = await options.nth(1).textContent();
    await options.nth(1).click();

    // URL should now contain the selected category
    await expect(page).toHaveURL(/category=/);
    // Confirm the trigger now shows the chosen category, not the placeholder
    await expect(categoryTrigger).not.toHaveText(/all categories/i);

    // Navigate back to clear the filter
    const clearTrigger = page
      .getByRole("combobox")
      .filter({ hasText: categoryName ?? "" });
    await clearTrigger.click();
    await page.getByRole("option", { name: "All categories" }).click();
    await expect(page).not.toHaveURL(/category=/);
  });

  test("clicking a row opens the reclassify drawer", async ({ page }) => {
    await page.goto("/transactions");

    const table = page.getByRole("table");
    const hasTable = await table
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (!hasTable) {
      // No transactions in seed — skip drawer test
      test.skip();
      return;
    }

    // Click the first data row (skip the header row)
    const rows = page.getByRole("row");
    const rowCount = await rows.count();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    await rows.nth(1).click();

    // The reclassify Sheet should open
    await expect(
      page.getByRole("heading", { name: /reclassify transaction/i })
    ).toBeVisible();
  });
});
