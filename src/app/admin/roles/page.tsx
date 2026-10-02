'use client';

import { useRequireAuth } from '@/hooks/use-auth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check, ShieldCheck, UserCog, Loader2 } from 'lucide-react';
import Link from 'next/link';

const globalRoles = {
    'super-admin': [
        'Acesso total a todos os módulos e configurações.',
        'Gerir utilizadores, planos e subscrições.',
        'Ver e gerir todos os projetos.',
    ],
    'Gestor de RH': [
        'Aceder ao dashboard de Recursos Humanos.',
        'Gerir o quadro de pessoal global da empresa.',
        'Gerir ausências e processamento de salários.',
    ],
    'Gestor de Financeiro': [
        'Aceder ao dashboard Executivo (apenas KPIs financeiros).',
        'Gerir subscrições.',
    ],
    'Gestor de Frota': [
        'Aceder ao dashboard de Gestão de Frota.',
        'Gerir a manutenção de todos os equipamentos.',
    ],
    'cliente': [
        'Aceder apenas ao Portal do Cliente.',
        'Visualizar o progresso dos seus projetos.',
        'Comunicar com a equipa do projeto através do portal.',
    ],
    'user': [
        'Acesso base à plataforma.',
        'Criar e gerir os seus próprios projetos.',
    ]
};

const projectRoles = {
    'Director de Investigação': [
        'Controlo total sobre o caso e dossiê investigativo.',
        'Pode gerir equipa de investigação, definir sensibilidade e autorizar fecho de casos.',
        'Pode assinar e emitir relatórios periciais selados com hash criptográfico.',
    ],
    'Investigador Principal': [
        'Pode gerir e investigar casos atribuídos, adicionar entidades e vínculos.',
        'Pode requisitar e registar evidências digitais na custódia.',
        'Pode validar ou rejeitar hipóteses inferidas pelo Sistema de Inteligência (SI).',
    ],
    'Perito Forense & Custódia': [
        'Acesso prioritário ao cofre de custódia de evidências e perícia digital.',
        'Pode registar evidências, calcular hashes SHA-256 e atestar integridade.',
        'Pode adicionar novas versões de ficheiros e gerar autos de custódia.',
    ],
    'Analista de Inteligência & OSINT': [
        'Focado na exploração de grafos, timelines de eventos e conectores OSINT.',
        'Pode desenhar mapas de relacionamentos e formular hipóteses investigativas.',
    ],
    'Auditor / Leitor': [
        'Acesso restrito de apenas leitura a casos e trilhas de auditoria.',
        'Não pode alterar evidências, vínculos ou parâmetros da investigação.',
    ],
};


export default function RolesPage() {
    const { user, loading } = useRequireAuth(['super-admin']);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                     <div>
                        <Button variant="outline" asChild className="mb-4">
                            <Link href="/admin">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold font-headline">Funções & Permissões</h1>
                        </div>
                        <p className="text-muted-foreground">Visão geral das funções e dos seus níveis de acesso na plataforma.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Funções Globais da Plataforma</CardTitle>
                            <CardDescription>Estas funções definem o acesso geral à plataforma e aos módulos de administração.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(globalRoles).map(([role, permissions]) => (
                                <Card key={role}>
                                    <CardHeader>
                                        <CardTitle className="text-lg capitalize">{role.replace('-', ' ')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {permissions.map((perm, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                                    <span>{perm}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Funções Dentro de um Projeto</CardTitle>
                            <CardDescription>Estas funções definem o que um utilizador pode fazer dentro de um projeto específico ao qual foi convidado.</CardDescription>
                        </CardHeader>
                         <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(projectRoles).map(([role, permissions]) => (
                                <Card key={role}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{role}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {permissions.map((perm, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                                    <span>{perm}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
