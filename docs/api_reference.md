# PROFUNDIDADE — Referência da API REST v1

Prefixo base: `/api/v1`
Autenticação: Bearer JWT (`Authorization: Bearer <token>`)
Isolamento: Cabeçalho `X-Organization-ID: <org_id>`

---

## 1. Autenticação e Sessão (`/api/v1/auth`)

### `POST /api/v1/auth/login`
Autentica utilizador com email e palavra-passe.
- **Request Body**: `{ "email": "...", "password": "..." }`
- **Response 200**: `{ "access_token": "...", "token_type": "bearer", "user": { ... }, "organizations": [ ... ] }`

### `POST /api/v1/auth/select-tenant`
Comuta a organização activa e emite novo token restrito à organização seleccionada.
- **Request Body**: `{ "organization_id": "..." }`
- **Response 200**: Token renovado e perfil de funções actualizado.

### `GET /api/v1/auth/me`
Retorna os dados do utilizador actual, organização activa e lista de permissões RBAC.

---

## 2. Organizações e Membros (`/api/v1/organizations`)

### `POST /api/v1/organizations`
Regista um novo tenant. O criador é automaticamente associado com a função de `ADMIN`.
### `GET /api/v1/organizations`
Lista as organizações onde o utilizador autenticado possui filiação activa.
### `GET /api/v1/organizations/{id}/members`
Lista membros da organização com suas respectivas funções.
### `POST /api/v1/organizations/{id}/members`
Adiciona novo colaborador à organização.

---

## 3. Casos Investigativos (`/api/v1/cases`)

### `POST /api/v1/cases`
Abre novo caso com numeração sequencial corporativa (`CAS-YYYY-XXXX`).
### `GET /api/v1/cases`
Consulta dossiers com filtros por estado, prioridade e pesquisa textual.
### `GET /api/v1/cases/stats`
Métricas operacionais reais agregadas (casos activos, pendentes e prioritários).
### `GET /api/v1/cases/{id}`
Detalhes do caso dentro do limite do tenant.
### `PATCH /api/v1/cases/{id}`
Actualização de estado e prioridade.

---

## 4. Entidades e Alvos (`/api/v1/entities`)

### `POST /api/v1/entities`
Regista indivíduos, empresas, veículos ou contas bancárias vinculadas ao caso.
### `GET /api/v1/entities`
Lista entidades filtradas por tipo ou caso.

---

## 5. Relacionamentos e Grafo (`/api/v1/relationships`)

### `POST /api/v1/relationships`
Liga duas entidades estabelecendo vínculo (ex: `DIRECTOR_OF`, `TRANSACTED_WITH`).
### `GET /api/v1/relationships/graph/{case_id}`
Retorna estrutura de nós (`nodes`) e arestas (`edges`) para visualização interactiva de rede.

---

## 6. Evidências e Custódia (`/api/v1/evidence`)

### `POST /api/v1/evidence/upload`
Upload multipart. Calcula imediatamente o hash **SHA-256** do ficheiro e gera registo de custódia inicial (`ACQUISITION`).
### `POST /api/v1/evidence/{id}/verify`
Recalcula o hash do ficheiro físico em disco/cloud e atesta se a integridade permanece inviolada.
### `POST /api/v1/evidence/{id}/version`
Cria nova versão incremental (v2, v3...) mantendo o histórico de custódia e prevenindo sobreposições silenciosas.

---

## 7. SI - Sistema de Inteligência (`/api/v1/si`)

### `POST /api/v1/si/generate`
Analisa alvos e gera inferências preliminares. Todas as saídas são identificadas como automatizadas com advertência legal.
### `POST /api/v1/si/inferences/{id}/validate`
Validação humana formal (`CONFIRMED` ou `REJECTED`) com registo obrigatório de fundamentação.

---

## 8. Relatórios e Selagem Criptográfica (`/api/v1/reports`)

### `POST /api/v1/reports/generate`
Compila dossier técnico em Markdown contendo dados do caso, entidades, vínculos e tabela de evidências com hashes.
### `POST /api/v1/reports/{id}/seal`
Sela criptograficamente o relatório com hash SHA-256 e congela alterações adicionais.

---

## 9. Trilha de Auditoria (`/api/v1/audit`)

### `GET /api/v1/audit`
Consulta cronológica e imutável de eventos de conformidade restrita à organização do utilizador.
