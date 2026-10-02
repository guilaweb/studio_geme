
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { Project } from '@/types/project';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const SuppliersTab = dynamic(() => import('./suppliers-tab'), { loading: LoadingComponent });
const QuotesTab = dynamic(() => import('./quotes-tab'), { loading: LoadingComponent });
const PurchaseOrdersTab = dynamic(() => import('./purchase-orders-tab'), { loading: LoadingComponent });
const SupplierInvoicesTab = dynamic(() => import('./supplier-invoices-tab'), { loading: LoadingComponent });
const InventoryTab = dynamic(() => import('./inventory-tab'), { loading: LoadingComponent });


interface ProcurementTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function ProcurementTab({ projectId, userRole }: ProcurementTabProps) {
    const isFielDeArmazem = userRole === 'Fiel de Armazém';
    const canSeeAll = userRole === 'Gestor' || userRole === 'Editor';
    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        if (!projectId) return;
        const projectRef = doc(db, 'projects', projectId);
        const unsubscribe = onSnapshot(projectRef, (docSnap) => {
            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() } as Project);
            }
        });
        return () => unsubscribe();
    }, [projectId]);

    return (
        <div className="p-4">
            <Tabs defaultValue={isFielDeArmazem ? "inventory" : "suppliers"}>
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList>
                        <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
                        <TabsTrigger value="quotes">Pedidos de Cotação</TabsTrigger>
                        <TabsTrigger value="purchase-orders">Ordens de Compra</TabsTrigger>
                        <TabsTrigger value="invoices">Faturas de Fornecedores</TabsTrigger>
                        <TabsTrigger value="inventory">Inventário</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <TabsContent value="suppliers">
                    <div className="pt-4">
                        <SuppliersTab projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="quotes">
                    <div className="pt-4">
                        <QuotesTab projectId={projectId} userRole={userRole} project={project} />
                    </div>
                </TabsContent>
                <TabsContent value="purchase-orders">
                    <div className="pt-4">
                        <PurchaseOrdersTab projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="invoices">
                    <div className="pt-4">
                        <SupplierInvoicesTab projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="inventory">
                    <div className="pt-4">
                        <InventoryTab projectId={projectId} userRole={userRole} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
