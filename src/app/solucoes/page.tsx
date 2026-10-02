'use client';

import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  Fingerprint,
  Network,
  Search,
  Check,
  ArrowRight,
  BrainCircuit,
  Lock,
  FileCheck,
  Calendar,
  Share2,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

interface SectorSolution {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof ShieldAlert;
  color: string;
  badgeColor: string;
  description: string;
  modules: { code: string; name: string; color: string }[];
  features: string[];
  kpi: { value: string; label: string };
}

const solutions: SectorSolution[] = [
  {
    id: 'inteligencia-estado',
    title: 'Inteligência Estratégica & Segurança Pública',
    subtitle: 'Dossiês classificados, investigação criminal e operações táticas',
    icon: ShieldAlert,
    color: 'text-primary',
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
    description: 'Gestão integral do ciclo de vida da investigação: da criação de casos e alocação de investigadores ao cruzamento de alvos sensíveis, controle estrito de alçadas e isolamento de segredo de justiça.',
    modules: [
      { code: '📁', name: 'CASOS', color: 'text-blue-500 bg-blue-500/10' },
      { code: '👥', name: 'MEMBROS', color: 'text-emerald-500 bg-emerald-500/10' },
      { code: '🔒', name: 'SEGREDO', color: 'text-red-500 bg-red-500/10' },
      { code: '📑', name: 'DOSSIÊS', color: 'text-amber-500 bg-amber-500/10' },
    ],
    features: [
      'Classificação de casos por nível de sensibilidade e segredo de justiça estrito',
      'Controle de acesso granular baseado em papéis (RBAC) com trilha de auditoria completa',
      'Linha do tempo investigativa dinâmica com eventos, diligências e despachos',
      'Exportação de relatórios de inteligência com numeração e marcas de confidencialidade',
      'Isolamento criptográfico e multi-tenant absoluto entre unidades e agências',
    ],
    kpi: {
      value: 'Zero Fuga de Dados',
      label: 'com isolamento de organizações e logs imutáveis',
    },
  },
  {
    id: 'pericia-forense',
    title: 'Perícia Forense & Cadeia de Custódia Digital',
    subtitle: 'Evidências com SHA-256, autos de apreensão e laudos periciais',
    icon: Fingerprint,
    color: 'text-emerald-500',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Ingestão e custódia de ficheiros com cálculo de hash SHA-256 em tempo real, armazenamento seguro em Google Cloud Storage e histórico ininterrupto de posse, transferência e exame pericial.',
    modules: [
      { code: '🛡️', name: 'CUSTÓDIA', color: 'text-emerald-500 bg-emerald-500/10' },
      { code: '🔑', name: 'SHA-256', color: 'text-purple-500 bg-purple-500/10' },
      { code: '📦', name: 'GCS', color: 'text-blue-500 bg-blue-500/10' },
      { code: '📜', name: 'VERSÕES', color: 'text-amber-500 bg-amber-500/10' },
    ],
    features: [
      'Validação de integridade e cálculo de hash SHA-256 imediatamente no upload',
      'Cadeia de custódia com registo imutável de custodiante, motivo e data/hora',
      'Proibição de alteração silenciosa: novas modificações geram versões encadeadas',
      'Auto de apreensão e termo de guarda probatória gerados em formato PDF pericial',
      'Armazenamento protegido em Google Cloud Storage com encriptação AES-256 em repouso',
    ],
    kpi: {
      value: 'Inviolabilidade 100%',
      label: 'garantida por hash criptográfico SHA-256',
    },
  },
  {
    id: 'fraude-compliance',
    title: 'Fraude Corporativa & Investigação de Compliance',
    subtitle: 'Auditorias internas, rastreamento financeiro e desvio de fundos',
    icon: Network,
    color: 'text-amber-500',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Identificação de esquemas de corrupção, conflitos de interesses, empresas de fachada e transferências atípicas através de análise estruturada de entidades e fluxos financeiros.',
    modules: [
      { code: '🏢', name: 'ENTIDADES', color: 'text-amber-500 bg-amber-500/10' },
      { code: '🕸️', name: 'VÍNCULOS', color: 'text-purple-500 bg-purple-500/10' },
      { code: '💰', name: 'FINANCEIRO', color: 'text-emerald-500 bg-emerald-500/10' },
      { code: '⚖️', name: 'FINDINGS', color: 'text-red-500 bg-red-500/10' },
    ],
    features: [
      'Mapeamento de pessoas politicamente expostas (PEPs) e sócios ocultos',
      'Cruzamento de números de identificação fiscal (NIF), contas e participações',
      'Grafo visual interativo de ligações entre suspeitos, empresas e contas bancárias',
      'Registo de achados periciais (findings) com anexação direta de provas concretas',
      'Relatórios executivos de auditoria forense com valor probatório formal',
    ],
    kpi: {
      value: 'Rastreabilidade Total',
      label: 'de fluxos financeiros e beneficiários finais',
    },
  },
  {
    id: 'osint-analise',
    title: 'OSINT & Laboratório de Análise de Dados',
    subtitle: 'Fontes abertas, ingestão multiformato e inteligência artificial assistiva',
    icon: Search,
    color: 'text-blue-500',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Coleta de fontes abertas respeitando limites legais, ingestão de dados heterogéneos (CSV, XLSX, JSON, XML, TXT, LOG, PDF) e aceleração analítica via Sistema de Inteligência (SI).',
    modules: [
      { code: '🌐', name: 'OSINT', color: 'text-blue-500 bg-blue-500/10' },
      { code: '🔬', name: 'LAB', color: 'text-cyan-500 bg-cyan-500/10' },
      { code: '🤖', name: 'SI-AI', color: 'text-violet-500 bg-violet-500/10' },
      { code: '👤', name: 'HUMAN-LOOP', color: 'text-emerald-500 bg-emerald-500/10' },
    ],
    features: [
      'Conectores OSINT com captura de URL, data de recolha, identificador e hash de origem',
      'Pipeline de laboratório: Upload -> Validar -> Hash -> Parse -> Normalizar -> Analisar',
      'Extração de entidades, sumarização e sugestão de padrões por IA assistiva',
      'Validação humana mandatória: toda inferência de IA é rotulada e sujeita a confirmação',
      'Zero assunção de dados fictícios: todo dado processado tem origem auditável',
    ],
    kpi: {
      value: 'Human-in-the-Loop',
      label: 'na validação de todas as inferências automatizadas',
    },
  },
];

