# Vitrio — Especificação Completa do Sistema

## 1. Visão Geral

**Vitrio** é uma plataforma SaaS multi-tenant de vitrine digital para negócios locais.

Seu objetivo é permitir que pequenos e médios lojistas criem uma presença digital profissional sem transformar o sistema em um e-commerce tradicional.

O Vitrio funciona como uma ponte entre a loja física e o cliente digital.

O consumidor pode:

- conhecer a loja;
- visualizar produtos;
- pesquisar produtos;
- navegar por categorias;
- visualizar promoções;
- visualizar liquidações;
- acessar cupons;
- conhecer informações institucionais;
- entrar em contato com a loja;
- acessar WhatsApp, telefone, Instagram ou outro canal configurado;
- realizar cadastro para receber benefícios ou cupons.

O sistema **não possui checkout obrigatório**, carrinho, cálculo de frete ou pagamento online como fluxo principal.

A finalidade é gerar interesse, tráfego, leads e contato comercial.

---

# 2. Objetivo do Produto

O Vitrio deverá permitir que uma loja local tenha, em pouco tempo, uma presença digital composta por:

- landing page;
- catálogo de produtos;
- páginas institucionais;
- banners;
- sliders;
- promoções;
- liquidações;
- cupons;
- campanhas;
- cadastro de clientes;
- geração de leads;
- links de contato;
- analytics;
- SEO;
- domínio próprio;
- painel administrativo.

O lojista administra todo o conteúdo pelo painel.

O consumidor acessa uma aplicação pública independente.

---

# 3. Público-Alvo

O sistema poderá atender:

- lojas de roupas;
- lojas de calçados;
- lojas de móveis;
- lojas de eletrônicos;
- mercados;
- minimercados;
- lojas de cosméticos;
- lojas de variedades;
- lojas de peças;
- lojas de materiais;
- lojas de decoração;
- lojas de presentes;
- oficinas;
- negócios locais em geral.

Especialmente empresas que hoje dependem apenas de Instagram, WhatsApp, Facebook e Google Maps.

---

# 4. Nome do Projeto

## Vitrio

**Subtítulo:** Vitrine digital para negócios locais.

---

# 5. Princípios do Sistema

1. Backend e frontend separados.
2. API-first.
3. Multi-tenant desde o início.
4. Stateless sempre que possível.
5. Docker como ambiente padrão.
6. Compatibilidade com Linux e Windows.
7. PostgreSQL como banco principal.
8. Redis para cache, filas e recursos temporários.
9. NGINX como reverse proxy.
10. SEO forte por padrão.
11. Site público altamente performático.
12. Painel administrativo separado.
13. Storage desacoplado.
14. Uploads de usuários não misturados aos assets internos do sistema.
15. Arquitetura preparada para escalar horizontalmente.
16. Segurança por padrão.
17. Observabilidade e logs estruturados.
18. Migrations versionadas.
19. Testes automatizados.
20. Interface moderna e responsiva.

---

# 6. Stack Principal

## Backend

```text
Python
FastAPI
SQLAlchemy 2
Alembic
Pydantic 2
PostgreSQL
Redis
Celery
JWT
Argon2
pyvips ou Pillow
```

### Responsabilidades

- autenticação;
- autorização;
- regras de negócio;
- multi-tenancy;
- catálogo;
- produtos;
- categorias;
- promoções;
- liquidações;
- cupons;
- clientes;
- contatos;
- páginas;
- banners;
- mídia;
- analytics;
- SEO;
- administração;
- domínio;
- integrações;
- auditoria.

## Frontend Público

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Motion
GSAP
TanStack Query
Zod
Lucide
Swiper
```

O site público deverá priorizar SEO, SSR/SSG, performance, Core Web Vitals, acessibilidade, carregamento rápido, imagens otimizadas e responsividade.

## Painel Administrativo

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
React Hook Form
Zod
Lucide
ECharts ou Recharts
```

---

# 7. Infraestrutura

```text
Docker
Docker Compose
NGINX
PostgreSQL
Redis
FastAPI
Celery Worker
Next.js Public
Next.js Dashboard
Media Service
```

Arquitetura básica:

```text
Internet
   ↓
NGINX
   ├── Site público
   ├── Painel
   ├── API
   └── Media
        ↓
FastAPI
   ├── PostgreSQL
   ├── Redis
   ├── Celery
   └── Storage
```

---

# 8. Estrutura do Monorepo

