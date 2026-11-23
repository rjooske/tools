import { expect, test } from "@playwright/test";

test("has expected h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("exported data imports back, replacing what is there", async ({
  page,
}) => {
  await page.goto("/decision-table");
  await page.getByRole("button", { name: "New table" }).click();
  await page.keyboard.type("Backed up");
  await page.goto("/");

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data" }).click();
  const backup = await (await downloading).path();

  await page.evaluate(() => localStorage.clear());
  page.once("dialog", (dialog) => dialog.accept());
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import all data" }).click();
  await (await choosing).setFiles(backup);
  await page.waitForEvent("load");

  await page.goto("/decision-table");
  await expect(page.locator("#doc-select")).toContainText("Backed up");
});

test("an invalid backup is rejected and changes nothing", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("tools-theme", "dark"));

  page.once("dialog", (dialog) => dialog.accept());
  const choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import all data" }).click();
  await (
    await choosing
  ).setFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "tools-backup",
        version: 1,
        exportedAt: "",
        data: { "tools-theme": "purple" },
      }),
    ),
  });

  await expect(page.getByRole("alert")).toContainText("tools-theme");
  expect(await page.evaluate(() => localStorage.getItem("tools-theme"))).toBe(
    "dark",
  );
});
