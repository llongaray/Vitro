import { expect, test } from "@playwright/test";

test("cadastro gera aviso e o tema editorial antecipa a seção sobre", async ({ page }) => {
  const stamp = Date.now().toString();

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();

  await page.goto("/cadastro");
  await page.getByTestId("customer-name").fill(`Cliente ${stamp}`);
  await page.getByTestId("customer-email").fill(`cliente.${stamp}@example.com`);
  await page.getByTestId("customer-phone").fill("11988887777");
  await page.getByTestId("customer-terms").check();
  await page.getByTestId("customer-submit").click();
  await expect(page.getByRole("heading", { name: "Cadastro feito" })).toBeVisible();

  await page.goto("/admin");
  await page.getByTestId("notification-bell").click();
  const list = page.getByTestId("notification-list");
  await expect(list).toContainText("Novo cliente");
  await expect(list).not.toContainText(`cliente.${stamp}@example.com`);

  await page.goto("/admin/aparencia");
  await page.getByTestId("theme-apply-editorial").click();
  await expect(page.getByTestId("appearance-saved")).toContainText("Tema aplicado");

  await page.goto("/");
  const about = await page.getByTestId("home-about").boundingBox();
  const categories = await page.getByTestId("home-categories").boundingBox();
  expect(about).not.toBeNull();
  expect(categories).not.toBeNull();
  expect(about!.y).toBeLessThan(categories!.y);
});
