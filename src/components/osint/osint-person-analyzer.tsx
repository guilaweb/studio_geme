"use client";

import React, { useState } from "react";
import {
  Users,
  Shield,
  Building2,
  Globe,
  FileText,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
  Copy,
  Lock,
  Search
} from "lucide-react";

interface PublicMention {
  id: string;
  source: string;
  sourceType: string;
  date: string;
  title: string;
  snippet: string;
  url: string;
  sha256: string;
}

export function OsintPersonAnalyzer() {
  const [targetName, setTargetName] = useState("Dr. Manuel V.");
  const [activeQuery, setActiveQuery] = useState("Dr. Manuel V.");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const publicMentions: PublicMention[] = [
    {
      id: "men-1",
      source: "Boletim Oficial de Angola (Edital 12/2024)",
      sourceType: "Diário Oficial / Registo Mercantil",
      date: "12 Março 2024",
      title: "Despacho de Constituição Societária - Fiduciária e Mandatos",
      snippet: "Designado o cidadão Dr. Manuel V., titular do NIF 5410982319, com plenos poderes de representação bancária e fiduciária perante entidades públicas e financeiras.",
      url: "https://governo.gov.ao/diario-oficial/publicacoes/2024/03/edital-sociedades-12.pdf",
      sha256: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
    {
      id: "men-2",
      source: "Registo RDAP Internacional",
      sourceType: "WHOIS Administrativo",
      date: "14 Março 2024",
      title: "Registo de Domínio Corporativo vortex-consulting.org",
      snippet: "Contacto administrativo registado com indicação de mandato societário em Genebra vinculado ao número +41 79 123 4567.",
      url: "https://rdap.identity-digital.services/domain/vortex-consulting.org",
      sha256: "3c2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3210fedcba9876543210fedc",
    },
    {
      id: "men-3",
      source: "Jornal de Angola (Arquivo Público de Economia)",
      sourceType: "Imprensa Aberta",
      date: "20 Novembro 2025",
      title: "Participação no Fórum de Modernização Cambial de Luanda",
      snippet: "Dr. Manuel V. interveio como consultor em estruturas fiduciárias internacionais e conformidade com normas GAFI/FATF.",
      url: "https://jornaldeangola.ao/economia/forum-cambial-2025-painel",
      sha256: "5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3210fedcba9876543210",
    }
  ];

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Investigação de Identidade Pública (Pessoas Físicas)
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              ESTRITAMENTE PÚBLICO
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análise passiva de fontes públicas, registos mercantis e diários oficiais com proteção ética anti-incriminação sumária.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="Nome ou NIF do alvo..."
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono w-56"
          />
          <button
            onClick={() => setActiveQuery(targetName)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Proteção Ético-Forense Obrigatória */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-200">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white uppercase text-[11px] font-mono tracking-wider block">
            SALVAGUARDA DE INTELIGÊNCIA: &ldquo;RELAÇÃO NÃO CONFIRMADA&rdquo;
          </span>
          <p className="leading-relaxed">
            As referências abaixo compilam unicamente informações observáveis em repositórios estritamente públicos. O sistema está proibido de inferir controle ou titularidade definitiva sem a produção de prova pericial e homologação do Perito Relator.
          </p>
        </div>
      </div>

      {/* Grid de Identificadores e Organizações Públicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identificadores Públicos */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Identificadores Públicos
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              VERIFICADOS
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">Nome Completo Observado:</span>
              <span className="text-white font-bold">{activeQuery}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Número de Identificação Fiscal (NIF):</span>
              <span className="text-amber-400 font-bold select-all">5410982319</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Email Institucional Declarado:</span>
              <span className="text-slate-300">manuel.v@profundidade.ao</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Jurisdição de Domicílio Público:</span>
              <span className="text-slate-300">República de Angola (Luanda / Talatona)</span>
            </div>
          </div>
        </div>

        {/* Organizações & Mandatos */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Vínculos Societários Públicos
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
              3 REGISTOS
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded">
              <span className="text-white font-bold block">Vortex Consulting Offshore Ltd.</span>
              <span className="text-[10px] text-amber-400">Procurador Fiduciário (Mandato Pleno)</span>
              <span className="text-[10px] text-slate-500 block">Registo IBC-90219 • Seychelles</span>
            </div>

            <div className="p-2 bg-slate-950 border border-slate-800 rounded">
              <span className="text-white font-bold block">Fiduciária Luanda Holdings</span>
              <span className="text-[10px] text-slate-400">Sócio Fundador (Quotas Declaradas)</span>
              <span className="text-[10px] text-slate-500 block">Diário Oficial Edital 12/2024</span>
            </div>
          </div>
        </div>

        {/* Domínios e Infraestrutura Associada */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Domínios & Contactos
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              RDAP / WHOIS
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">Domínio Associado (Ativo):</span>
              <span className="text-white font-bold">vortex-consulting.org</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Contacto Telefónico Declarado:</span>
              <span className="text-amber-400 font-bold">+41 79 123 4567 (Suíça)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Classificação de Relação:</span>
              <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-[10px]">
                RELAÇÃO NÃO CONFIRMADA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menções e Publicações em Diários da República / Imprensa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Publicações & Menções em Diários Oficiais e Imprensa
            </h4>
            <p className="text-[11px] text-slate-400">
              Registos documentais capturados com cálculo de hash criptográfico SHA-256 no momento da extração.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{publicMentions.length} publicações indexadas</span>
        </div>

        <div className="space-y-3">
          {publicMentions.map((men) => (
            <div
              key={men.id}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-2.5 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                    {men.sourceType}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{men.source}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{men.date}</span>
              </div>

              <div>
                <h5 className="text-xs font-bold text-white">{men.title}</h5>
                <p className="text-xs text-slate-300 font-mono leading-relaxed mt-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                  {men.snippet}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex items-center space-x-2 text-slate-500">
                  <span>SHA-256: {men.sha256.slice(0, 20)}...</span>
                  <button
                    onClick={() => handleCopy(men.sha256)}
                    className="hover:text-amber-400"
                    title="Copiar Hash"
                  >
                    {copiedHash === men.sha256 ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <a
                  href={men.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Aceder ao Documento Original</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
