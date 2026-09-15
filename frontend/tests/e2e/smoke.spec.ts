import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/giris",
  "/kayit",
  "/ihtiyac-olustur",
  "/kesfet",
  "/hakkimizda",
  "/hizmetler",
  "/nasil-calisir",
  "/sozlesmeler",
];

for (const route of publicRoutes) {
  test(`${route} sayfasi aciliyor`, async ({ page }) => {
    const response = await page.goto(route, {
      waitUntil: "domcontentloaded",
    });

    expect(response, `${route} HTTP response vermedi`).not.toBeNull();
    expect(response?.status(), `${route} HTTP hata verdi`).toBeLessThan(400);

    await expect(page.locator("body")).toBeVisible();
  });
}

test("ana sayfada marka gorunuyor", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "neyeihtiyacvar.com ana sayfa" }).first(),
  ).toBeVisible();
});