```text
vitrio/
│
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   ├── database/
│   │   │   ├── modules/
│   │   │   ├── services/
│   │   │   ├── providers/
│   │   │   ├── middleware/
│   │   │   ├── schemas/
│   │   │   ├── tests/
│   │   │   └── main.py
│   │   ├── alembic/
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── site/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── public/
│   │   └── Dockerfile
│   │
│   └── dashboard/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── hooks/
│       ├── services/
│       ├── public/
│       └── Dockerfile
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   └── sdk/
│
├── infrastructure/
│   ├── nginx/
│   ├── docker/
│   ├── postgres/
│   └── scripts/
│
├── storage/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 9. Organização do Backend

```text
apps/api/app/modules/
├── auth/
├── tenants/
├── users/
├── products/
├── categories/
├── banners/
├── promotions/
├── clearance/
├── coupons/
├── customers/
├── pages/
├── media/
├── contacts/
├── analytics/
├── seo/
├── domains/
├── settings/
├── audit/
└── health/
```

Cada módulo poderá seguir:

```text
module/
├── models.py
├── schemas.py
├── repository.py
├── service.py
├── router.py
├── permissions.py
└── tests/
```

---

# 10. Multi-Tenancy

O Vitrio deverá ser multi-tenant desde a primeira versão. Cada empresa é um tenant.

```text
Tenant A → Loja do João
Tenant B → Loja da Maria
Tenant C → Loja Central
```

As principais tabelas deverão possuir `tenant_id`, incluindo produtos, categorias, banners, cupons, clientes, páginas, configurações, SEO e analytics.

O backend deverá validar o tenant em todas as operações.

---

# 11. Resolução de Tenant

O tenant poderá ser resolvido pelo Host.

```text
lojadojoao.vitrio.app
```

ou:

```text
www.lojadojoao.com.br
```

Fluxo:

```text
HTTP Host
   ↓
Tenant Resolver
   ↓
Tenant
   ↓
Site/configuração
```

---

# 12. Domínios

Tabela sugerida:

```text
domains
- id
- tenant_id
- hostname
- is_primary
- verified
- verification_token
- created_at
```

---

# 13. Área Pública

Rotas principais:

```text
/
/produtos
/produtos/[slug]
/categorias/[slug]
/promocoes
/liquidacao
/cupons
/sobre
/contato
```

Opcionalmente:

```text
/pagina/[slug]
```

---

# 14. Página Inicial

A home poderá possuir:

- hero;
- banners;
- slider;
- apresentação;
- produtos em destaque;
- categorias em destaque;
- promoções;
- liquidação;
- anúncios;
- benefícios;
- sobre;
- depoimentos;
- FAQ;
- CTA;
- contato;
- redes sociais;
- rodapé.

Cada seção deverá poder ser ativada, desativada, reordenada e configurada pelo painel.

---

# 15. Catálogo de Produtos

O catálogo deverá permitir:

- listagem;
- pesquisa;
- filtros;
- categorias;
- promoções;
- liquidações;
- paginação;
- ordenação;
- destaque.

Filtros:

```text
Categoria
Promoção
Liquidação
Marca
Faixa de preço, quando preço estiver habilitado
```

---

# 16. Pesquisa

A pesquisa deverá funcionar inicialmente com PostgreSQL Full Text Search.

Campos:

```text
title
description
keywords
brand
```

No futuro poderá migrar para Meilisearch, Typesense ou OpenSearch.

---

# 17. Produto

Campos sugeridos:

```text
id
tenant_id
category_id
name
slug
sku
brand
description
short_description
price
promotional_price
show_price
is_featured
is_promotion
is_clearance
is_active
stock_display
keywords
created_at
updated_at
published_at
```

Relacionamentos:

```text
product_images
product_categories
product_tags
```

---

# 18. Preço

Regra padrão: **preço oculto**.

Configuração global:

```text
show_prices = false
```

O produto poderá usar:

```text
inherit
show
hide
```

---

# 19. Promoções

Campos:

```text
name
description
start_at
end_at
active
```

Produtos poderão ser marcados com `is_promotion = true` e preço promocional opcional.

---

# 20. Liquidação

Liquidação deverá ser tratada separadamente de promoção.

```text
Promoção → campanha
Liquidação → queima de estoque
```

Campos:

```text
is_clearance
clearance_label
clearance_start
clearance_end
```

---

# 21. Cupons

Campos:

```text
id
tenant_id
code
name
description
discount_type
discount_value
start_at
end_at
max_uses
max_uses_per_customer
minimum_value
active
```

Tipos:

```text
PERCENTAGE
FIXED
```

Aplicação:

```text
ALL_PRODUCTS
CATEGORY
PRODUCT
```

---

# 22. Cupom por Cadastro

Fluxo:

```text
Cliente acessa
   ↓
