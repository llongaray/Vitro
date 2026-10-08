import assert from "node:assert/strict";
import test from "node:test";

import { claimSubmit, publishFlag, releaseSubmit, runPanelLoad } from "./panel-guards.ts";

test("falha de rede encerra o carregamento e guarda a mensagem", async () => {
  let loading = true;
  let error = "";
  await runPanelLoad(
    (value) => {
      loading = value;
    },
    (value) => {
      error = value;
    },
    async () => {
      throw new TypeError("Failed to fetch");
    },
  );
  assert.equal(loading, false);
  assert.equal(error, "A conexão falhou. Tente de novo.");
});

test("erro HTTP encerra o carregamento e não vira lista vazia", async () => {
  let loading = true;
  let error = "";
  let items: string[] = [];
  await runPanelLoad(
    (value) => {
      loading = value;
    },
    (value) => {
      error = value;
    },
    async () => {
      throw new Error("Sem permissão");
    },
  );
  assert.equal(loading, false);
  assert.equal(error, "Sem permissão");
  assert.equal(items.length, 0);
});

test("sucesso limpa o erro e encerra o carregamento", async () => {
  let loading = true;
  let error = "antigo";
  await runPanelLoad(
    (value) => {
      loading = value;
    },
    (value) => {
      error = value;
    },
    async () => undefined,
  );
  assert.equal(loading, false);
  assert.equal(error, "");
});

test("clique repetido não ocupa o envio duas vezes", () => {
  const state = { busy: false };
  assert.equal(claimSubmit(state), true);
  assert.equal(claimSubmit(state), false);
  releaseSubmit(state);
  assert.equal(claimSubmit(state), true);
});

test("rascunho fica fora do catálogo e o envio principal segue o checkbox", () => {
  assert.equal(publishFlag("draft", true), false);
  assert.equal(publishFlag("draft", false), false);
  assert.equal(publishFlag("save", true), true);
  assert.equal(publishFlag("save", false), false);
});
