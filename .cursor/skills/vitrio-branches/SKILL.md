---
name: vitrio-branches
description: >-
  Aplica o fluxo de branches do Vitrio (tst, hml, main) antes de commit, push,
  pull request ou nova versão. Use quando o usuário pedir para commitar, subir
  no GitHub, criar branch, publicar versão, ou mencionar tst, hml, main, teste
  ou homologação.
---

# Branches do Vitrio

Leia esta skill antes de qualquer `git commit`, `git push` ou criação de branch neste repositório.

## Escolha da branch

1. Ainda não testado, inacabado ou em teste: `tst-v.X`
2. Testado e ainda fora da `main`: `hml-v.X`
3. `main` só com o que já funciona. A mensagem do commit na `main` é apenas a versão do arquivo.

`X` segue o pedido do usuário (`1.5` vira `1.5.0` quando a versão tiver dois números). Não invente outro nome de branch.

Trabalho novo sem teste vai para `tst`, nunca para `hml` e nunca para `main`.

## Commit

- Um arquivo por commit.
- Em `tst-v.X` e `hml-v.X`:

```text
add 1.5.0 tst-v.1.5.0 descrição curta do que entrou
fix 1.5.1 tst-v.1.5.0 descrição curta da correção
remov 1.5.2 hml-v.1.5.0 descrição curta do que saiu
```

- Na `main`: `1.5.0` e nada mais, e só depois que a mesma alteração já estiver na `hml`.

## Push

- Envie a branch em que o commit foi feito.
- Não faça push na `main` para “guardar” trabalho.
- Não use `--force` na `main`.