preenche cadastro
   ↓
sistema valida
   ↓
gera ou entrega cupom
   ↓
cliente recebe código
```

Campos do cliente:

```text
name
email
phone
birth_date opcional
accepted_marketing
accepted_terms
```

---

# 23. Clientes

```text
customers
- id
- tenant_id
- name
- email
- phone
- document
- birth_date
- accepted_marketing
- accepted_terms
- created_at
- updated_at
```

---

# 24. Contato

O lojista poderá escolher o canal principal:

```text
WhatsApp
Telefone
Instagram
URL externa
E-mail
```

Configuração:

```text
contact_type
contact_value
contact_message_template
```

---

# 25. Contato por Produto

CTA sugerido:

```text
Tenho interesse
```

ou:

```text
Falar sobre este produto
```

Mensagem exemplo:

```text
Olá! Vi o produto Smart TV 50" no site e gostaria de mais informações.

https://loja.vitrio.app/produtos/smart-tv-50
```

---

# 26. Banners e Sliders

Campos:

```text
title
desktop_image
mobile_image
url
position
start_at
end_at
order
active
```

---

# 27. Anúncios Internos

Tabela:

```text
ads
```

Campos:

```text
title
image
url
position
start_at
end_at
active
```

Posições:

```text
HOME_TOP
HOME_MIDDLE
CATALOG_TOP
PRODUCT_PAGE
SIDEBAR
```

---

# 28. Páginas Institucionais

O sistema deverá suportar:

- Sobre nós;
- Contato;
- Política de privacidade;
- Termos;
- Página personalizada.

Campos:

```text
title
slug
content
seo_title
seo_description
published
```

---

# 29. Editor de Conteúdo

O painel poderá possuir editor por blocos.

Tipos possíveis:

```text
Hero
Text
Image
Gallery
Products
Categories
CTA
FAQ
Testimonials
Contact
Banner
```

Cada bloco deverá possuir:

```text
order
enabled
settings
```

---

# 30. Subsistema de Mídia / CDN

O Vitrio deverá possuir um subsistema próprio de gerenciamento de mídia para imagens enviadas pelos usuários, banners, imagens de produtos, imagens institucionais, documentos e uploads.

Não entram nesse subsistema JS, CSS, fontes internas ou assets de build.

Importante: o sistema poderá fornecer cache e distribuição de mídia por NGINX/storage, mas não deve se apresentar como uma CDN global equivalente a provedores especializados. A arquitetura deverá permitir uso posterior de CDN externa sem reescrever o domínio de mídia.

---

# 31. StorageProvider

Interface:

```text
StorageProvider
```

Implementações:

```text
LocalStorageProvider
S3StorageProvider
MinIOStorageProvider
R2StorageProvider
```

O backend não poderá depender diretamente do filesystem.

---

# 32. Estrutura do Storage

```text
storage/
└── tenants/
    └── {tenant_id}/
        ├── products/
        ├── banners/
        ├── pages/
        └── uploads/
```

---

# 33. Processamento de Imagens

Fluxo:

```text
Upload
  ↓
Validação
  ↓
MIME check
  ↓
Hash
  ↓
Resize
  ↓
WebP/AVIF
  ↓
Thumbnail
  ↓
Storage
```

Preferência para alto volume: `pyvips`.

---

# 34. Media Metadata

```text
media
- id
- tenant_id
- provider
- path
- mime_type
- size
- width
- height
- hash
- alt_text
- created_at
```

---

# 35. Cache

Redis deverá ser usado para cache, rate limiting, locks, filas e dados temporários.

Exemplo:

```text
tenant:{id}:homepage
tenant:{id}:catalog
tenant:{id}:settings
```

---

# 36. Filas

Celery poderá executar:

- resize;
- conversão;
- limpeza;
- envio de e-mail;
- geração de cupom;
- importação;
- analytics;
- tarefas periódicas.

---

# 37. SEO — Requisito Obrigatório

SEO é requisito arquitetural de todo o `web-public`.

Toda página pública deverá possuir:

- title;
- meta description;
- canonical;
- robots;
- Open Graph;
- Twitter Card;
- JSON-LD;
- headings corretos;
- alt;
- URLs amigáveis;
- sitemap;
- robots.txt;
- redirects;
- prevenção de conteúdo duplicado;
- SSR/SSG/ISR quando aplicável.

---

# 38. SEO Automático

Regra:

```text
SEO automático
   ↓
