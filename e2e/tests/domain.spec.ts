import { expect, test } from "@playwright/test";

test("importa um produto e a home segue a ordem das seções", async ({ page }) => {
  const stamp = Date.now().toString();
  const productName = `Luminaria CSV ${stamp}`;
  const slug = `luminaria-csv-${stamp}`;

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();

  await page.goto("/admin/importar");
  await page.getByTestId("import-file").setInputFiles({
    name: "produtos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`name,slug,price,published\n${productName},${slug},42.50,true\n`),
  });
  await page.getByTestId("import-submit").click();
  await expect(page.getByTestId("import-result")).toContainText("Criados: 1");

  await page.goto(`/produtos/${slug}`);
  await expect(page.getByTestId("product-title")).toContainText(productName);

  await page.goto("/admin/aparencia");
  await expect(page.getByTestId("section-list")).toBeVisible();
  for (let step = 0; step < 8; step += 1) {
    const first = page.getByTestId("section-list").locator("li").first();
    if ((await first.getAttribute("data-section")) === "about") break;
    await page.getByTestId("section-up-about").click();
  }
  await expect(page.getByTestId("section-list").locator("li").first()).toHaveAttribute("data-section", "about");
  await page.getByTestId("appearance-submit").click();
  await expect(page.getByTestId("appearance-saved")).toContainText("Aparência salva");

  await page.goto("/");
  const about = await page.getByTestId("home-about").boundingBox();
  const hero = await page.getByTestId("home-hero").boundingBox();
  expect(about).not.toBeNull();
  expect(hero).not.toBeNull();
  expect(about!.y).toBeLessThan(hero!.y);
});
