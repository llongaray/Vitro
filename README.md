# Vitrio

Vitrine digital multi-tenant para negócios locais. A loja pública, o painel e a API sobem juntos pelo Docker. O remote deste repositório é `git@github.com:llongaray/Vitro.git`.

## O que sobe

| Serviço | Onde fica | Função |
| --- | --- | --- |
| Site | `/` | vitrine pública (Next.js) |
| Painel | `/admin` | administração da loja (Next.js) |
| API | `/api/v1` | backend (FastAPI) |
| Mídia | `/media` | imagens enviadas |
| Saúde | `/health/ready` | API, Postgres, Redis e storage |

A porta publicada é `8080`, para não pedir privilégio de administrador no Windows. O tenant é o hostname, sem a porta.

## Pré-requisitos

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows) ou Docker Engine com o plugin Compose (Linux)
- Cliente OpenSSH (já vem no Windows 10/11 e na maioria das distros Linux)
- Para desenvolver fora do Docker: Node.js 22, pnpm 9 e Python 3.12

No Windows, abra o Docker Desktop e espere o status ficar em execução antes dos comandos abaixo. Use o PowerShell.

## 1. Chave SSH e clone

O acesso ao GitHub é por SSH. A chave privada fica só na sua máquina.

### Windows

```powershell
ssh-keygen -t ed25519 -C "seu-email"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Copie a linha inteira que o segundo comando imprimir. No GitHub, abra **Settings → SSH and GPG keys → New SSH key**, cole a chave e salve.

```powershell
ssh -T git@github.com
git clone git@github.com:llongaray/Vitro.git
cd Vitro
```

Na primeira conexão, confirme o fingerprint do GitHub com `yes`.

### Linux

```bash
ssh-keygen -t ed25519 -C "seu-email"
cat ~/.ssh/id_ed25519.pub
```

Cadastre essa chave pública no GitHub, no mesmo caminho acima.

```bash
ssh -T git@github.com
git clone git@github.com:llongaray/Vitro.git
cd Vitro
```

## 2. Segredos (`.env`)

O arquivo versionado é o `.env.example`. Ele só tem placeholders. O `.env` real fica de fora do Git (veja o `.gitignore`) e é o que o Docker Compose lê.

### Windows

```powershell
Copy-Item .env.example .env
```

Gere quatro segredos e cole em `JWT_SECRET`, `STORAGE_SECRET`, `REVALIDATE_SECRET` e `INTEGRATIONS_KEY`:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Rode esse comando uma vez para cada variável. A senha do Postgres em `POSTGRES_PASSWORD` precisa ser a mesma que aparece dentro de `DATABASE_URL`.

### Linux

```bash
cp .env.example .env
openssl rand -base64 48
```

Use uma saída nova do `openssl` em cada segredo. Mantenha `POSTGRES_PASSWORD` e a senha dentro de `DATABASE_URL` iguais.

Não commite o `.env`. Não coloque chave SSH, token do GitHub nem senha real no repositório.

## 3. Subir tudo com Docker

Este é o modo de uso. Sobe Postgres, Redis, API, site, painel e nginx.

### Windows e Linux

```bash
docker compose up --build
```

Na primeira vez a build demora. Quando a API ficar saudável, abra:

- Loja demo: [http://demo.localhost:8080](http://demo.localhost:8080)
- Painel: [http://demo.localhost:8080/admin/login](http://demo.localhost:8080/admin/login)
- Criar outra loja: [http://localhost:8080](http://localhost:8080)

O login da loja demo usa `DEMO_OWNER_EMAIL` e `DEMO_OWNER_PASSWORD` do seu `.env`. O modelo de exemplo sugere `owner@example.com`. Troque essa senha antes de publicar a stack.

O endereço de uma loja nova fica `{slug}.localhost:8080`. O Windows e o Linux resolvem `*.localhost` para `127.0.0.1`. Se o navegador não abrir `demo.localhost`, acrescente esta linha no arquivo de hosts:

- Windows: `C:\Windows\System32\drivers\etc\hosts` (o Bloco de Notas precisa ser aberto como administrador)
- Linux: `/etc/hosts`

```text
127.0.0.1 demo.localhost
```

Para deixar os containers rodando em segundo plano:

```bash
docker compose up --build -d
```

Para parar:

```bash
docker compose down
```

`docker compose down -v` apaga também o banco e as imagens enviadas.

O Compose publica o Postgres em `127.0.0.1:5433` e o Redis em `127.0.0.1:6380`, para conviver com instalações locais. Dentro da rede Docker os serviços continuam em `postgres:5432` e `redis:6379`.

Se você alterar `REVALIDATE_SECRET`, recrie o site, porque esse valor entra na imagem:

```bash
docker compose up --build -d site
```

## 4. Backend fora do Docker

Use isto quando for alterar a API e quiser recarregar o código sem reconstruir a imagem. O Postgres e o Redis continuam no Docker.

### Windows

```powershell
docker compose up -d postgres redis
cd apps\api
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
$env:DATABASE_URL = "postgresql+asyncpg://vitrio:vitrio@127.0.0.1:5433/vitrio"
$env:REDIS_URL = "redis://127.0.0.1:6380/0"
$env:JWT_SECRET = "cole-o-mesmo-valor-do-arquivo-.env"
$env:STORAGE_SECRET = "cole-o-mesmo-valor-do-arquivo-.env"
$env:REVALIDATE_SECRET = "cole-o-mesmo-valor-do-arquivo-.env"
$env:INTEGRATIONS_KEY = "cole-o-mesmo-valor-do-arquivo-.env"
$env:SITE_INTERNAL_URL = "http://127.0.0.1:3000"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Se o PowerShell bloquear o script de ativação:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Ajuste `vitrio:vitrio` em `DATABASE_URL` se você tiver trocado `POSTGRES_USER` e `POSTGRES_PASSWORD`.