funciona sem configuração
   ↓
customização opcional
```

Quando o lojista não configurar SEO manualmente, o sistema gera valores padrão.

---

# 39. SEO Global no Painel

```text
Configurações
└── SEO
```

Campos:

```text
default_title
default_description
default_og_image
site_name
language
city
state
country
phone
address
indexing_enabled
```

---

# 40. SEO por Página, Produto e Categoria

Campos configuráveis:

```text
seo_title
seo_description
seo_slug
seo_canonical
seo_index
seo_follow
seo_og_image
```

SEO manual sobrescreve SEO automático.

---

# 41. Schema.org

Gerar automaticamente quando aplicável:

```text
LocalBusiness
Store
Product
Offer
BreadcrumbList
Organization
WebSite
```

Não inventar `Offer` quando preço não estiver disponível.

---

# 42. Sitemap

Rota:

```text
/sitemap.xml
```

Somente conteúdo ativo, publicado e indexável.

---

# 43. Robots

Rota:

```text
/robots.txt
```

Exemplo:

```text
User-agent: *
Allow: /

Disallow: /admin
Disallow: /api
Disallow: /preview
```

---

# 44. Busca Interna e Filtros

Rotas de busca, como `/busca?q=`, deverão usar `noindex` por padrão.

Combinações arbitrárias de filtros não deverão criar páginas SEO indexáveis automaticamente.

---

# 45. Redirects

Tabela:

```text
seo_redirects
```

Campos:

```text
tenant_id
source_path
destination_path
status_code
```

Mudança de slug deverá gerar redirect 301 quando necessário.

---

# 46. Preview SEO

O painel deverá mostrar:

```text
Google Preview
Social Preview
```

---

# 47. Auditor SEO

Checklist técnico:

```text
Título
Descrição
H1
Alt
Slug
Canonical
Imagem
Indexação
Tamanho da imagem
```

O sistema não deverá prometer posição no Google.

---

# 48. Performance e Core Web Vitals

Metas de referência:

```text
LCP < 2.5s
INP < 200ms
CLS < 0.1
```

Recursos:

```text
Next Image
WebP
AVIF
lazy loading
cache
SSR
SSG
ISR
code splitting
font optimization
```

---

# 49. Analytics

Eventos próprios:

```text
page_view
product_view
category_view
search
contact_click
coupon_claim
banner_click
```

KPIs:

```text
Visitas
Usuários
Produtos visualizados
Produtos mais acessados
Categorias mais acessadas
Pesquisas
Cliques em contato
Cupons gerados
Clientes cadastrados
Conversão para contato
```

Tabela:

```text
analytics_events
- id
- tenant_id
- event_type
- entity_type
- entity_id
- session_id
- metadata
- created_at
```

Dados pessoais não deverão ser armazenados desnecessariamente.

---

# 50. Autenticação

Painel protegido com:

```text
JWT
Refresh Token
Argon2
RBAC
```

---

# 51. Papéis

Inicialmente:

```text
OWNER
ADMIN
EDITOR
VIEWER
```

---

# 52. Permissões

Exemplos:

```text
products.read
products.create
products.update
products.delete
categories.read
categories.manage
coupons.read
coupons.manage
seo.read
seo.manage
media.upload
media.delete
analytics.read
settings.manage
```

---

# 53. Segurança

Obrigatório:

- HTTPS;
- JWT seguro;
- refresh token;
- Argon2;
- CORS;
- rate limiting;
- validação de entrada;
- headers seguros;
- proteção contra SQL Injection;
- upload validation;
- MIME validation;
- limite de arquivo;
- audit logs;
- proteção contra brute force;
- tokens com expiração;
- segredos fora do repositório;
- dependências atualizadas;
- princípio do menor privilégio.

---

# 54. LGPD

O sistema deverá considerar:

- consentimento;
- privacidade;
- exclusão;
- exportação;
- minimização de dados;
- retenção;
- finalidade;
- registro de consentimento.

Tabela opcional:

```text
customer_consents
```

---

# 55. Auditoria

```text
audit_logs
```

Campos:

```text
tenant_id
user_id
action
entity_type
entity_id
old_value
new_value
ip
user_agent
created_at
```

---

# 56. PostgreSQL

Banco principal por oferecer índices, constraints, transações, JSONB, Full Text Search, relacionamentos e estabilidade.

Exemplos de índices:

```sql
CREATE INDEX idx_products_tenant
ON products(tenant_id);

