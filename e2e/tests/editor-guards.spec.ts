import { expect, test, type Page, type Route } from "@playwright/test";

const productA = {
  name: "Produto A",
  slug: "produto-a",
  short_description: "",
  description: "",
  price: "10",
  stock_display: "",
  show_price: "inherit",
  category_id: "",
  published: true,
  is_clearance: false,
  clearance_label: "",
  seo_title: "",
  seo_description: "",
  images: [],
};

const productB = { ...productA, name: "Produto B", slug: "produto-b", published: false };

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installApi(page: Page, handlers: (url: URL, method: string, route: Route) => Promise<boolean>) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith("/auth/refresh") && method === "POST") {
      await json(route, 200, { access_token: "teste" });
      return;
    }
    if (url.pathname.endsWith("/auth/me")) {
      await json(route, 200, { role: "OWNER", name: "Ana" });
      return;
    }
    if (url.pathname.endsWith("/settings")) {
      await json(route, 200, { trade_name: "Loja", primary_color: "#245b45" });
      return;
    }
    if (url.pathname.endsWith("/notifications")) {
      await json(route, 200, { unread: 0, items: [] });
      return;
    }
    if (url.pathname.endsWith("/categories")) {
      await json(route, 200, []);
      return;
    }
    if (await handlers(url, method, route)) return;
    await json(route, 404, { detail: url.pathname });
  });
}

test("falha no produto bloqueia o salvamento e a nova tentativa libera a edição", async ({ page }) => {
  let productStatus = 500;
  const patches: string[] = [];
  await installApi(page, async (url, method, route) => {
    if (!url.pathname.endsWith("/products/prod-a")) return false;
    if (method === "GET") {
      await json(route, productStatus, productStatus === 200 ? productA : { detail: "Produto indisponível" });
      return true;
    }
    if (method === "PATCH") {
      patches.push(route.request().postData() ?? "");
      await json(route, 200, productA);
      return true;
    }
    return false;
  });

  await page.goto("/admin/produtos/prod-a");
  await expect(page.getByText("Não foi possível carregar o produto")).toBeVisible();
  await expect(page.getByTestId("product-submit")).toBeDisabled();
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/images")) uploads.push(request.url());
  });
  await page.getByTestId("product-submit").evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.click();
  });
  await page.getByRole("button", { name: "Salvar rascunho" }).evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.click();
  });
  await page.locator('input[type="file"]').evaluate((input: HTMLInputElement) => {
    input.disabled = false;
    const file = new File(["foto"], "foto.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  expect(patches).toEqual([]);
  expect(uploads).toEqual([]);

  productStatus = 200;
  await page.getByTestId("product-load-retry").click();
  await expect(page.getByTestId("product-name")).toHaveValue("Produto A");
  await expect(page.getByTestId("product-submit")).toBeEnabled();
});

test("resposta antiga não preenche o produto aberto agora", async ({ page }) => {
  let releaseA: () => void = () => undefined;
  const waitA = new Promise<void>((resolve) => {
    releaseA = resolve;
  });
  await installApi(page, async (url, method, route) => {
    if (method !== "GET") return false;
    if (url.pathname.endsWith("/products/prod-a")) {
      await waitA;
      try {
        await json(route, 200, productA);
      } catch {
        return true;
      }
      return true;
    }
    if (url.pathname.endsWith("/products/prod-b")) {
      await json(route, 200, productB);
      return true;
    }
    return false;
  });

  await page.goto("/admin/produtos/prod-a");
  await page.goto("/admin/produtos/prod-b");
  await expect(page.getByTestId("product-name")).toHaveValue("Produto B");
  releaseA();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("product-name")).toHaveValue("Produto B");
});

