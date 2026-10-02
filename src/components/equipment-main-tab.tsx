'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectEquipmentTab from './project-equipment-tab';
import { CompanyEquipmentTab } from './company-equipment-tab';
import type { UserRole } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const EquipmentPerformanceTab = dynamic(() => import('./equipment-performance-tab'), { loading: LoadingComponent });


interface EquipmentMainTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function EquipmentMainTab({ projectId, userRole }: EquipmentMainTabProps) {
    return (
        <Tabs defaultValue="project-equipment" className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <TabsList>
                    <TabsTrigger value="project-equipment">Equipamentos (Projeto)</TabsTrigger>
                    <TabsTrigger value="company-equipment">Equipamentos (Empresa)</TabsTrigger>
                    <TabsTrigger value="performance">Análise de Desempenho</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <TabsContent value="project-equipment">
                <div className="pt-4">
                    <ProjectEquipmentTab projectId={projectId} userRole={userRole} />
                </div>
            </TabsContent>
            <TabsContent value="company-equipment">
                <div className="pt-4">
                    <CompanyEquipmentTab userRole={userRole} projectId={projectId} />
                </div>
            </TabsContent>
             <TabsContent value="performance">
                <div className="pt-4">
                    <EquipmentPerformanceTab projectId={projectId} />
                </div>
            </TabsContent>
        </Tabs>
    );
}
