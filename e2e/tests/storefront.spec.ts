import { expect, test } from "@playwright/test";

test("lojista publica e o cliente encontra o produto", async ({ page }) => {
  const stamp = Date.now().toString();
  const categoryName = `Cestos ${stamp}`;
  const productName = `Luminaria Aurora ${stamp}`;

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();

  await page.getByTestId("nav-categorias").click();
  await page.getByTestId("category-name").fill(categoryName);
  await page.getByTestId("category-submit").click();
  await expect(page.getByRole("list").getByText(categoryName)).toBeVisible();

  await page.getByTestId("nav-produtos").click();
  await page.getByTestId("new-product").click();
  await page.getByTestId("product-name").fill(productName);
  await page.getByTestId("product-category").selectOption({ label: categoryName });
  await page.getByTestId("product-publish").check();
  await page.getByTestId("product-submit").click();
  await expect(page.getByTestId("product-name")).toHaveValue(productName);

  const slug = `luminaria-aurora-${stamp}`;
  await page.goto(`/produtos/${slug}`);
  await expect(page.getByTestId("product-title")).toHaveText(productName);

  await page.goto(`/busca?q=${stamp}`);
  await expect(page.getByText(productName)).toBeVisible();

  await page.context().route(/wa\.me/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
  await page.goto(`/produtos/${slug}`);
  const cta = page.getByTestId("contact-cta").last();
  await expect(cta).toHaveAttribute("href", /wa\.me/);
  const popupPromise = page.waitForEvent("popup");
  await cta.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/wa\.me/);
  await popup.close();

  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(`/produtos/${slug}`);
});