CREATE INDEX idx_products_category
ON products(tenant_id, category_id);

CREATE INDEX idx_products_active
ON products(tenant_id, is_active);

CREATE INDEX idx_products_promotion
ON products(tenant_id, is_promotion);

CREATE INDEX idx_products_clearance
ON products(tenant_id, is_clearance);

CREATE UNIQUE INDEX idx_products_slug
ON products(tenant_id, slug);
```

Indexar especialmente:

```text
tenant_id
slug
category_id
status
is_active
is_promotion
is_clearance
published_at
created_at
```

---

# 57. NGINX

Responsabilidades:

- reverse proxy;
- TLS;
- gzip/brotli;
- cache;
- rate limiting;
- static assets;
- media;
- proxy da API;
- load balancing futuro.

Exemplo:

```text
/api → FastAPI
/admin → Dashboard
/media → Media
/ → Site
```

---

# 58. Docker

Serviços:

```text
nginx
api
site
dashboard
postgres
redis
worker
```

Opcional:

```text
minio
```

---

# 59. Windows e Linux

Linux:

```text
Docker Engine
```

Windows:

```text
Docker Desktop
```

O código não deverá depender de caminhos específicos do sistema operacional.

---

# 60. Stateless e Escala Horizontal

A API deverá ser stateless. O estado externo fica em PostgreSQL, Redis e Storage.

```text
NGINX
├── API 1
├── API 2
├── API 3
└── API 4
```

---

# 61. Meta de Concorrência

Requisito:

```text
Arquitetado para >= 1.000 usuários simultâneos.
```

A capacidade deverá ser comprovada por teste de carga e não apenas pela especificação da VPS.

---

# 62. Teste de Carga

Ferramenta:

```text
k6
```

Meta inicial de referência:

```text
1.000 VUs
p95 < 500 ms
error rate < 1%
```

Cenários:

- home;
- catálogo;
- busca;
- produto;
- contato;
- login;
- painel.

---

# 63. VPS Mínima

Para desenvolvimento/demo:

```text
2 vCPU
4 GB RAM
40 GB NVMe
Ubuntu 24.04 LTS
```

---

# 64. VPS Recomendada

Para produção inicial:

```text
4 vCPU
8 GB RAM
80+ GB NVMe
Ubuntu 24.04 LTS
```

A capacidade real dependerá do perfil de tráfego, cache, volume de mídia e consultas.

---

# 65. Escala Posterior

```text
Servidor 1 → NGINX/API
Servidor 2 → PostgreSQL
Servidor 3 → Redis/Worker
Storage → externo
```

---

# 66. Observabilidade

Implementar:

- logs JSON;
- request ID;
- tracing;
- métricas;
- health checks;
- error tracking.

Campos de log:

```text
timestamp
level
request_id
tenant_id
user_id
route
method
status
duration
error
```

---

# 67. Health Checks

Rotas:

```text
/health
/health/live
/health/ready
```

Verificar API, PostgreSQL, Redis e Storage.

---

# 68. CI/CD

Pipeline:

```text
lint
typecheck
tests
build
security scan
docker build
deploy
```

---

# 69. Testes

Backend:

```text
pytest
```

Frontend:

```text
Vitest
React Testing Library
Playwright
```

Carga:

```text
k6
```

---

# 70. Testes E2E

Cenários:

- login;
- criar produto;
- editar produto;
- publicar produto;
- criar categoria;
- ativar promoção;
- gerar cupom;
- cadastrar cliente;
- publicar página;
- acessar site público;
- acessar produto;
- pesquisar;
- clicar contato.

---

# 71. Importação e Exportação

Futuro:

```text
CSV
XLSX
API
```

Exportações possíveis:

```text
Produtos
Clientes
Cupons
Analytics
```

---

# 72. Configurações da Loja

Campos:

```text
Nome
Nome comercial
Logo
Favicon
Descrição
Cores
Telefone
WhatsApp
Instagram
Facebook
Endereço
Horário
Contato principal
Mostrar preços
SEO
Domínio
```

---

# 73. Aparência

O painel deverá permitir:

- logo;
- favicon;
- cores;
- fontes;
- layout;
- hero;
- banners;
- ordem das seções.

Inicialmente poderá existir um tema padrão altamente customizável. Marketplace de temas fica para fase futura.

---

# 74. Design System

Compartilhado em:

```text
packages/ui
```

Componentes:

```text
Button
Input
Select
Modal
Drawer
Card
Table
Badge
Tabs
Toast
Pagination
FormField
PageHeader
EmptyState
ConfirmDialog
```

---

# 75. Acessibilidade

Requisitos:

- contraste;
- teclado;
- foco;
- aria;
- labels;
- semântica;
- alt;
- responsividade.

Meta:

```text
WCAG AA
```

---

# 76. Painel Administrativo

Menu sugerido:

```text
Painel
Produtos
Categorias
Promoções
Liquidação
Cupons
Banners
Páginas
Clientes
Anúncios
Contatos
Analytics
SEO
Aparência
Configurações
```

---

# 77. Dashboard Administrativo

KPIs:

```text
Visitas
Visualizações
Cliques
Clientes
Cupons
Produtos mais vistos
Categorias mais vistas
Conversão
```

---

# 78. Home Pública

Estrutura possível:

```text
Header
Hero
Banners
Categorias
Produtos em destaque
Promoções
Liquidação
Benefícios
Sobre
Depoimentos
FAQ
Contato
Footer
```

---

# 79. Não é E-commerce

O sistema não deverá possuir obrigatoriamente:

- checkout;
- carrinho;
- pagamento;
- frete;
- pedido online.

Fluxo principal:

```text
Visita
  ↓
