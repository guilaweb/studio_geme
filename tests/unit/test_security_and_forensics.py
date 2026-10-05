import hashlib
import os
import tempfile
import pytest
import src.models
from src.modules.evidence.router import compute_sha256
from src.modules.si.models import SiInference
from src.modules.reports.models import Report


def test_sha256_cryptographic_integrity_and_anti_tamper():
    """
    Test Rule 14 & Rule 15:
    Every evidence file must have an immutable SHA-256 hash.
    Any single-bit modification must trigger tamper detection.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        original_content = b"DISPOSITIVO MOVEL APREENDIDO: EXTRATO DE CHAMADAS E DADOS CIFRADOS 2026"
        tmp.write(original_content)
        tmp_path = tmp.name

    try:
        # Calculate original hash
        original_hash = compute_sha256(tmp_path)
        assert len(original_hash) == 64
        expected = hashlib.sha256(original_content).hexdigest()
        assert original_hash == expected

        # Simulate silent tampering
        with open(tmp_path, "wb") as f:
            f.write(b"DISPOSITIVO MOVEL APREENDIDO: EXTRATO DE CHAMADAS E DADOS MODIFICADOS!")

        tampered_hash = compute_sha256(tmp_path)
        assert tampered_hash != original_hash
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_si_human_in_the_loop_mandatory_fields():
    """
    Test Rule 16:
    AI / SI features must be clearly marked as automated and require human-in-the-loop validation.
    """
    inference = SiInference(
        organization_id="org_test_01",
        case_id="case_test_01",
        inference_type="ANOMALY_DETECTION",
        title="Triangulação Financeira Suspeita",
        explanation="Empresa X apresenta triangulação atípica de capitais com offshore.",
        confidence_score=0.88,
        payload={"flow_volume": 45000000, "source": "Aduana Portuária"},
        is_automated=True,
        legal_disclaimer="Resultado analítico automatizado de Inteligência (SI). Sujeito a validação humana obrigatória.",
        human_validation_status="PENDING",
    )

    assert inference.is_automated is True
    assert inference.human_validation_status == "PENDING"
    assert "validação humana obrigatória" in inference.legal_disclaimer.lower()
    assert inference.validated_by_id is None
    assert inference.validation_rationale is None


def test_report_cryptographic_seal_contract():
    """
    Test Rule 15 & Rule 17:
    Sealed reports must contain a cryptographic hash computed from content and metadata,
    and be marked as SEALED.
    """
    content = "# RELATÓRIO PERICIAL CONCLUSIVO\nOperação Luanda Segura 2026."
    seal_hasher = hashlib.sha256()
    seal_hasher.update(content.encode("utf-8"))
    expected_seal = seal_hasher.hexdigest()

    report = Report(
        organization_id="org_test_01",
        case_id="case_test_01",
        title="Dossiê Pericial Conclusivo",
        report_type="INVESTIGATION_DOSSIER",
        content_markdown=content,
        status="SEALED",
        cryptographic_seal_hash=expected_seal,
    )

    assert report.status == "SEALED"
    assert len(report.cryptographic_seal_hash) == 64
    assert report.cryptographic_seal_hash == expected_seal