export default function SolutionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* Top Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wide">
              <span>SOLUÇÕES OPERACIONAIS DE INTELIGÊNCIA</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-headline">
              A Plataforma Unificada para Investigação, Perícia e Evidências
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              A Profundidade organiza as suas operações nos <strong>4 grandes pilares investigativos</strong>, combinando rigor forense, integridade criptográfica e inteligência analítica em Google Cloud Platform.
            </p>
          </div>

          {/* 4 Solutions Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {solutions.map((solution) => {
              const Icon = solution.icon;
              return (
                <Card key={solution.id} id={solution.id} className="border bg-card rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                  <div className="p-6 sm:p-8 space-y-5">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${solution.badgeColor} shrink-0`}>
                          <Icon className={`h-6 w-6 ${solution.color}`} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold font-headline">{solution.title}</h2>
                          <p className="text-xs text-muted-foreground">{solution.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {solution.description}
                    </p>

                    {/* Módulos do Sistema Ativados */}
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Módulos Nucleares Ativos:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {solution.modules.map((mod, mIdx) => (
                          <span
                            key={mIdx}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${mod.color}`}
                          >
                            <span>{mod.code}</span> {mod.name}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border border-primary/30 bg-primary/10 text-primary flex items-center gap-1">
                          <BrainCircuit className="h-3 w-3" /> SI Assist
                        </span>
                      </div>
                    </div>

                    {/* Lista de Recursos */}
                    <div className="pt-2 border-t space-y-2.5">
                      {solution.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rodapé do Card com KPI */}
                  <div className="p-6 pt-0">
                    <div className="p-3.5 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-primary font-mono text-sm">{solution.kpi.value}</div>
                        <div className="text-[11px] text-muted-foreground">{solution.kpi.label}</div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-lg text-xs gap-1.5">
                        <Link href="/#demo">
                          Demonstração <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Seção Explicativa da Camada Transversal */}
          <Card className="border bg-slate-950 text-slate-100 p-8 rounded-3xl relative overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
            <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4">
                <Badge className="bg-primary/20 text-primary-foreground border-primary/30 text-xs px-3 py-1 font-semibold uppercase tracking-wider">
                  Garantia de Integridade e Conformidade
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-headline text-white">
                  O Ciclo Completo da Prova: Da Coleta ao Tribunal
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A plataforma assegura que cada ficheiro recebido seja imediatamente validado, receba o seu hash SHA-256, tenha metadados guardados em Cloud SQL, seja armazenado de forma imutável no Google Cloud Storage e tenha cada visualização ou transferência registada na trilha de auditoria.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Button asChild className="rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <Link href="/#demo">
                      <Calendar className="h-4 w-4" /> Solicitar Apresentação Técnica
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                    <Link href="/investigacao">
                      Aceder ao Workspace de Investigação
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold text-primary uppercase">Pipeline Forense GCP</div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex justify-between">
                    <span>1. Ingestão & Hash:</span>
                    <span className="text-white font-bold">SHA-256 Instantâneo</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex justify-between">
                    <span>2. Storage Seguro:</span>
                    <span className="text-white font-bold">GCS Criptografado</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex justify-between">
                    <span>3. Custódia:</span>
                    <span className="text-white font-bold">Histórico Imutável</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex justify-between">
                    <span>4. Análise & Grafos:</span>
                    <span className="text-white font-bold">Vínculos & OSINT</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex justify-between">
                    <span>5. Inteligência SI:</span>
                    <span className="text-emerald-400 font-bold">Human-in-the-Loop</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
