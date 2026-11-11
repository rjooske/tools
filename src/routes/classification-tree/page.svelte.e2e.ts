import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/classification-tree");
  await expect(page.getByLabel("Tree root")).toBeVisible();
});

test("toggling a cell in grid mode updates coverage, and undo restores it", async ({
  page,
}) => {
  const covered = page
    .locator(".stat", { hasText: "Leaves covered" })
    .locator("b");
  await expect(covered).toHaveText("9/9");

  await page.keyboard.press("t");
  await page.keyboard.press("x");
  await expect(covered).toHaveText("8/9");

  await page.keyboard.press("u");
  await expect(covered).toHaveText("9/9");
});

test("adding a child with the keyboard lands in the name field", async ({
  page,
}) => {
  await page.keyboard.press("a");
  const name = page.locator("#name-input");
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("new aspect");

  await page.keyboard.type("colour");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Classification colour")).toBeVisible();
});

test("edits survive a reload", async ({ page }) => {
  await page.getByRole("button", { name: "New tree" }).click();
  await page.keyboard.type("persisted");
  await page.reload();
  await expect(page.locator("#doc-select option:checked")).toHaveText(
    "persisted",
  );
});

test("import rejects bad JSON and accepts an export", async ({ page }) => {
  await page.getByRole("button", { name: "Import / Export" }).click();
  await page.getByRole("button", { name: "Import as new tree" }).click();
  await expect(page.locator("#doc-select option:checked")).toHaveText(
    "List search (example) (imported)",
  );
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Import / Export" }).click();
  await page.locator("#io-text").fill("{");
  await page.getByRole("button", { name: "Import as new tree" }).click();
  await expect(page.getByText("That is not valid JSON")).toBeVisible();
});

test("space toggles a cell after a node was selected with the mouse", async ({
  page,
}) => {
  const covered = page
    .locator(".stat", { hasText: "Leaves covered" })
    .locator("b");
  await page.getByLabel("Class 0").click();
  await page.keyboard.press("t");
  await page.keyboard.press("Space");

  await expect(page.locator("#name-input")).not.toBeFocused();
  await expect(covered).toHaveText("8/9");
});

test("double-clicking a node starts a rename", async ({ page }) => {
  await page.getByLabel("Class 0").dblclick();
  await expect(page.locator("#name-input")).toBeFocused();
  await expect(page.locator("#name-input")).toHaveValue("0");
});

test("dragging a case reorders the test cases", async ({ page }) => {
  const chips = (i: number) => page.locator(".case").nth(i).locator(".chips");
  await expect(chips(0)).toHaveText("length: 0");

  await page
    .locator(".case")
    .first()
    .dragTo(page.locator(".case").nth(2), {
      targetPosition: { x: 40, y: 20 },
    });
  await expect(chips(0)).not.toHaveText("length: 0");
  await expect(chips(2)).toHaveText("length: 0");
});

test("j and k cross between a leaf class and the grid", async ({ page }) => {
  const mode = page.locator(".app");
  const row = page.locator(".row.cur .rowlabel");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(page.getByLabel("Class 0")).toHaveClass(/sel/);

  await page.keyboard.press("j");
  await expect(mode).toHaveAttribute("data-mode", "grid");
  await expect(row).toHaveText("tc1");

  await page.keyboard.press("w");
  await expect(row).toHaveText("tc2");

  await page.keyboard.press("2");
  await page.keyboard.press("k");
  await expect(mode).toHaveAttribute("data-mode", "tree");
  await expect(page.getByLabel("Class no").first()).toHaveClass(/sel/);
});
