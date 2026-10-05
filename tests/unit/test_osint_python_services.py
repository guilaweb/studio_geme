import pytest
from apps.api.src.modules.osint.services.dork_service import (
    validate_dork_query,
    build_dork_query,
    get_ethical_dork_templates,
)
from apps.api.src.modules.osint.services.scraping_service import (
    evaluate_compliance_gate,
    compute_sha256,
    compute_website_diff,
)
from apps.api.src.modules.osint.services.identity_service import (
    detect_identifier_type,
    resolve_phone_identity,
    resolve_social_profile,
    get_default_identity_graph,
)


def test_dork_service_ethical_safeguard():
    # 1. Consulta legítima deve ser autorizada
    is_allowed, reason = validate_dork_query("site:gov.ao filetype:pdf \"relatório anual\"")
    assert is_allowed is True
    assert reason is None

    # 2. Consultas intrusivas ou com credenciais devem ser bloqueadas
    is_allowed, reason = validate_dork_query("site:vortex.org filetype:env password")
    assert is_allowed is False
    assert "termo restrito" in reason

    is_allowed, reason = validate_dork_query("inurl:admin/login id_rsa")
    assert is_allowed is False

    # 3. Builder
    built = build_dork_query(domain="example.com", filetype="pdf", term="auditoria")
    assert built["is_allowed"] is True
    assert "site:example.com" in built["query_text"]
    assert "filetype:pdf" in built["query_text"]


def test_scraping_compliance_gate():
    # 1. Alvo público válido com salvaguardas ativas
    gate = evaluate_compliance_gate("https://vortex-consulting.org/sobre", True, True, True)
    assert gate["decision"] == "ALLOW"
    assert len(gate["checks"]) == 6

    # 2. Tentativa de coleta em diretório interno ou de autenticação administrativa
    gate_block = evaluate_compliance_gate("https://banco.intranet.ao/admin/auth", True, True, True)
    assert gate_block["decision"] == "BLOCK"
    assert "BLOQUEADA" in gate_block["decision_summary"]

    # 3. Hash SHA-256
    hash_val = compute_sha256("Conteúdo de teste para cadeia de custódia")
    assert len(hash_val) == 64

    # 4. Diff de website
    prev = "Linha 1\nLinha 2 Antiga\nLinha 3"
    curr = "Linha 1\nLinha 2 Nova\nLinha 3\nLinha 4 Adicionada"
    diff = compute_website_diff(prev, curr)
    assert len(diff["added"]) > 0
    assert len(diff["removed"]) > 0


def test_identity_service_type_detection_and_phone_resolution():
    # 1. Deteção de tipos
    assert detect_identifier_type("+244 923 000 111") == "TELEFONE"
    assert detect_identifier_type("@manuel_v") == "PERFIL_SOCIAL"
    assert detect_identifier_type("investigador@policia.ao") == "EMAIL_PUBLICO"
    assert detect_identifier_type("vortex-consulting.org") == "DOMINIO"
    assert detect_identifier_type("Atlantis Holdings Lda") == "EMPRESA"
    assert detect_identifier_type("Manuel Silva Antunes") == "PESSOA_NOME"

    # 2. Resolução de Telefone com 3 níveis separados
    phone_res = resolve_phone_identity("+244 923 000 111")
    assert phone_res["country"] == "Angola"
    assert phone_res["public_sources_count"] >= 2
    assert len(phone_res["observed_instances"]) >= 2
    assert len(phone_res["associated_entities"]) >= 2

    # Regra Fundamental: Titularidade NÃO confirmada automaticamente
    assert phone_res["confirmed_holder"]["has_confirmed_holder"] is False
    assert phone_res["confirmed_holder"]["verification_status"] == "NAO_CONFIRMADO"
    assert "REGRA DE GOVERNANÇA" in phone_res["confirmed_holder"]["disclaimer"]


def test_identity_profile_and_graph():
    # 1. Perfil Social
    prof = resolve_social_profile("@manuel_v_fiduciario")
    assert prof["handle"] == "@manuel_v_fiduciario"
    assert len(prof["possible_matches"]) > 0
    assert prof["possible_matches"][0]["confidence"] == 86

    # 2. Grafo de Identidade
    graph = get_default_identity_graph()
    assert len(graph["nodes"]) >= 6
    assert len(graph["edges"]) >= 3
    assert all("evidence_hash" in e for e in graph["edges"])
