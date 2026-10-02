from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.database import engine, Base, SessionLocal
from src.seed import seed_system_data
import src.models  # Discover all tables

# Import Module Routers
from src.modules.authentication.router import router as auth_router
from src.modules.organizations.router import router as organizations_router
from src.modules.users.router import router as users_router
from src.modules.roles.router import router as roles_router
from src.modules.cases.router import router as cases_router
from src.modules.entities.router import router as entities_router
from src.modules.relationships.router import router as relationships_router
from src.modules.evidence.router import router as evidence_router
from src.modules.investigations.router import router as investigations_router
from src.modules.osint.router import router as osint_router
from src.modules.analysis.router import router as analysis_router
from src.modules.si.router import router as si_router
from src.modules.reports.router import router as reports_router
from src.modules.audit.router import router as audit_router
from src.modules.notifications.router import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist & seed default RBAC roles
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_system_data(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "PROFUNDIDADE - Sistema Operacional Digital de Inteligência, "
        "Investigação e Evidências sobre Google Cloud Platform."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    """Service health inspection endpoint."""
    return {
        "status": "HEALTHY",
        "service": "PROFUNDIDADE API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


# Register Versioned API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(organizations_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(roles_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(entities_router, prefix=settings.API_V1_STR)
app.include_router(relationships_router, prefix=settings.API_V1_STR)
app.include_router(evidence_router, prefix=settings.API_V1_STR)
app.include_router(investigations_router, prefix=settings.API_V1_STR)
app.include_router(osint_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(si_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
