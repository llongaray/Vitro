import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(process.env.DEMO_OWNER_EMAIL ?? "owner@example.com");
  await page.getByTestId("login-password").fill(process.env.DEMO_OWNER_PASSWORD ?? "Vitrio.demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();
}

test("cria uma loja e entra com o dono novo", async ({ page }) => {
  const stamp = Date.now().toString();
  const slug = `loja${stamp}`;
  await page.goto("http://localhost:8080/");
  await page.locator('input[name="store_name"]').fill(`Loja ${stamp}`);
  await page.locator('input[name="slug"]').fill(slug);
  await page.locator('input[name="owner_name"]').fill("Dono Novo");
  await page.locator('input[name="email"]').fill(`dono.${stamp}@example.com`);
  await page.locator('input[name="password"]').fill("senha-loja-1");
  const created = page.waitForResponse((response) => response.url().includes("/api/v1/auth/register-store") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Criar loja" }).click();
  expect((await created).ok()).toBeTruthy();
  await page.waitForURL(new RegExp(`${slug}\\.localhost`));
  await page.getByTestId("login-email").fill(`dono.${stamp}@example.com`);
  await page.getByTestId("login-password").fill("senha-loja-1");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-home")).toBeVisible();
});

test("rascunho, publicação, uma única gravação, imagem e vitrine", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString();
  const draftName = `Rascunho ${stamp}`;
  const liveName = `Publicado ${stamp}`;
  await login(page);

  await page.getByTestId("nav-categorias").click();
  await page.getByTestId("category-name").fill(`Filtro ${stamp}`);
  const categorySaved = page.waitForResponse((response) => response.url().includes("/api/v1/categories") && response.request().method() === "POST");
  await page.getByTestId("category-submit").click();
  expect((await categorySaved).ok()).toBeTruthy();
  await expect(page.getByRole("list").getByText(`Filtro ${stamp}`)).toBeVisible();

  await page.getByTestId("nav-produtos").click();
  await page.getByTestId("new-product").click();
  await page.getByTestId("product-name").fill(draftName);
  const draft = page.waitForResponse((response) => response.url().includes("/api/v1/products") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  const draftResponse = await draft;
  expect(draftResponse.ok()).toBeTruthy();
  expect((await draftResponse.json()).published).toBe(false);
  await expect(page).toHaveURL(/\/admin\/produtos\/(?!novo)[^/]+$/);
  await page.reload();
  await expect(page.getByTestId("product-publish")).not.toBeChecked();
  await page.goto(`/busca?q=${encodeURIComponent(draftName)}`);
  await expect(page.getByRole("link", { name: draftName })).toHaveCount(0);

  await page.goto("/admin/produtos/novo");
  await page.getByTestId("product-name").fill(liveName);
  await page.getByTestId("product-category").selectOption({ label: `Filtro ${stamp}` });
  await page.getByTestId("product-publish").check();
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/v1/products")) posts += 1;
  });
  await page.evaluate(() => {
    const form = document.querySelector("form");
    if (!(form instanceof HTMLFormElement)) return;
    form.requestSubmit();
    form.requestSubmit();
    const name = document.querySelector("[data-testid=product-name]");
    if (name instanceof HTMLInputElement) {
      name.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
  });
  await expect.poll(() => posts).toBe(1);
  await expect(page).toHaveURL(/\/admin\/produtos\/(?!novo)[^/]+$/);
  await expect(page.getByTestId("product-name")).toHaveValue(liveName);
  const uploaded = page.waitForResponse((response) => response.url().includes("/images") && response.request().method() === "POST");
  await page.locator('input[type="file"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  expect((await uploaded).ok()).toBeTruthy();
  await page.reload();
  await expect(page.locator("img").first()).toBeVisible();

  await page.goto(`/busca?q=${encodeURIComponent(liveName)}`);
  await expect(page.getByRole("link", { name: liveName })).toBeVisible();
  await page.goto(`/produtos?q=${encodeURIComponent(stamp)}&category=filtro-${stamp}`);
  await expect(page.getByRole("link", { name: liveName })).toBeVisible();
  await expect(page.getByRole("link", { name: draftName })).toHaveCount(0);

  await page.goto("/admin/produtos");
  await page.getByRole("link", { name: liveName }).click();
  await page.getByTestId("product-publish").uncheck();
  const hidden = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/v1/products/"));
  await page.getByTestId("product-submit").click();
  const hiddenResponse = await hidden;
  expect(hiddenResponse.ok()).toBeTruthy();
  expect((await hiddenResponse.json()).published).toBe(false);
  await page.reload();
  await expect(page.getByTestId("product-publish")).not.toBeChecked();
  await page.goto(`/busca?q=${encodeURIComponent(liveName)}`);
  await expect(page.getByRole("link", { name: liveName })).toHaveCount(0);
});

test("aparência, cor e página institucional permanecem depois de recarregar", async ({ page }) => {
  const stamp = Date.now().toString();
  const hero = `Hero da validação ${stamp}`;
  const title = `Institucional ${stamp}`;
  await login(page);

  await page.goto("/admin/aparencia");
  await expect(page.getByTestId("appearance-submit")).toBeEnabled();
  await page.locator("textarea").fill(hero);
  const appearance = page.waitForResponse((response) => response.url().includes("/api/v1/appearance") && response.request().method() === "PATCH");
  await page.getByTestId("appearance-submit").click();
  expect((await appearance).ok()).toBeTruthy();
  await page.reload();
  await expect(page.locator("textarea")).toHaveValue(hero);
  await page.goto("/");
  await expect(page.getByTestId("home-hero")).toContainText(hero);

  await page.goto("/admin/configuracoes");
  await expect(page.getByTestId("settings-submit")).toBeEnabled();
  await page.locator('input[name="primary_color"]').fill("#112233");
  const settings = page.waitForResponse((response) => response.url().includes("/api/v1/settings") && response.request().method() === "PATCH");
  await page.getByTestId("settings-submit").click();
  const settingsResponse = await settings;
  expect(settingsResponse.ok()).toBeTruthy();
  expect((await settingsResponse.json()).primary_color).toBe("#112233");
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--brand").trim())).toBe("#112233");

  await page.goto("/admin/paginas");
  await page.getByLabel("Título").fill(title);
  await page.locator("textarea").fill("Texto institucional da validação.");
  const pageSaved = page.waitForResponse((response) => response.url().includes("/api/v1/pages") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar página" }).click();
  expect((await pageSaved).ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByText(title)).toBeVisible();
  await page.goto(`/pagina/institucional-${stamp}`);
  await expect(page.getByText("Texto institucional da validação.")).toBeVisible();
});

test("catálogo pagina e o menu mobile da loja real não estoura a tela", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString();
  await login(page);
  const token = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    const body = await response.json();
    return body.access_token as string;
  });
  for (let index = 0; index < 13; index += 1) {
    const response = await page.request.post("/api/v1/products", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Grade ${stamp} ${index}`, publish: true, price: 10 + index },
    });
    expect(response.ok()).toBeTruthy();
  }
  await page.goto(`/produtos?q=${encodeURIComponent(`Grade ${stamp}`)}`);
  await expect(page.getByRole("navigation", { name: "Paginação" })).toBeVisible();
  await page.getByRole("link", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(`Grade ${stamp}`).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/admin/login");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await login(page);
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Gestão da loja" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/produtos");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
