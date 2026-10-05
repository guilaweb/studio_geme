"""
PROFUNDIDADE - Digital Identity & Entity Resolution Service
Motor analítico de correlação probatória de identificadores públicos e desambiguação
de entidades em conformidade estrita com o Art. 212º do CPP e cadeia de custódia.
"""

import re
from typing import Dict, List, Optional


def detect_identifier_type(identifier: str) -> str:
    """
    Identifica dinamicamente a tipologia de um identificador público fornecido.
    Retorna: TELEFONE, PERFIL_SOCIAL, EMAIL_PUBLICO, DOMINIO, EMPRESA, PESSOA_NOME, IDENTIFICADOR_GERAL.
    """
    clean = identifier.strip()
    if not clean:
        return "IDENTIFICADOR_GERAL"

    # Telefone (+244..., +351..., etc.)
    digits = re.sub(r"\D", "", clean)
    if (clean.startswith("+") or clean.startswith("00") or digits.startswith("9") or digits.startswith("2")) and len(digits) >= 8:
        return "TELEFONE"

    # Perfil Social (@handle ou URL de redes conhecidas)
    if clean.startswith("@") or any(
        network in clean.lower()
        for network in ["linkedin.com", "twitter.com", "x.com", "github.com", "facebook.com", "instagram.com"]
    ):
        return "PERFIL_SOCIAL"

    # Email
    if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean):
        return "EMAIL_PUBLICO"

    # Domínio de internet
    if re.match(r"^[a-zA-Z0-9.-]+\.(com|ao|pt|org|net|io|co|gov|edu)(\/.*)?$", clean, re.IGNORECASE) and "@" not in clean:
        return "DOMINIO"

    # Empresa
    if any(
        term in clean.lower()
        for term in ["lda", "sa", "limitada", "holdings", "consulting", "investimentos", "banco", "corp", "inc"]
    ):
        return "EMPRESA"

    # Nome de Pessoa (2 ou mais palavras)
    if len(clean.split()) >= 2:
        return "PESSOA_NOME"

    return "IDENTIFICADOR_GERAL"


def resolve_phone_identity(phone_number: str) -> Dict[str, any]:
    """
    Resolução analítica de número de telefone, separando rigorosamente:
    1. Número Observado (fontes públicas onde ocorre)
    2. Entidade Associada (hipóteses de correlação com pontuação analítica)
    3. Titular Confirmado (apenas com base oficial documentada; recusa explícita de fugas de dados)
    """
    clean_num = phone_number.strip()

    country = "Angola" if clean_num.startswith("+244") else ("Suíça" if clean_num.startswith("+41") else "Internacional")
    carrier = "Unitel (Gama 923)" if "+244 923" in clean_num or "923" in clean_num else "Operador Móvel Nacional"

    observed_instances = [
        {
            "url": "https://vortex-consulting.org/contactos",
            "source_title": "Página Oficial de Contactos • Vortex Consulting",
            "snippet": f"Linha Corporativa Direta: {clean_num}. Sede Operacional em Luanda.",
            "date_observed": "2026-10-03",
            "source_type": "PUBLICO",
            "content_hash": "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
        },
        {
            "url": "https://imprensa.gov.ao/diario/edital-sociedades-2024.pdf",
            "source_title": "Diário da República de Angola • Registo de Sociedades",
            "snippet": f"Notificações urgentes através do terminal {clean_num}.",
            "date_observed": "2024-03-22",
            "source_type": "REGISTO_OFICIAL",
            "content_hash": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
        },
    ]

    associated_entities = [
        {
            "id": "assoc-1",
            "entity_name": "Vortex Consulting Lda",
            "entity_type": "EMPRESA",
            "relationship": "Contacto Corporativo Divulgado",
            "confidence": 82,
            "status_text": "Possível correspondência",
            "indicators": [
                "Mencionado como canal oficial em página institucional",
                "Citado em anúncio societário do Diário da República",
            ],
        },
        {
            "id": "assoc-2",
            "entity_name": "Dr. Manuel V.",
            "entity_type": "PESSOA",
            "relationship": "Contacto de Secretariado Observado",
            "confidence": 54,
            "status_text": "Não confirmado",
            "indicators": [
                "Aparece associado ao secretariado do orador em programa de conferência",
                "Não constitui titularidade pessoal comprovada",
            ],
        },
    ]

    confirmed_holder = {
        "has_confirmed_holder": False,
        "verification_status": "NAO_CONFIRMADO",
        "disclaimer": (
            "REGRA DE GOVERNANÇA: A titularidade jurídica de um número telefónico só é registada no PROFUNDIDADE "
            "mediante requisição judicial, ofício de operadora de telecomunicações ou consentimento formal do titular "
            "em inquérito. O sistema não utiliza nem indexa vazamentos de dados clandestinos ou plataformas de intrusão."
        ),
    }

    return {
        "phone_number": clean_num,
        "country": country,
        "carrier": carrier,
        "line_type": "Móvel",
        "public_sources_count": len(observed_instances),
        "observed_instances": observed_instances,
        "associated_entities": associated_entities,
        "confirmed_holder": confirmed_holder,
    }


