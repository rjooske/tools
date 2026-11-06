import { expect, test, type Page } from "@playwright/test";

const stat = (page: Page, name: string) =>
  page.locator(".stat", { hasText: name }).locator("b");

test.beforeEach(async ({ page }) => {
  await page.goto("/decision-table");
  await expect(page.getByRole("table")).toBeVisible();
});

test("the first example is complete", async ({ page }) => {
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");
  await expect(page.getByText("Complete: every one")).toBeVisible();
});

test("a don't care that makes rules overlap is reported, and undo clears it", async ({
  page,
}) => {
  await page.keyboard.press("x");
  await expect(page.locator("#table-cursor")).toHaveText("-");
  await expect(stat(page, "Contradictions")).toHaveText("3");

  await page.keyboard.press("u");
  await expect(stat(page, "Contradictions")).toHaveText("0");
});

test("deleting a rule reports the gap, and the check can fill it", async ({
  page,
}) => {
  await page.keyboard.press("$");
  await page.keyboard.press("d");
  await page.keyboard.press("r");
  await expect(stat(page, "Combinations covered")).toHaveText("7/8");
  await expect(
    page.getByText("1 of 8 combinations have no rule"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add 1 rule" }).click();
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");
  await expect(stat(page, "Rules without action")).toHaveText("1");
});

test("clicking an action cell marks it", async ({ page }) => {
  const cell = page.getByRole("row", { name: /^error/ }).getByRole("cell");
  await expect(cell.nth(0)).toHaveText("-");
  await cell.nth(0).click();
  await expect(cell.nth(0)).toHaveText("X");
  await expect(stat(page, "Contradictions")).toHaveText("0");
});

test("adding a condition doubles the combinations and lands in its name", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Condition" }).click();
  await expect(page.locator("#name-input")).toBeFocused();
  await page.keyboard.type("c4");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "c4" })).toBeVisible();
  await expect(stat(page, "Combinations covered")).toHaveText("16/16");
});

test("a third value multiplies the combinations", async ({ page }) => {
  await page.getByRole("button", { name: "Add value" }).click();
  await expect(stat(page, "Combinations covered")).toHaveText("8/12");
  await page.getByRole("button", { name: "Remove value v3" }).click();
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");
});

test("expanding and reducing keep the table complete", async ({ page }) => {
  await page.getByRole("button", { name: "Expand don't cares" }).click();
  await expect(
    page.locator(".stat", { hasText: /^\s*Rules\s+\d/ }).locator("b"),
  ).toHaveText("8");
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");

  await page.getByRole("button", { name: "Reduce rules" }).click();
  await expect(
    page.locator(".stat", { hasText: /^\s*Rules\s+\d/ }).locator("b"),
  ).toHaveText("4");
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");
});

test("the dependent example turns the coverage checks off", async ({
  page,
}) => {
  await page
    .locator("#doc-select")
    .selectOption({ label: "Mortgage (example)" });
  await expect(page.getByText("marked as dependent")).toBeVisible();
  await expect(stat(page, "Combinations covered")).toBeHidden();

  await page.getByRole("checkbox").check();
  await expect(stat(page, "Combinations covered")).toBeVisible();
});

test("a new table persists across a reload", async ({ page }) => {
  await page.getByRole("button", { name: "New table" }).click();
  await expect(page.locator("#table-name-input")).toBeFocused();
  await page.keyboard.type("persisted");
  await page.reload();
  await expect(page.locator("#doc-select option:checked")).toHaveText(
    "persisted",
  );
});

test("import accepts an export", async ({ page }) => {
  await page.getByRole("button", { name: "Import / Export" }).click();
  await page.getByRole("button", { name: "Import as new table" }).click();
  await expect(page.locator("#doc-select option:checked")).toHaveText(
    "Basic concepts (example) (imported)",
  );
  await expect(stat(page, "Combinations covered")).toHaveText("8/8");
});

test("space edits the cursor cell after a row was picked with the mouse", async ({
  page,
}) => {
  await page.getByRole("button", { name: "c2", exact: true }).click();
  await page.keyboard.press("Space");
  await expect(page.locator("#table-cursor")).toHaveText("T");
  await expect(page.locator(":focus")).toHaveCount(0);
});
