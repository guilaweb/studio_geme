
'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Bot, FileSpreadsheet, Bell, CalendarClock, HelpCircle, Wrench } from 'lucide-react';
import Link from 'next/link';
import { AutomationRecipeCard } from '@/components/automation-recipe-card';
import { useToast } from '@/hooks/use-toast';
import { runAutomationFlow } from '@/ai/flows/automation-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types/project';


export default function AutomationsPage() {
    const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin']);
    const router = useRouter();
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (!adminUser) return;
        const projectsQuery = query(collection(db, 'projects'), where('ownerId', '==', adminUser.uid));
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
            const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(fetchedProjects);
        });
        return () => unsubscribe();
    }, [adminUser]);

    const handleExecuteAutomation = async (config: any, projectId?: string) => {
        toast({ title: 'A executar automação...', description: 'Por favor, aguarde um momento.' });

        if (config.action === 'add_to_sheet' && !projectId) {
            toast({ title: 'Projeto não selecionado', description: 'Por favor, selecione um projeto para exportar os dados.', variant: 'destructive' });
            return;
        }

        try {
             const result = await runAutomationFlow({ config, projectId: projectId || 'default-project-id' });
             if (result.success) {
                 toast({ title: 'Sucesso!', description: result.message });
             } else {
                 throw new Error(result.message);
             }
        } catch(error: any) {
            toast({ title: 'Falha na Automação', description: error.message, variant: 'destructive'});
        }
    }
    
    const automationRecipes = [
        {
            title: 'Exportar Dados para Google Sheets',
            description: 'Envie automaticamente dados do projeto (custos, EAP, etc.) para uma planilha Google para análise externa.',
            icon: FileSpreadsheet,
            triggerOptions: ['Exportar Custos', 'Exportar EAP'],
            actionOptions: ['add_to_sheet'],
            requiresProject: true,
        },
        {
            title: 'Notificações de Tarefas Atrasadas',
            description: 'Verifica diariamente as tarefas do cronograma e envia uma notificação se estiverem atrasadas.',
            icon: Bell,
            triggerOptions: ['Diariamente às 9h'],
            actionOptions: ['send_overdue_tasks_notification'],
        },
        {
            title: 'Relatório Semanal de Progresso',
            description: 'Gera e envia um resumo do progresso do projeto para os stakeholders todas as sextas-feiras.',
            icon: CalendarClock,
            triggerOptions: ['Semanalmente (Sexta-feira)'],
            actionOptions: ['send_report_email'],
        },
        {
            title: 'Alerta de Manutenção de Equipamentos',
            description: 'Verifica diariamente os horímetros dos equipamentos e envia um alerta quando a manutenção preventiva estiver próxima ou atrasada.',
            icon: Wrench,
            triggerOptions: ['Diariamente às 8h'],
            actionOptions: ['send_maintenance_alert'],
        },
    ];


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
    

    return (
        <div className="flex min-h-screen w-full flex-col bg-secondary/50">
            <Header />
            <main className="flex-1 p-4 md:p-8">
                 <TooltipProvider>
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div>
                            <Button variant="outline" asChild className="mb-4">
                                <Link href="/admin">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                                </Link>
                            </Button>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <h1 className="text-3xl font-bold font-headline">Automações & Workflows</h1>
                                        <p className="text-muted-foreground">Selecione e configure "receitas" de automação para otimizar as suas tarefas.</p>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mb-4"><HelpCircle className="h-4 w-4 text-muted-foreground"/></Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="max-w-xs">Use as receitas para executar tarefas automáticas, como exportar dados ou enviar notificações com base em eventos do projeto.</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <Button asChild>
                                    <Link href="/admin/automations/editor">
                                        <Bot className="mr-2 h-4 w-4" /> Editor Avançado
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {automationRecipes.map((recipe, index) => (
                                <AutomationRecipeCard
                                    key={index}
                                    {...recipe}
                                    projects={projects}
                                    onExecute={handleExecuteAutomation}
                                />
                            ))}
                        </div>
                    </div>
                </TooltipProvider>
            </main>
        </div>
    );
}
