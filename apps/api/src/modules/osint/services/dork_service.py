"""
PROFUNDIDADE - Dork Service & Ethical Governance Engine
Impede a construção ou execução de consultas destinadas à intrusão,
busca de credenciais, chaves privadas ou ambientes administrativos restritos.
"""

from typing import Dict, List, Optional, Tuple

BLOCKED_DORK_PATTERNS = [
    "password", "passwords", "senha", "senhas",
    "admin/login", "wp-login", "user_login", "cpanel",
    "id_rsa", "id_dsa", "begin private key", "begin rsa private key",
    "secret_key", "aws_secret_access_key", "api_key",
    "cartao de credito", "cvv", "dados_bancarios",
    "vazamento", "leak", "combo_list", "credential_dump",
    "filetype:env", "inurl:.env", "inurl:phpmyadmin",
]

ETHICAL_TEMPLATES = [
    {
        "id": "tmpl-py-1",
        "title": "Documentos Públicos e Relatórios Fiduciários (PDF)",
        "category": "DOCUMENTOS",
        "description": "Localiza balancetes, atas e editais públicos em formato PDF hospedados no domínio do alvo.",
        "query_template": "site:{domain} filetype:pdf (relatório OR contas OR edital OR procuração)",
        "operators": ["site:", "filetype:", "OR", "()"],
        "ethical_guidance": "Mapeamento passivo de transparência institucional sem envio de pacotes intrusivos.",
    },
    {
        "id": "tmpl-py-2",
        "title": "Menções em Diários Oficiais e Portais de Imprensa",
        "category": "ESTRUTURAL",
        "description": "Rastreia publicações compulsórias no Diário da República e imprensa oficial angolana.",
        "query_template": "site:gov.ao OR site:imprensa.gov.ao \"{term}\"",
        "operators": ["site:", "\" \"", "OR"],
        "ethical_guidance": "Acesso a publicações compulsórias para instrução probatória legal (Art. 212º CPP).",
    },
    {
        "id": "tmpl-py-3",
        "title": "Planilhas e Balanços Consolidados Abertos (XLSX/CSV)",
        "category": "DOCUMENTOS",
        "description": "Identifica demonstrações financeiras e dados orçamentários disponibilizados voluntariamente.",
        "query_template": "site:{domain} (filetype:xlsx OR filetype:csv) (orçamento OR custos OR balanço)",
        "operators": ["site:", "filetype:", "OR"],
        "ethical_guidance": "Restrito a dados financeiros de divulgação pública corporativa.",
    },
    {
        "id": "tmpl-py-4",
        "title": "Descoberta de Subdomínios e Ambientes Públicos",
        "category": "DOMINIOS",
        "description": "Descobre subdomínios indexados em motores abertos sem varredura ativa de portas.",
        "query_template": "site:{domain} -www",
        "operators": ["site:", "-www"],
        "ethical_guidance": "Reconhecimento puramente passivo sem emissão de tráfego contra a infraestrutura do alvo.",
    },
]


def validate_dork_query(query: str) -> Tuple[bool, Optional[str]]:
    """
    Avalia a consulta contra a política de governança e ética pericial do PROFUNDIDADE.
    Retorna (is_allowed, reason).
    """
    lower = query.lower()
    for pattern in BLOCKED_DORK_PATTERNS:
        if pattern in lower:
            return (
                False,
                f"A consulta contém o termo restrito '{pattern}'. O PROFUNDIDADE bloqueia estritamente Dorks destinados à busca de credenciais, chaves privadas ou ambientes administrativos restritos.",
            )
    return True, None


def build_dork_query(
    engine: str = "Google",
    domain: Optional[str] = None,
    term: Optional[str] = None,
    inurl: Optional[str] = None,
    intitle: Optional[str] = None,
    filetype: Optional[str] = None,
    exact_match: bool = False,
) -> Dict[str, any]:
    """
    Constrói sintaxe normalizada de busca e valida automaticamente contra as regras éticas.
    """
    parts = []
    if domain and domain.strip():
        parts.append(f"site:{domain.strip()}")
    if inurl and inurl.strip():
        parts.append(f"inurl:{inurl.strip()}")
    if intitle and intitle.strip():
        parts.append(f"intitle:{intitle.strip()}")
    if filetype and filetype.strip():
        parts.append(f"filetype:{filetype.strip()}")
    if term and term.strip():
        t = term.strip()
        parts.append(f'"{t}"' if exact_match else t)

    built = " ".join(parts)
    is_allowed, reason = validate_dork_query(built)

    return {
        "engine": engine,
        "query_text": built,
        "is_allowed": is_allowed,
        "block_reason": reason,
    }


def get_ethical_dork_templates() -> List[Dict[str, any]]:
    return ETHICAL_TEMPLATES