test("resposta antiga na mesma instância não substitui o produto atual", async ({ page }) => {
  let releaseA: () => void = () => undefined;
  let fulfilledA = false;
  const waitA = new Promise<void>((resolve) => {
    releaseA = resolve;
  });
  await installApi(page, async (url, method, route) => {
    if (method !== "GET") return false;
    if (url.pathname.endsWith("/products/prod-a")) {
      await waitA;
      fulfilledA = true;
      await json(route, 200, productA);
      return true;
    }
    if (url.pathname.endsWith("/products/prod-b")) {
      await json(route, 200, productB);
      return true;
    }
    return false;
  });

  await page.goto("/admin/produtos/prod-a");
  await expect(page.getByTestId("product-name")).toBeVisible();
  const pushed = await page.evaluate((href) => {
    const field = document.querySelector("[data-testid=product-name]");
    if (!field) return "sem-campo";
    const fiberKey = Object.keys(field).find((key) => key.startsWith("__reactFiber$"));
    if (!fiberKey) return "sem-fiber";
    const host = field as unknown as Record<string, { return?: unknown } | undefined>;
    let fiber = host[fiberKey] as
      | {
          return?: unknown;
          dependencies?: { memoizedValue?: { push?: (path: string) => void; prefetch?: unknown }; next?: unknown };
        }
      | undefined;
    const seen = new Set<object>();
    while (fiber && !seen.has(fiber)) {
      seen.add(fiber);
      const current = fiber as {
        dependencies?: { firstContext?: { memoizedValue?: { push?: (path: string) => void; prefetch?: unknown }; next?: unknown } };
        return?: unknown;
      };
      let cursor = current.dependencies?.firstContext;
      while (cursor) {
        const value = cursor.memoizedValue;
        if (value && typeof value.push === "function" && typeof value.prefetch === "function") {
          value.push(href);
          return "ok";
        }
        cursor = cursor.next as typeof cursor;
      }
      fiber = current.return as typeof fiber;
    }
    return "sem-router";
  }, "/produtos/prod-b");
  expect(pushed).toBe("ok");
  await expect(page).toHaveURL(/\/admin\/produtos\/prod-b$/);
  await expect(page.getByTestId("product-name")).toHaveValue("Produto B");
  releaseA();
  await expect.poll(() => fulfilledA).toBe(true);
  await page.waitForTimeout(400);
  await expect(page.getByTestId("product-name")).toHaveValue("Produto B");
  await expect(page.getByTestId("product-submit")).toBeEnabled();
});

test("envio repetido, rascunho e checkbox", async ({ page }) => {
  let releasePatch: () => void = () => undefined;
  const patches: string[] = [];
  await installApi(page, async (url, method, route) => {
    if (!url.pathname.endsWith("/products/prod-a")) return false;
    if (method === "GET") {
      await json(route, 200, productA);
      return true;
    }
    if (method === "PATCH") {
      patches.push(route.request().postData() ?? "");
      await new Promise<void>((resolve) => {
        releasePatch = resolve;
      });
      await json(route, 200, productA);
      return true;
    }
    return false;
  });

  await page.goto("/admin/produtos/prod-a");
  await expect(page.getByTestId("product-name")).toHaveValue("Produto A");
  await page.getByTestId("product-publish").uncheck();
  await page.evaluate(() => {
    const button = document.querySelector("[data-testid=product-submit]");
    if (button instanceof HTMLButtonElement) {
      button.click();
      button.click();
    }
  });
  await expect.poll(() => patches.length).toBe(1);
  expect(JSON.parse(patches[0] ?? "{}").publish).toBe(false);
  releasePatch();
  await expect(page.getByTestId("product-submit")).toBeEnabled();

  patches.length = 0;
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect.poll(() => patches.length).toBe(1);
  expect(JSON.parse(patches[0] ?? "{}").publish).toBe(false);
  releasePatch();

  await page.getByTestId("product-publish").check();
  await page.getByTestId("product-submit").click();
  await expect.poll(() => patches.length).toBe(2);
  expect(JSON.parse(patches[1] ?? "{}").publish).toBe(true);
  releasePatch();
});

