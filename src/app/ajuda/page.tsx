'use client';

import { Header } from '@/components/Header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  LayoutDashboard,
  FolderPlus,
  Users,
  Building2,
  FileCheck,
  BrainCircuit,
  Share2,
  FileText,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function HowToUsePage() {
    
    const steps = [
        {
            title: "1. Autenticação & Seleção de Organização",
            description: "Inicie sessão com credenciais seguras e autenticação multifator (MFA). Selecione a organização operacional autorizada, garantindo isolamento total de dados no modelo multi-tenant.",
            icon: ShieldCheck,
            tooltip: "Acesso seguro e isolamento de tenant."
        },
        {
            title: "2. Dashboard Operacional",
            description: "Aceda à visão consolidada em tempo real com métricas autênticas: casos ativos, evidências em custódia criptográfica, investigações em curso e alertas analíticos pendentes.",
            icon: LayoutDashboard,
            tooltip: "Métricas e panorama operacional."
        },
        {
            title: "3. Criação de Caso & Dossiê",
            description: "Registe o caso com identificador oficial, classificação de sigilo, objetivo da diligência, data de abertura e equipa de investigadores designada.",
            icon: FolderPlus,
            tooltip: "Abertura formal de processo investigativo."
        },
        {
            title: "4. Alocação de Membros & RBAC",
            description: "Adicione investigadores, analistas e peritos ao caso com permissões específicas de leitura, custódia de evidências ou emissão de relatórios, seguindo o princípio do menor privilégio.",
            icon: Users,
            tooltip: "Controlo granular de acessos e papéis."
        },
        {
            title: "5. Cadastro & Mapeamento de Entidades",
            description: "Adicione pessoas de interesse, empresas, veículos, contas bancárias, números fiscais (NIF/AGT) e endereços associados à investigação.",
            icon: Building2,
            tooltip: "Registo de alvos e entidades relevantes."
        },
        {
            title: "6. Ingestão de Evidências & Hashing SHA-256",
            description: "Carregue ficheiros multimédia, logs, documentos e extrações forenses. O sistema valida o formato, calcula o hash SHA-256 imediatamente e guarda o registo na cadeia de custódia.",
            icon: Fingerprint,
            tooltip: "Garantia criptográfica de integridade probatória."
        },
        {
            title: "7. Execução de Análises & Assistência de Inteligência (SI)",
            description: "Processe documentos no laboratório e execute modelos do Sistema de Inteligência para extração de factos e padrões. Todos os resultados são rotulados e sujeitos a validação humana obrigatória.",
            icon: BrainCircuit,
            tooltip: "IA assistiva com validação humana (Human-in-the-Loop)."
        },
        {
            title: "8. Visualização de Grafos & Relacionamentos",
            description: "Explore a rede de vínculos entre suspeitos, intermediários, empresas de fachada e fluxos financeiros em grafos interativos bidirecionais.",
            icon: Share2,
            tooltip: "Análise de vínculos e cruzamento de redes."
        },
        {
            title: "9. Registo de Conclusões & Findings",
            description: "Documente cada achado pericial ligando-o diretamente às evidências com hash validado e cadeia de custódia intacta.",
            icon: FileCheck,
            tooltip: "Achados investigativos fundamentados."
        },
        {
            title: "10. Emissão & Exportação de Relatório Pericial",
            description: "Gere o relatório técnico pericial ou dístico de inteligência em PDF profissional, com folha de rosto, metodologia, cadeia de custódia, grafos e conclusões assinadas.",
            icon: FileText,
            tooltip: "Dossiê final com valor probatório formal."
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-secondary/50">
            <Header />
            <main className="flex-1 container mx-auto py-12 px-4">
                <TooltipProvider>
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold font-headline">Como Usar a Plataforma</h1>
                            <p className="mt-2 text-muted-foreground md:text-xl">Guia operacional passo-a-passo para investigadores, analistas e peritos forenses.</p>
                        </div>

                        {/* Destaque do Workspace de Investigação */}
                        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-lg border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase mb-2">
                                    Ambiente Operacional Ativo
                                </div>
                                <h2 className="text-xl font-bold">Workspace de Investigação & Inteligência</h2>
                                <p className="text-sm text-blue-200/80 mt-1 max-w-xl">
                                    Aceda diretamente aos dossiês de caso, repositório de evidências criptográficas SHA-256, grafos de relacionamentos e assistente analítico SI.
                                </p>
                            </div>
                            <Button asChild className="bg-white hover:bg-blue-50 text-blue-950 font-bold shrink-0">
                                <Link href="/investigacao">
                                    Abrir Workspace <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {steps.map((step, index) => (
                                <Card key={index} className="flex flex-col md:flex-row items-start">
                                    <CardHeader className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-4 p-6 md:border-r">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="bg-primary/10 p-4 rounded-full">
                                                    <step.icon className="h-8 w-8 text-primary" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{step.tooltip}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold font-headline mb-2">{step.title}</h3>
                                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="mt-12 text-center">
                            <Button asChild size="lg" className="rounded-xl px-8">
                                <Link href="/#demo">
                                    Agendar Sessão Técnica de Demonstração
                                </Link>
                            </Button>
                        </div>
                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}
