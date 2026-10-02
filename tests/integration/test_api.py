import io
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import Base, engine, SessionLocal
from src.seed import seed_system_data

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_system_data(db)
    db.close()
    yield


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "PROFUNDIDADE API"


def test_complete_platform_lifecycle_and_multitenancy():
    # 1. Register User A
    user_a_email = "investigador.a@profundidade.ao"
    user_a_pw = "Investiga#2026Segura!"
    res = client.post("/api/v1/users", json={
        "email": user_a_email,
        "password": user_a_pw,
        "full_name": "Capitão Investigador Silva",
    })
    assert res.status_code in [201, 409]

    # 2. Login User A
    res = client.post("/api/v1/auth/login", json={
        "email": user_a_email,
        "password": user_a_pw,
    })
    assert res.status_code == 200
    token_a = res.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 3. User A creates Organization A (e.g. DII - Direcção de Investigação e Ilícitos)
    res = client.post("/api/v1/organizations", json={
        "name": "Direcção de Investigação e Ilícitos Penais",
        "legal_name": "DIIP Luanda",
        "nif": "5412893847",
        "province": "Luanda",
        "currency": "AOA",
    }, headers=headers_a)
    assert res.status_code == 201
    org_a = res.json()
    org_a_id = org_a["id"]

    # Switch active context to Org A
    headers_a["X-Organization-ID"] = org_a_id

    # 4. User B registers & creates Organization B (Private Corporate Security)
    user_b_email = "auditor.b@empresas.ao"
    user_b_pw = "Auditoria#2026Corp!"
    client.post("/api/v1/users", json={
        "email": user_b_email,
        "password": user_b_pw,
        "full_name": "Dra. Teresa Bento",
    })
    res_b_login = client.post("/api/v1/auth/login", json={
        "email": user_b_email,
        "password": user_b_pw,
    })
    token_b = res_b_login.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_org_b = client.post("/api/v1/organizations", json={
        "name": "Segurança e Compliance Petrolífero Lda",
        "legal_name": "SCP Angola Lda",
        "nif": "5000192837",
        "province": "Cabinda",
    }, headers=headers_b)
    assert res_org_b.status_code == 201
    org_b_id = res_org_b.json()["id"]
    headers_b["X-Organization-ID"] = org_b_id

    # 5. User A creates an investigative Case in Org A
    res_case = client.post("/api/v1/cases", json={
        "title": "Operação Diamante Oculto",
        "description": "Investigação sobre exportação não declarada de gemas e minérios raros.",
        "priority": "HIGH",
        "tags": ["mineração", "aduana", "evasão"],
    }, headers=headers_a)
    assert res_case.status_code == 201
    case_a = res_case.json()
    case_a_id = case_a["id"]
    assert case_a["case_number"].startswith("CAS-")
    assert case_a["priority"] == "HIGH"

    # Verify real stats endpoint
    res_stats = client.get("/api/v1/cases/stats", headers=headers_a)
    assert res_stats.status_code == 200
    assert res_stats.json()["total_cases"] >= 1

    # 6. STRICT MULTI-TENANCY TEST:
    # User B (in Org B) MUST NOT be able to view or manipulate Case A!
    res_unauth = client.get(f"/api/v1/cases/{case_a_id}", headers=headers_b)
    assert res_unauth.status_code == 404, "Tenant B accessed Tenant A's case!"

    # 7. Add Entities to Case A
    res_ent1 = client.post("/api/v1/entities", json={
        "case_id": case_a_id,
        "type": "ORGANIZATION",
        "name": "Sociedade Mineira do Kwanza Lda",
        "identifier": "5400998877",
        "risk_score": 0.85,
        "attributes": {"sector": "Exploração Mineira", "sede": "Luanda"},
    }, headers=headers_a)
    assert res_ent1.status_code == 201
    ent1_id = res_ent1.json()["id"]

    res_ent2 = client.post("/api/v1/entities", json={
        "case_id": case_a_id,
        "type": "INDIVIDUAL",
        "name": "Manuel António Domingos",
        "identifier": "002847192LA041",
        "risk_score": 0.75,
        "attributes": {"cargo": "Director Geral"},
    }, headers=headers_a)
    assert res_ent2.status_code == 201
    ent2_id = res_ent2.json()["id"]

    # 8. Add Relationship
    res_rel = client.post("/api/v1/relationships", json={
        "case_id": case_a_id,
        "source_entity_id": ent2_id,
        "target_entity_id": ent1_id,
        "relation_type": "DIRECTOR_OF",
        "confidence": 1.0,
        "notes": "Nomeado em Diário da República nº 42/2024",
    }, headers=headers_a)
    assert res_rel.status_code == 201

    # 9. Verify Graph Data
    res_graph = client.get(f"/api/v1/relationships/graph/{case_a_id}", headers=headers_a)
    assert res_graph.status_code == 200
    graph_data = res_graph.json()
    assert len(graph_data["nodes"]) == 2
    assert len(graph_data["edges"]) == 1

    # 10. Run Real Analysis
    res_analysis = client.post("/api/v1/analysis/run", json={
        "case_id": case_a_id,
        "analysis_type": "NETWORK_METRICS",
    }, headers=headers_a)
    assert res_analysis.status_code == 201
    assert res_analysis.json()["status"] == "COMPLETED"

    # 11. Upload Evidence with SHA-256 & Chain of Custody
    file_bytes = b"CONTRATO SOCIAL E FACTURAS ADUANEIRAS - REGISTO OFICIAL DE CARGA 2026"
    res_upload = client.post(
        "/api/v1/evidence/upload",
        data={
            "case_id": case_a_id,
            "title": "Manifesto de Carga Aduaneira",
            "description": "Ficheiro digital apreendido no terminal portuário.",
            "source": "Terminal 2 Porto de Luanda",
        },
        files={"file": ("manifesto_porto.pdf", io.BytesIO(file_bytes), "application/pdf")},
        headers=headers_a,
    )
    assert res_upload.status_code == 201
    evidence = res_upload.json()
    assert evidence["sha256_hash"] is not None
    assert len(evidence["sha256_hash"]) == 64
    assert len(evidence["custody_events"]) == 1
    assert evidence["custody_events"][0]["action"] == "ACQUISITION"

    # Verify Cryptographic Integrity
    res_verify = client.post(f"/api/v1/evidence/{evidence['id']}/verify", headers=headers_a)
    assert res_verify.status_code == 200
    assert res_verify.json()["is_valid"] is True
    assert res_verify.json()["status"] == "INTEGRIOUS"

    # Create New Version of Evidence (Rule 15: No silent overwrite)
    updated_bytes = b"CONTRATO SOCIAL E FACTURAS ADUANEIRAS - REGISTO REVISADO COM CARIMBO DE VISTORIA"
    res_ver2 = client.post(
        f"/api/v1/evidence/{evidence['id']}/version",
        data={"title": "Manifesto de Carga Aduaneira (Com Carimbo Pericial)"},
        files={"file": ("manifesto_v2.pdf", io.BytesIO(updated_bytes), "application/pdf")},
        headers=headers_a,
    )
    assert res_ver2.status_code == 201
    ev_v2 = res_ver2.json()
    assert ev_v2["version"] == 2
    assert ev_v2["parent_evidence_id"] == evidence["id"]

    # 12. SI (Sistema de Inteligência) - Automated Inference & Human Validation
    res_si = client.post("/api/v1/si/generate", json={
        "case_id": case_a_id,
        "focus_area": "ANOMALY_DETECTION",
    }, headers=headers_a)
    assert res_si.status_code == 201
    inferences = res_si.json()
    # At least the isolated entity or general inference was evaluated
    if inferences:
        inf = inferences[0]
        assert inf["is_automated"] is True
        assert "sujeito a validação humana" in inf["legal_disclaimer"].lower()
        assert inf["human_validation_status"] == "PENDING"

        # Validate with human in the loop
        res_val = client.post(f"/api/v1/si/inferences/{inf['id']}/validate", json={
            "validation_status": "CONFIRMED",
            "rationale": "Verificado e corroborado com dados documentais de alfândega.",
        }, headers=headers_a)
        assert res_val.status_code == 200
        assert res_val.json()["human_validation_status"] == "CONFIRMED"

    # 13. Generate and Seal Report
    res_rep = client.post("/api/v1/reports/generate", json={
        "case_id": case_a_id,
        "title": "Dossier Conclusivo de Investigação - Operação Diamante Oculto",
        "report_type": "INVESTIGATION_DOSSIER",
    }, headers=headers_a)
    assert res_rep.status_code == 201
    report = res_rep.json()
    assert "## 1. RESUMO OPERACIONAL" in report["content_markdown"]
    assert "Sociedade Mineira do Kwanza" in report["content_markdown"]
    assert evidence["sha256_hash"] in report["content_markdown"]

    # Seal report
    res_seal = client.post(f"/api/v1/reports/{report['id']}/seal", headers=headers_a)
    assert res_seal.status_code == 200
    assert res_seal.json()["status"] == "SEALED"
    assert res_seal.json()["cryptographic_seal_hash"] is not None

    # 14. Audit Trail Verification
    res_audit = client.get("/api/v1/audit", headers=headers_a)
    assert res_audit.status_code == 200
    logs = res_audit.json()
    actions = {l["action"] for l in logs}
    assert "CASE_CREATE" in actions
    assert "EVIDENCE_ACQUIRED" in actions
    assert "REPORT_SEALED" in actions
    # Strict isolation: Audit logs must only contain records for Org A
    assert all(l["organization_id"] == org_a_id for l in logs)