test("erro ao buscar temas aparece e a nova tentativa não apaga a aparência", async ({ page }) => {
  let themesStatus = 500;
  const appearancePatches: string[] = [];
  await installApi(page, async (url, method, route) => {
    if (url.pathname.endsWith("/appearance") && method === "GET") {
      await json(route, 200, { font_pair: "classic", hero_text: "Texto da loja", section_order: ["hero", "about"] });
      return true;
    }
    if (url.pathname.endsWith("/appearance") && method === "PATCH") {
      appearancePatches.push(route.request().postData() ?? "");
      await json(route, 200, {});
      return true;
    }
    if (url.pathname.endsWith("/themes") && method === "GET") {
      await json(route, themesStatus, themesStatus === 200 ? [{ id: "loja", name: "Tema loja", fonts: "Fraunces" }] : { detail: "Temas indisponíveis" });
      return true;
    }
    if (url.pathname.endsWith("/settings/overview")) {
      await json(route, 200, { products: 0, categories: 0, banners: 0, pages: 0 });
      return true;
    }
    return false;
  });

  await page.goto("/admin/aparencia");
  await expect(page.getByText("Não foi possível carregar os temas")).toBeVisible();
  await expect(page.getByTestId("theme-load-retry")).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("Texto da loja");
  await page.locator("textarea").fill("Texto editado");
  themesStatus = 200;
  await page.getByTestId("theme-load-retry").click();
  await expect(page.getByTestId("theme-apply-loja")).toBeVisible();
  await expect(page.locator("textarea")).toHaveValue("Texto editado");
  expect(appearancePatches).toEqual([]);
});

test("falha em appearance impede salvar os valores iniciais", async ({ page }) => {
  const patches: string[] = [];
  await installApi(page, async (url, method, route) => {
    if (url.pathname.endsWith("/appearance") && method === "GET") {
      await route.abort("failed");
      return true;
    }
    if (url.pathname.endsWith("/appearance") && method === "PATCH") {
      patches.push(route.request().postData() ?? "");
      await json(route, 200, {});
      return true;
    }
    if (url.pathname.endsWith("/themes") && method === "GET") {
      await json(route, 200, []);
      return true;
    }
    if (url.pathname.endsWith("/settings/overview")) {
      await json(route, 200, { products: 0, categories: 0, banners: 0, pages: 0 });
      return true;
    }
    return false;
  });

  await page.goto("/admin/aparencia");
  await expect(page.getByText("A conexão falhou. Tente de novo.")).toBeVisible();
  await expect(page.getByText("Buscando os dados da loja.")).toHaveCount(0);
  await expect(page.getByTestId("appearance-submit")).toBeDisabled();
  await page.getByTestId("appearance-submit").evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.closest("form")?.requestSubmit();
  });
  await page.waitForTimeout(300);
  expect(patches).toEqual([]);
});

test("falha de conexão na listagem encerra o carregamento", async ({ page }) => {
  await installApi(page, async (url, method, route) => {
    if (url.pathname.endsWith("/products") && method === "GET") {
      await route.abort("failed");
      return true;
    }
    return false;
  });

  await page.goto("/admin/produtos");
  await expect(page.getByText("A conexão falhou. Tente de novo.")).toBeVisible();
  await expect(page.getByText("Buscando os dados da loja.")).toHaveCount(0);
});

test("menu mobile prende o foco e o Escape devolve ao botão", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await installApi(page, async (url, method, route) => {
    if (url.pathname.endsWith("/products/prod-a") && method === "GET") {
      await json(route, 200, productA);
      return true;
    }
    return false;
  });
  await page.goto("/admin/produtos/prod-a");
  await page.getByRole("button", { name: "Menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Gestão da loja" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  const locked = await page.evaluate(() => {
    const header = document.querySelector("header");
    const content = document.getElementById("menu-painel")?.nextElementSibling;
    const menu = document.getElementById("menu-painel");
    return {
      headerInert: header instanceof HTMLElement ? header.inert : false,
      contentInert: content instanceof HTMLElement ? content.inert : false,
      menuScroll: menu instanceof HTMLElement ? getComputedStyle(menu).overflowY : "",
    };
  });
  expect(locked.headerInert).toBe(true);
  expect(locked.contentInert).toBe(true);
  expect(locked.menuScroll).toBe("auto");

  const menu = page.locator("#menu-painel");
  const first = menu.locator("a[href], button:not([disabled])").first();
  const last = menu.locator("a[href], button:not([disabled])").last();
  await last.focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect.poll(() => page.evaluate(() => document.querySelector("header") instanceof HTMLElement && (document.querySelector("header") as HTMLElement).inert)).toBe(false);

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect.poll(() => page.evaluate(() => document.querySelector("header") instanceof HTMLElement && (document.querySelector("header") as HTMLElement).inert)).toBe(false);
});
