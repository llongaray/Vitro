import { expect, test } from "@playwright/test";

test("campanha, cupom de cadastro e redirect de slug", async ({ page }) => {
  const stamp = Date.now().toString();
  const productName = `Vela P1 ${stamp}`;
  const code = `BEM${stamp}`;

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();

  await page.getByTestId("nav-produtos").click();
  await page.getByTestId("new-product").click();
  await page.getByTestId("product-name").fill(productName);
  await page.getByTestId("product-publish").check();
  await page.getByTestId("product-submit").click();
  await expect(page.getByTestId("product-name")).toHaveValue(productName);

  await page.goto("/admin/promocoes");
  await expect(page.getByRole("heading", { name: "Promoções" })).toBeVisible();
  await page.getByTestId("promotion-name").fill(`Semana ${stamp}`);
  await page.getByTestId("promotion-price").fill("19.90");
  await page.locator("label").filter({ hasText: productName }).getByRole("checkbox").check();
  await page.getByTestId("promotion-submit").click();
  await expect(page.getByText(productName).last()).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("home-promotions")).toContainText(productName);

  await page.goto("/admin/cupons");
  await page.getByTestId("coupon-code-input").fill(code);
  await page.getByTestId("coupon-name").fill("Boas-vindas");
  await page.getByTestId("coupon-value").fill("10");
  await page.getByTestId("coupon-signup").check();
  await page.getByTestId("coupon-submit").click();
  await expect(page.getByText(code)).toBeVisible();

  await page.goto("/cadastro");
  await page.getByTestId("customer-name").fill("Ana Cliente");
  await page.getByTestId("customer-email").fill(`ana-${stamp}@example.com`);
  await page.getByTestId("customer-phone").fill("11988887777");
  await page.getByTestId("customer-terms").check();
  await page.getByTestId("customer-submit").click();
  await expect(page.getByTestId("coupon-code")).toHaveText(code);

  await page.goto("/admin/produtos");
  await page.getByRole("link", { name: productName }).click();
  await page.getByTestId("product-slug").fill(`vela-final-${stamp}`);
  const saved = page.waitForResponse((response) => response.url().includes("/api/v1/products/") && response.request().method() === "PATCH");
  await page.getByTestId("product-submit").click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.getByTestId("product-slug")).toHaveValue(`vela-final-${stamp}`);

  await page.goto(`/produtos/vela-p1-${stamp}`);
  await expect(page).toHaveURL(new RegExp(`/produtos/vela-final-${stamp}`));
  await expect(page.getByTestId("product-title")).toHaveText(productName);
});
