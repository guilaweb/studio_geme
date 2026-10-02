# PROFUNDIDADE — Arquitetura de Sistema e Engenharia

**Sistema Operacional Digital de Inteligência, Investigação e Evidências**
Desenvolvido sobre **Google Cloud Platform (GCP)**.

---

## 1. Princípios Arquiteturais e Conformidade

A plataforma foi concebida sob os seguintes pilares invioláveis:
1. **Multi-Tenancy Estrito**: Isolamento criptográfico e de base de dados absoluto entre organizações. Nenhuma entidade ou relatório de uma organização pode ser consultado por utilizadores de outra.
2. **Zero Mock Data**: 100% das métricas, estatísticas e registros apresentados derivam de transações reais na base de dados PostgreSQL.
3. **Cadeia de Custódia e Hashing SHA-256**: Cada ficheiro de evidência física ou digital apreendido é submetido a cálculo de hash criptográfico imediato no momento do upload. Qualquer alteração subsequente gera uma nova versão imutável, mantendo a linhagem de proveniência ininterrupta.
4. **Governança de Inteligência Artificial (SI)**: As inferências automatizadas produzidas pelo Sistema de Inteligência são expressamente rotuladas como hipóteses automatizadas sujeitas à validação humana obrigatória (*Human-in-the-loop*).
5. **Trilha de Auditoria Universal**: Toda acção sensível (autenticação, criação de caso, aquisição de prova, validação analítica e selagem de relatório) gera um evento de auditoria imutável com carimbo UTC e identificação do agente.

---

## 2. Estrutura do Monorepo

```
/
├── apps/
│   ├── api/                     # Backend Python 3.13 / FastAPI / SQLAlchemy / Alembic
│   │   ├── alembic/             # Migrações versionadas da base de dados
│   │   └── src/
│   │       ├── common/          # Modelos base, segurança (bcrypt/JWT), auditoria
│   │       ├── modules/         # 15 módulos operacionais independentes
│   │       ├── config.py        # Configurações Pydantic Settings
│   │       ├── database.py      # Gestão de conexões e sessões
│   │       ├── dependencies.py  # Injeção de dependências (Auth, Tenant, RBAC)
│   │       ├── main.py          # Ponto de entrada FastAPI e routers /api/v1
│   │       └── seed.py          # Inicialização de permissões e perfis de sistema
│   └── web/                     # Frontend Next.js 15, TypeScript, Tailwind CSS
├── infrastructure/
│   ├── docker/                  # Dockerfile multi-stage optimizado para Cloud Run
│   ├── cloudbuild/              # Pipeline CI/CD automatizado no GCP Cloud Build
│   └── terraform/               # IaaS declarativo (Cloud SQL, GCS, Secret Manager)
├── docs/                        # Documentação técnica e operacional
└── tests/
    └── integration/             # Suite de testes automatizados com pytest
```

---

## 3. Módulos Operacionais do Backend

| Módulo | Prefixo de Rota | Responsabilidade |
| :--- | :--- | :--- |
| **authentication** | `/api/v1/auth` | Login bcrypt/JWT, comutação de tenant e dados da sessão. |
| **organizations** | `/api/v1/organizations` | Registo de organizações, planos empresariais e membros. |
| **users** | `/api/v1/users` | Gestão de utilizadores, credenciais e contas. |
| **roles & permissions** | `/api/v1/roles`, `/permissions` | Matriz RBAC (ADMIN, INVESTIGATOR, ANALYST, AUDITOR). |
| **cases** | `/api/v1/cases` | Dossiers e casos investigativos com numeração sequencial. |
| **entities** | `/api/v1/entities` | Cadastro de alvos (Pessoas, Empresas, Veículos, Contas). |
| **relationships** | `/api/v1/relationships` | Mapeamento de ligações e geração de grafos de vínculos. |
| **evidence** | `/api/v1/evidence` | Custódia, cálculo SHA-256 e versionamento de provas. |
| **investigations** | `/api/v1/investigations` | Tarefas operacionais e notas de diligências. |
| **osint** | `/api/v1/osint` | Consultas DNS/IP e sinalização de integrações externas. |
| **analysis** | `/api/v1/analysis` | Métricas de rede (centralidade, densidade) e matriz de risco. |
| **si** | `/api/v1/si` | Inferências de inteligência com parecer humano obrigatório. |
| **reports** | `/api/v1/reports` | Compilação de dossiers periciais e selagem SHA-256. |
| **audit** | `/api/v1/audit` | Trilha de conformidade e auditoria de segurança. |
| **notifications** | `/api/v1/notifications` | Alertas operacionais dirigidos a utilizadores. |

---

## 4. Infraestrutura Google Cloud Platform (GCP)

- **Compute**: Google Cloud Run (Contentores sem servidor, auto-escaláveis, porta 8080).
- **Database**: Google Cloud SQL (PostgreSQL 16 com backups diários e PITR activado).
- **Storage**: Google Cloud Storage (`tenants/{org_id}/evidence/{case_id}/...`) com versionamento de objetos nativo.
- **Segurança**: Google Secret Manager para chaves criptográficas (`DATABASE_URL`, `SECRET_KEY`).
- **CI/CD**: Google Cloud Build executando suite de testes pytest e upload para o Artifact Registry.
