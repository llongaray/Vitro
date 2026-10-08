import { expect, test } from "@playwright/test";

test("o dono publica um anúncio no topo e o editor não grava configurações", async ({ page }) => {
  const stamp = Date.now().toString();
  const title = `Oferta ${stamp}`;
  const email = `editor.${stamp}@example.com`;

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();

  await page.goto("/admin/modulos");
  const toggle = page.getByTestId("module-ads");
  await expect(toggle).toBeVisible();
  if ((await toggle.textContent())?.includes("Desligado")) await toggle.click();
  await expect(toggle).toHaveText("Ligado");

  await page.goto("/admin/anuncios");
  await page.getByTestId("ad-title").fill(title);
  await page.getByTestId("ad-url").fill("https://example.com/oferta");
  await page.getByTestId("ad-position").selectOption("HOME_TOP");
  await page.getByTestId("ad-submit").click();
  await expect(page.getByText("Anúncio publicado.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("ad-HOME_TOP").filter({ hasText: title })).toBeVisible();

  await page.goto("/admin/equipe");
  await page.getByTestId("user-name").fill("Editor da loja");
  await page.getByTestId("user-email").fill(email);
  await page.getByTestId("user-password").fill("senha-forte");
  await page.getByTestId("user-role").selectOption("EDITOR");
  await page.getByTestId("user-submit").click();
  await expect(page.getByText("Pessoa adicionada.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("senha-forte");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();
  await expect(page.getByTestId("nav-configuracoes")).toHaveCount(0);

  await page.goto("/admin/configuracoes");
  await expect(page.locator('input[name="trade_name"]')).not.toHaveValue("");
  await page.getByTestId("settings-submit").click();
  await expect(page.getByTestId("settings-error")).toContainText("Sem permissão");
});