Interesse
  ↓
Contato
  ↓
Venda fora do site
```

---

# 80. API

Prefixo:

```text
/api/v1
```

Exemplos:

```text
/api/v1/auth
/api/v1/products
/api/v1/categories
/api/v1/coupons
/api/v1/customers
/api/v1/banners
/api/v1/pages
/api/v1/media
/api/v1/analytics
/api/v1/settings
```

Endpoints públicos separados:

```text
/api/v1/public/site
/api/v1/public/products
/api/v1/public/categories
/api/v1/public/promotions
/api/v1/public/coupons
```

---

# 81. Rate Limit

Aplicar em:

```text
login
password-reset
search
contact
customer-registration
coupon-claim
uploads
```

---

# 82. Idempotência

Operações críticas deverão suportar idempotência quando necessário:

- geração de cupom;
- webhook;
- importação;
- criação externa.

---

# 83. Configuração

`.env` apenas para segredos.

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
STORAGE_SECRET=
```

Configuração não secreta poderá usar:

```text
config/vitrio.yaml
```

Exemplo:

```yaml
server:
  api_port: 8000
  site_port: 3000
  dashboard_port: 3001

storage:
  provider: local

features:
  analytics: true
  coupons: true
  seo_audit: true
```

---

# 84. Backups

Obrigatório:

- backup PostgreSQL;
- backup de mídia;
- retenção;
- teste de restore.

Exemplo:

```text
Banco diário
Retenção 7/30 dias
Storage incremental
Restore testado periodicamente
```

---

# 85. Migrations e Seed

Migrations:

```text
Alembic
```

Toda mudança estrutural deverá passar por migration, revisão, backup e deploy.

Ambiente demo deverá possuir seed com:

```text
Loja Demo
Categorias
Produtos
Banner
Cupom
Página Sobre
```

---

# 86. Ambientes

```text
development
staging
production
```

---

# 87. Feature Flags

Futuro:

```text
feature_flags
```

Para liberar funcionalidades por tenant.

---

# 88. Integrações Futuras

Possíveis:

```text
Nuvemshop
Mercado Pago
WhatsApp
Google Analytics
Meta Pixel
Google Tag Manager
Google Search Console
ERP
CRM
```

Credenciais deverão ser armazenadas por tenant e criptografadas.

---

# 89. Performance do Banco

Requisitos:

- evitar N+1;
- índices;
- paginação;
- análise de query;
- connection pool;
- cache;
- limites.

---

# 90. Paginação

Padrão inicial:

```text
page
limit
```

Cursor poderá ser usado em endpoints de alta escala.

---

# 91. Soft Delete

Entidades que exigem histórico poderão usar:

