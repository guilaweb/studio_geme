'use client';

import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Building, Users, Cloud, MessageCircle, Code, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function IntegrationsPage() {
    const { user: adminUser, loading: authLoading } = useAuth();
    const router = useRouter();

    if (authLoading || !adminUser) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <p>Carregando...</p>
                </main>
            </div>
        );
    }
    
    if (adminUser.role !== 'super-admin') {
        router.push('/dashboard');
        return null;
    }
    
    const integrations = [
        {
            title: 'Contabilidade & ERPs',
            description: 'Sincronize faturas, custos e pagamentos com o seu sistema financeiro (Primavera, Sage, SAP).',
            icon: Building,
            href: '/admin/integrations/accounting',
            enabled: true,
            tooltip: 'Ligue o Profundidade ao seu software de contabilidade para automatizar o lançamento de faturas de fornecedores e reconciliar custos.'
        },
        {
            title: 'Recursos Humanos',
            description: 'Envie folhas de ponto e horas trabalhadas diretamente para o seu software de RH para processamento salarial.',
            icon: Users,
            href: '/admin/integrations/hr',
            enabled: true,
            tooltip: 'Exporte dados consolidados de horas e produção, prontos para serem importados no seu sistema de processamento salarial.'
        },
        {
            title: 'Armazenamento em Nuvem',
            description: 'Faça o backup e sincronize os documentos dos seus projetos com Google Drive, Dropbox ou OneDrive.',
            icon: Cloud,
            href: '/admin/integrations/storage',
            enabled: true,
            tooltip: 'Configure backups automáticos dos seus documentos para um serviço de armazenamento externo, garantindo a segurança e acessibilidade dos seus dados.'
        },
        {
            title: 'Comunicação',
            description: 'Receba notificações automáticas de eventos importantes (ex: RDOs) em canais do Slack ou MS Teams.',
            icon: MessageCircle,
            href: '/admin/integrations/communication',
            enabled: true,
            tooltip: 'Integre com as suas ferramentas de comunicação para receber alertas em tempo real sobre o progresso e pendências dos seus projetos.'
        },
        {
            title: 'API & Webhooks',
            description: 'Crie integrações personalizadas e extraia dados para ferramentas de BI externas (Power BI, Tableau).',
            icon: Code,
            href: '/admin/integrations/api',
            enabled: true,
            tooltip: 'Use a nossa API para criar integrações à medida ou para alimentar os seus dashboards de Business Intelligence com dados da plataforma.'
        }
    ];

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                 <TooltipProvider>
                    <div className="max-w-5xl mx-auto space-y-8">
                        <div>
                            <Button variant="outline" asChild className="mb-4">
                                <Link href="/admin">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold font-headline">Integrações & API</h1>
                            <p className="text-muted-foreground">Conecte a Profundidade ao seu ecossistema de software para automatizar processos e quebrar silos de dados.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {integrations.map((integration, index) => (
                                <Card key={index} className="flex flex-col">
                                    <CardHeader className="flex-row items-start gap-4">
                                        <div className="bg-primary/10 p-3 rounded-full">
                                            <integration.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                             <CardTitle className="flex justify-between items-center">
                                                <span>{integration.title}</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2"><HelpCircle className="h-4 w-4 text-muted-foreground"/></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="max-w-xs">{integration.tooltip}</p></TooltipContent>
                                                </Tooltip>
                                            </CardTitle>
                                            <CardDescription>{integration.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter className="mt-auto">
                                        <Button asChild variant={integration.enabled ? 'secondary' : 'outline'} className="w-full" disabled={!integration.enabled}>
                                            <Link href={integration.href}>
                                                <Settings className="mr-2 h-4 w-4" />
                                                Configurar
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}