def resolve_social_profile(handle_or_url: str) -> Dict[str, any]:
    """
    Constrói a ficha de correlação de um perfil social sem inferir identidade definitiva.
    """
    handle = handle_or_url.strip()
    if not handle.startswith("@") and not handle.startswith("http"):
        handle = f"@{handle}"

    return {
        "handle": handle,
        "platform": "LinkedIn",
        "public_name": "Dr. Manuel V.",
        "bio": "Gestão fiduciária internacional e veículos societários transfronteiriços. Luanda • Genebra • Lisboa.",
        "website": "https://vortex-consulting.org",
        "public_identifiers": ["NIF 5410982319", "Cédula OAA 14.892"],
        "mentioned_entities": ["Vortex Consulting Lda", "Atlantis Global Holdings Ltd."],
        "possible_matches": [
            {
                "target_name": "Dr. Manuel V. (Alvo Principal CASO-2026-001)",
                "confidence": 86,
                "indicators": [
                    "Mesmo nome público e patronímico verificado",
                    "Mesmo website público declarado (vortex-consulting.org)",
                    "Mesmo identificador profissional (Ordem dos Advogados)",
                    "Referência cruzada documental em publicação oficial",
                ],
                "evidence_count": 4,
            }
        ],
    }


def get_default_identity_graph() -> Dict[str, any]:
    """
    Retorna a topologia de nós e arestas de identidade com metadados periciais.
    """
    nodes = [
        {"id": "node-p1", "label": "Pessoa A (Dr. Manuel V.)", "type": "PESSOA", "identifier": "Dr. Manuel V."},
        {"id": "node-t1", "label": "Telefone (+244 923 000 111)", "type": "TELEFONE", "identifier": "+244 923 000 111"},
        {"id": "node-p_soc", "label": "Perfil (@manuel_v_fiduciario)", "type": "PERFIL", "identifier": "@manuel_v_fiduciario"},
        {"id": "node-emp1", "label": "Empresa (Vortex Consulting Lda)", "type": "EMPRESA", "identifier": "Vortex Consulting Lda"},
        {"id": "node-web1", "label": "Website (vortex-consulting.org)", "type": "WEBSITE", "identifier": "https://vortex-consulting.org"},
        {"id": "node-dom1", "label": "Domínio (vortex-consulting.org)", "type": "DOMINIO", "identifier": "vortex-consulting.org"},
    ]

    edges = [
        {
            "id": "edge-py-1",
            "source_id": "node-p1",
            "target_id": "node-t1",
            "relationship": "Contacto Observado em Evento",
            "source_title": "Conferência Internacional de Ativos",
            "evidence_hash": "3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
            "confidence": 65,
            "state": "POSSIVEL",
            "validator": "Perito Silva",
        },
        {
            "id": "edge-py-2",
            "source_id": "node-p1",
            "target_id": "node-emp1",
            "relationship": "Administrador Fiduciário",
            "source_title": "Diário da República III Série",
            "evidence_hash": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            "confidence": 96,
            "state": "VALIDADO",
            "validator": "Procurador Responsável",
        },
        {
            "id": "edge-py-3",
            "source_id": "node-t1",
            "target_id": "node-web1",
            "relationship": "Contacto Exibido no Rodapé",
            "source_title": "Website Oficial",
            "evidence_hash": "8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba9876543210fe",
            "confidence": 92,
            "state": "CORROBORADO",
            "validator": "Analista Forense OSINT",
        },
    ]

    return {"nodes": nodes, "edges": edges}
