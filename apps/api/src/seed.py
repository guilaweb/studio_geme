from sqlalchemy.orm import Session
from src.database import SessionLocal, Base, engine
from src.modules.roles.models import Role, Permission
import src.models  # Ensure all models are registered with Base metadata

SYSTEM_PERMISSIONS = [
    # Cases
    ("cases:read", "Consultar casos investigativos", "cases"),
    ("cases:create", "Criar novos casos investigativos", "cases"),
    ("cases:update", "Actualizar metadados e status de casos", "cases"),
    ("cases:delete", "Eliminar casos arquivados", "cases"),
    # Entities
    ("entities:read", "Consultar pessoas, empresas e activos", "entities"),
    ("entities:create", "Registar novas entidades", "entities"),
    ("entities:update", "Editar entidades e pontuação de risco", "entities"),
    ("entities:delete", "Remover entidades", "entities"),
    # Relationships
    ("relationships:read", "Visualizar grafo e vínculos", "relationships"),
    ("relationships:create", "Estabelecer conexões entre entidades", "relationships"),
    ("relationships:delete", "Remover conexões", "relationships"),
    # Evidence
    ("evidence:read", "Consultar evidências e cadeia de custódia", "evidence"),
    ("evidence:upload", "Fazer upload e adquirir evidências com hash SHA-256", "evidence"),
    ("evidence:verify", "Executar verificação criptográfica de integridade", "evidence"),
    ("evidence:version", "Criar nova versão de evidência", "evidence"),
    # Investigations
    ("investigations:manage", "Gerir tarefas e notas de investigação", "investigations"),
    # OSINT
    ("osint:query", "Executar pesquisas OSINT em fontes abertas", "osint"),
    # Analysis
    ("analysis:run", "Executar análise de rede e métricas", "analysis"),
    # SI
    ("si:generate", "Gerar inferências automatizadas de inteligência", "si"),
    ("si:validate", "Validar ou rejeitar hipóteses de inteligência (Human-in-the-loop)", "si"),
    # Reports
    ("reports:create", "Gerar relatórios e dossiers operacionais", "reports"),
    ("reports:seal", "Aprovar e selar relatórios com hash SHA-256", "reports"),
    # Audit
    ("audit:read", "Consultar trilha de auditoria e conformidade", "audit"),
    # Management
    ("org:manage", "Gerir configurações e membros da organização", "organizations"),
    ("users:manage", "Gerir utilizadores e atribuição de funções", "users"),
]

ROLE_PERMISSIONS_MAP = {
    "ADMIN": [p[0] for p in SYSTEM_PERMISSIONS],
    "INVESTIGATOR": [
        "cases:read", "cases:create", "cases:update",
        "entities:read", "entities:create", "entities:update",
        "relationships:read", "relationships:create",
        "evidence:read", "evidence:upload", "evidence:verify", "evidence:version",
        "investigations:manage", "osint:query", "analysis:run",
        "si:generate", "si:validate",
        "reports:create",
    ],
    "ANALYST": [
        "cases:read",
        "entities:read", "entities:create", "entities:update",
        "relationships:read", "relationships:create",
        "evidence:read", "evidence:verify",
        "osint:query", "analysis:run",
        "si:generate", "si:validate",
        "reports:create",
    ],
    "AUDITOR": [
        "cases:read",
        "entities:read",
        "relationships:read",
        "evidence:read", "evidence:verify",
        "reports:create",
        "audit:read",
    ],
}


def seed_system_data(db: Session = None):
    """Seed initial permissions and roles if not already present."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # 1. Seed Permissions
        perm_objs = {}
        for code, desc, mod in SYSTEM_PERMISSIONS:
            existing = db.query(Permission).filter(Permission.code == code).first()
            if not existing:
                existing = Permission(code=code, description=desc, module=mod)
                db.add(existing)
                db.flush()
            perm_objs[code] = existing

        # 2. Seed Roles and map permissions
        for role_name, allowed_codes in ROLE_PERMISSIONS_MAP.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(
                    name=role_name,
                    description=f"Função de sistema {role_name}",
                    is_system_role=True,
                )
                db.add(role)
                db.flush()

            # Attach permissions
            current_codes = {p.code for p in role.permissions}
            for code in allowed_codes:
                if code in perm_objs and code not in current_codes:
                    role.permissions.append(perm_objs[code])

        db.commit()
        print("Database seeded with system roles and permissions successfully.")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_system_data()