### Linux

```bash
docker compose up -d postgres redis
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
export DATABASE_URL="postgresql+asyncpg://vitrio:vitrio@127.0.0.1:5433/vitrio"
export REDIS_URL="redis://127.0.0.1:6380/0"
export JWT_SECRET="cole-o-mesmo-valor-do-arquivo-.env"
export STORAGE_SECRET="cole-o-mesmo-valor-do-arquivo-.env"
export REVALIDATE_SECRET="cole-o-mesmo-valor-do-arquivo-.env"
export INTEGRATIONS_KEY="cole-o-mesmo-valor-do-arquivo-.env"
export SITE_INTERNAL_URL="http://127.0.0.1:3000"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

A API fica em [http://127.0.0.1:8000](http://127.0.0.1:8000). A documentação interativa fica em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Testes da API, com Postgres e Redis no ar:

```bash
cd apps/api
pytest
```

No Windows, com o virtualenv ativo, o comando é o mesmo: `pytest`.

## 5. Front-end fora do Docker

O site e o painel são Next.js. Na raiz do repositório:

### Windows e Linux

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
```

Em dois terminais:

```bash
pnpm dev:site
pnpm dev:dashboard
```

- Site: [http://127.0.0.1:3000](http://127.0.0.1:3000), consultando a API em `http://127.0.0.1:8000`
- Painel: [http://127.0.0.1:3001/admin](http://127.0.0.1:3001/admin)

O painel chama `/api/v1` no mesmo host. No uso normal isso passa pelo nginx da porta `8080`. Para loja e painel juntos, use a seção Docker. O `pnpm dev` serve para editar a interface com recarga automática.

Teste de ponta a ponta, com a stack Docker no ar:

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e
```

## Branches

Cada commit altera um arquivo só.

| Branch | Conteúdo |
| --- | --- |
| `main` | o que já funciona, sem erro, e pode ser usado |
| `hml-v.1.0.0` | o que já foi testado e ainda não entra na `main` |
| `tst-v.1.0.0` | o que ainda está em teste |

Na `main`, a mensagem do commit é só a versão daquele arquivo: `1.0.0`, `1.1`, `2.0.1`, `2.1`.

Em `tst-v.X` e `hml-v.X`, a mensagem leva o prefixo, a versão do arquivo, a versão da branch e o que mudou:

```text
add 1.0.0 tst-v.1.0.0 descrição do que entrou
fix 1.0.1 tst-v.1.0.0 descrição da correção
remov 1.1.0 hml-v.1.0.0 descrição do que saiu
```

O fluxo é `tst` → `hml` → `main`. Ao chegar na `main`, o arquivo ganha um commit novo cuja mensagem é apenas a versão.
