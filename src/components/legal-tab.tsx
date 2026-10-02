'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LicensesTab from './licenses-tab';
import InsurancesTab from './insurances-tab';
import type { UserRole } from '@/app/projects/[id]/page';

interface LegalTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function LegalTab({ projectId, userRole }: LegalTabProps) {
    return (
        <div className="p-4">
            <Tabs defaultValue="licenses">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="licenses">Licenças & Alvarás</TabsTrigger>
                    <TabsTrigger value="insurances">Apólices de Seguro</TabsTrigger>
                </TabsList>
                <TabsContent value="licenses" className="pt-4">
                    <LicensesTab projectId={projectId} userRole={userRole} />
                </TabsContent>
                <TabsContent value="insurances" className="pt-4">
                    <InsurancesTab projectId={projectId} userRole={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