```text
deleted_at
```

---

# 92. Datas, Timezone, Moeda e Idioma

Datas no banco:

```text
UTC
```

Timezone configurável por tenant:

```text
America/Sao_Paulo
```

Moeda inicial:

```text
BRL
```

Idioma inicial:

```text
pt-BR
```

Arquitetura preparada para i18n futuramente.

---

# 93. Estratégia Next.js

Sugestão:

```text
Home → ISR
Produto → ISR
Categoria → ISR
Busca → SSR/dinâmico
Painel → híbrido server/client
```

Ao alterar produto ou conteúdo:

```text
Salvar
 ↓
Invalidar cache
 ↓
Revalidar página
```

---

# 94. Cache HTTP

Usar quando apropriado:

```text
Cache-Control
ETag
stale-while-revalidate
```

---

# 95. Social Sharing

Toda página pública deverá gerar Open Graph apropriado para compartilhamento em WhatsApp, Facebook, LinkedIn e serviços compatíveis.

---

# 96. Upload Seguro

Regras:

- validar extensão;
- validar MIME;
- limitar tamanho;
- renomear arquivo;
- gerar hash;
- impedir execução;
- opcionalmente antivírus;
- separar tenant.

URLs poderão usar nomes hash:

```text
/media/tenant/123/products/a84c....webp
```

---

# 97. Requisitos Funcionais

## RF001
O lojista deve poder criar e editar produtos.

## RF002
O lojista deve poder criar categorias.

## RF003
O lojista deve poder ocultar ou exibir preços.

## RF004
O lojista deve poder marcar produtos como promoção.

## RF005
O lojista deve poder marcar produtos como liquidação.

## RF006
O lojista deve poder criar cupons.

## RF007
O lojista deve poder publicar banners.

## RF008
O lojista deve poder editar páginas institucionais.

## RF009
O cliente deve poder pesquisar produtos.

## RF010
O cliente deve poder filtrar por categoria.

## RF011
O cliente deve poder acessar um produto.

## RF012
O cliente deve poder entrar em contato com a loja.

## RF013
O cliente deve poder se cadastrar.

## RF014
O sistema deve poder gerar cupom por cadastro.

## RF015
O lojista deve visualizar analytics.

## RF016
O lojista deve configurar SEO.

## RF017
O sistema deve gerar SEO automático.

## RF018
O sistema deve gerar sitemap.

## RF019
O sistema deve gerar robots.txt.

## RF020
O sistema deve otimizar mídia.

---

# 98. Requisitos Não Funcionais

## RNF001
Compatível com Linux e Windows via Docker.

## RNF002
Frontend e backend separados.

## RNF003
Arquitetura multi-tenant.

## RNF004
Arquitetura preparada para 1.000 usuários simultâneos.

## RNF005
Banco com índices.

## RNF006
HTTPS obrigatório em produção.

## RNF007
Sistema responsivo.

## RNF008
WCAG AA como meta.

## RNF009
SEO forte por padrão.

## RNF010
Logs estruturados.

## RNF011
Backups automáticos.

## RNF012
Health checks.

## RNF013
Testes automatizados.

## RNF014
CI/CD.

## RNF015
Cache Redis.

---

# 99. Regras de Negócio

## RN001 — Isolamento por Tenant
Nenhum tenant poderá acessar dados de outro tenant.

## RN002 — Preço Oculto
Produtos deverão respeitar a configuração global ou específica de visibilidade.

## RN003 — Produto Inativo
Produto inativo não aparece no site público.

## RN004 — Categoria Inativa
Categoria inativa não deverá aparecer publicamente.

## RN005 — Cupom
Cupom só poderá ser utilizado dentro de sua validade.

## RN006 — Cupom por Cliente
O limite por cliente deverá ser respeitado.

## RN007 — Promoção
Promoção fora da data deverá ser considerada inativa.

## RN008 — Liquidação
Liquidação expirada não deverá aparecer como ativa.

## RN009 — SEO Manual
SEO manual sobrescreve SEO automático.

## RN010 — Slug
Slug deverá ser único por tenant e entidade.

## RN011 — Redirect
Mudança de slug deverá gerar redirect 301 quando necessário.

## RN012 — Upload
Upload inválido deverá ser rejeitado.

## RN013 — Domínio
Domínio deverá estar verificado antes de ser usado.

## RN014 — Publicação
Rascunhos não aparecem no site público.

