'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from '@/app/projects/[id]/page';
import type { Project } from '@/types/project';
import dynamic from 'next/dynamic';
import { Loader2, Mountain, BarChart3, ShieldCheck, Truck, Scaling, Gem } from 'lucide-react';

const LoadingComponent = () => (
    <div className="flex h-64 w-full items-center justify-center bg-card rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

const MiningDashboardTab = dynamic(() => import('./mining-dashboard-tab'), { loading: LoadingComponent });
const ConcessionsTab = dynamic(() => import('./concessions-tab'), { loading: LoadingComponent });
const ProductionControlTab = dynamic(() => import('./production-control-tab'), { loading: LoadingComponent });
const ProductivityTab = dynamic(() => import('./productivity-tab'), { loading: LoadingComponent });
const FleetManagementTab = dynamic(() => import('./fleet-management-tab'), { loading: LoadingComponent });
const TraceabilityTab = dynamic(() => import('./traceability-tab'), { loading: LoadingComponent });

interface MiningTabProps {
    projectId: string;
    userRole: UserRole | null;
    project: Project | null;
}

export default function MiningTab({ projectId, userRole, project }: MiningTabProps) {
    return (
        <div className="p-4 space-y-6">
            {/* Header executivo do Módulo de Mineração */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Mountain className="h-6 w-6 text-primary" />
                        Módulo de Mineração & Extração
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Otimização de lavra, balanço de massas, teores, títulos de concessão, frota e rastreabilidade Kimberley.
                    </p>
                </div>
            </div>

            {/* Navegação por Abas Especializadas */}
            <Tabs defaultValue="dashboard" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto p-1 gap-1">
                    <TabsTrigger value="dashboard" className="flex items-center gap-1.5 py-2 text-xs">
                        <BarChart3 className="h-4 w-4 shrink-0" />
                        <span>Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="concessions" className="flex items-center gap-1.5 py-2 text-xs">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>Concessões</span>
                    </TabsTrigger>
                    <TabsTrigger value="production" className="flex items-center gap-1.5 py-2 text-xs">
                        <Mountain className="h-4 w-4 shrink-0" />
                        <span>Produção & Turno</span>
                    </TabsTrigger>
                    <TabsTrigger value="fleet" className="flex items-center gap-1.5 py-2 text-xs">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>Gestão de Frota</span>
                    </TabsTrigger>
                    <TabsTrigger value="productivity" className="flex items-center gap-1.5 py-2 text-xs">
                        <Scaling className="h-4 w-4 shrink-0" />
                        <span>Produtividade</span>
                    </TabsTrigger>
                    <TabsTrigger value="traceability" className="flex items-center gap-1.5 py-2 text-xs">
                        <Gem className="h-4 w-4 shrink-0" />
                        <span>Rastreabilidade KP</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="pt-2">
                    <MiningDashboardTab projectId={projectId} project={project} />
                </TabsContent>
                <TabsContent value="concessions" className="pt-2">
                    <ConcessionsTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="production" className="pt-2">
                    <ProductionControlTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="fleet" className="pt-2">
                    <FleetManagementTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="productivity" className="pt-2">
                    <ProductivityTab projectId={projectId} />
                </TabsContent>
                <TabsContent value="traceability" className="pt-2">
                    <TraceabilityTab projectId={projectId} userRole={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