## RN015 — Contato
O CTA deverá usar o canal configurado pelo lojista.

---

# 100. Entidades Principais

```text
Tenant
User
Role
Product
Category
Banner
Promotion
Coupon
Customer
Page
Media
Ad
ContactSetting
SeoSetting
SeoRedirect
AnalyticsEvent
Domain
AuditLog
```

Modelo conceitual:

```text
Tenant
 ├── Users
 ├── Products
 │    ├── Images
 │    └── Categories
 ├── Categories
 ├── Promotions
 ├── Coupons
 ├── Customers
 ├── Pages
 ├── Banners
 ├── Media
 ├── SEO
 ├── Analytics
 └── Settings
```

---

# 101. Convenções

Banco:

```text
snake_case
```

Python:

```text
snake_case
PascalCase para classes
```

TypeScript:

```text
camelCase
PascalCase para componentes/tipos
```

URLs:

```text
kebab-case
```

---

# 102. Versionamento de API

```text
/api/v1
```

Novas versões incompatíveis:

```text
/api/v2
```

---

# 103. Documentação da API

FastAPI deverá expor OpenAPI.

Ambiente interno:

```text
/docs
/redoc
```

Produção poderá restringir acesso.

---

# 104. Roadmap

## Fase 1 — MVP

- autenticação;
- tenant;
- painel;
- produtos;
- categorias;
- banners;
- páginas;
- contato;
- site público;
- media;
- configuração;
- Docker;
- NGINX;
- PostgreSQL;
- Redis.

## Fase 2

- promoções;
- liquidação;
- cupons;
- cadastro de clientes;
- SEO completo;
- analytics;
- redirects;
- sitemap;
- robots.

## Fase 3

- domínio personalizado;
- importação;
- exportação;
- temas;
- integrações;
- API externa.

## Fase 4

- marketplace de temas;
- módulos;
- analytics avançado;
- automações;
- notificações.

---

# 105. Critérios de Aceite do MVP

O MVP estará pronto quando:

1. uma empresa puder ser criada;
2. um usuário puder entrar;
3. o lojista puder configurar identidade;
4. o lojista puder cadastrar categorias;
5. o lojista puder cadastrar produtos;
6. o lojista puder subir imagens;
7. o site público exibir produtos;
8. pesquisa funcionar;
9. filtros funcionarem;
10. contato funcionar;
11. banners funcionarem;
12. SEO básico funcionar;
13. sitemap existir;
14. robots.txt existir;
15. Docker subir toda a aplicação;
16. Linux e Windows funcionarem via Docker;
17. PostgreSQL e Redis estiverem integrados;
18. NGINX estiver configurado;
19. health checks funcionarem;
20. testes críticos passarem.

---

# 106. Resultado Esperado

```text
Lojista
   ↓
configura sua loja
   ↓
publica catálogo e conteúdo
   ↓
cliente encontra o site
   ↓
navega pelos produtos
   ↓
se interessa
   ↓
entra em contato
   ↓
compra diretamente com a loja
```

O sistema deverá ser leve, moderno, rápido, escalável, multi-tenant, seguro, SEO-first, fácil de administrar, compatível com Docker e preparado para crescimento.

---

# 107. Stack Final

```text
Frontend público:
Next.js + React + TypeScript

Painel:
Next.js + React + TypeScript

Backend:
Python + FastAPI

ORM:
SQLAlchemy 2

Migrations:
Alembic

Banco:
PostgreSQL

Cache:
Redis

Filas:
Celery

Proxy:
NGINX

Containers:
Docker

Uploads:
StorageProvider

Imagens:
pyvips/Pillow

Testes:
pytest + Vitest + Playwright + k6

Observabilidade:
logs estruturados + health checks + métricas
```

---

# 108. Resumo Executivo

> **Vitrio é uma plataforma SaaS multi-tenant de vitrine digital para negócios locais. O lojista administra produtos, categorias, banners, promoções, liquidações, cupons, páginas, clientes, mídia, SEO e aparência por meio de um painel próprio. O consumidor acessa um site público rápido, moderno e otimizado para SEO, pesquisa produtos, conhece a loja e entra em contato diretamente com o estabelecimento. A arquitetura utiliza Next.js/React no frontend, FastAPI/Python no backend, PostgreSQL, Redis, Docker e NGINX, com storage desacoplado, cache, filas, analytics, segurança e preparação para escalar horizontalmente.**
