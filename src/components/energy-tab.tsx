'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type EnergyProductionLog, type EnergyMaintenancePlan } from '@/types/energy';
import { type Equipment } from '@/types/equipment';
import { type Transaction } from '@/types/finance';
import { type WbsItem } from '@/types/wbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Activity, Wrench, BarChart3, Loader2 } from 'lucide-react';
import EnergyDashboardTab from '@/components/energy/energy-dashboard-tab';
import EnergyProductionTab from '@/components/energy/energy-production-tab';
import EnergyEfficiencyTab from '@/components/energy/energy-efficiency-tab';
import EnergyMaintenanceTab from '@/components/energy/energy-maintenance-tab';

interface EnergyTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function EnergyTab({ projectId, userRole }: EnergyTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor' || userRole === 'Mestre de Obra';

    const [activeTab, setActiveTab] = useState('dashboard');
    const [logs, setLogs] = useState<EnergyProductionLog[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [maintenancePlans, setMaintenancePlans] = useState<EnergyMaintenancePlan[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        let logsDone = false;
        let eqDone = false;
        let txDone = false;
        let maintDone = false;
        let wbsDone = false;

        const checkDone = () => {
            if (logsDone && eqDone && txDone && maintDone && wbsDone) {
                setLoading(false);
            }
        };

        // 1. Energy Production Logs
        const logsQuery = query(collection(db, 'projects', projectId, 'energy-logs'), orderBy('date', 'desc'));
        const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp)?.toDate ? (doc.data().date as Timestamp).toDate() : new Date(doc.data().date)
            } as EnergyProductionLog)));
            logsDone = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching energy logs:", error);
            logsDone = true;
            checkDone();
        });

        // 2. Project Equipment / Assets
        const equipmentQuery = query(collection(db, 'projects', projectId, 'equipment'));
        const unsubEquipment = onSnapshot(equipmentQuery, (snapshot) => {
            setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
            eqDone = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching equipment:", error);
            eqDone = true;
            checkDone();
        });

        // 3. Transactions (energy costs & maintenance)
        const transactionsQuery = query(
            collection(db, 'projects', projectId, 'transactions'), 
            where('accountId', 'in', ['energy-costs', 'energy-maintenance'])
        );
        const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
            txDone = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching transactions:", error);
            txDone = true;
            checkDone();
        });

        // 4. Energy Maintenance Plans
        const maintQuery = query(collection(db, 'projects', projectId, 'energy-maintenance'), orderBy('createdAt', 'desc'));
        const unsubMaint = onSnapshot(maintQuery, (snapshot) => {
            setMaintenancePlans(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                nextDueDate: (doc.data().nextDueDate as Timestamp)?.toDate ? (doc.data().nextDueDate as Timestamp).toDate() : (doc.data().nextDueDate ? new Date(doc.data().nextDueDate) : undefined),
                lastPerformedDate: (doc.data().lastPerformedDate as Timestamp)?.toDate ? (doc.data().lastPerformedDate as Timestamp).toDate() : (doc.data().lastPerformedDate ? new Date(doc.data().lastPerformedDate) : undefined),
            } as EnergyMaintenancePlan)));
            maintDone = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching maintenance plans:", error);
            maintDone = true;
            checkDone();
        });

        // 5. WBS Items
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
            setWbsItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem)));
            wbsDone = true;
            checkDone();
        }, (error) => {
            console.error("Error fetching WBS items:", error);
            wbsDone = true;
            checkDone();
        });

        return () => {
            unsubLogs();
            unsubEquipment();
            unsubTransactions();
            unsubMaint();
            unsubWbs();
        };
    }, [projectId]);

    return (
        <div className="p-4 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl">
                    <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" /> Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="production" className="flex items-center gap-1.5 text-xs">
                        <Zap className="h-3.5 w-3.5 text-amber-500" /> Produção
                    </TabsTrigger>
                    <TabsTrigger value="efficiency" className="flex items-center gap-1.5 text-xs">
                        <Activity className="h-3.5 w-3.5 text-primary" /> Eficiência
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="flex items-center gap-1.5 text-xs">
                        <Wrench className="h-3.5 w-3.5 text-primary" /> Manutenção
                    </TabsTrigger>
                </TabsList>

                {loading ? (
                    <div className="flex justify-center items-center h-64 gap-2 text-muted-foreground text-sm">
                        <Loader2 className="animate-spin h-6 w-6 text-primary" /> Carregando módulo de energia...
                    </div>
                ) : (
                    <>
                        <TabsContent value="dashboard" className="pt-4 space-y-4">
                            <EnergyDashboardTab 
                                logs={logs}
                                equipment={equipment}
                                transactions={transactions}
                                maintenancePlans={maintenancePlans}
                                onNavigateToTab={setActiveTab}
                            />
                        </TabsContent>

                        <TabsContent value="production" className="pt-4 space-y-4">
                            <EnergyProductionTab 
                                projectId={projectId}
                                logs={logs}
                                equipment={equipment}
                                wbsItems={wbsItems}
                                canEdit={canEdit}
                                loading={loading}
                            />
                        </TabsContent>

                        <TabsContent value="efficiency" className="pt-4 space-y-4">
                            <EnergyEfficiencyTab 
                                logs={logs}
                                equipment={equipment}
                            />
                        </TabsContent>

                        <TabsContent value="maintenance" className="pt-4 space-y-4">
                            <EnergyMaintenanceTab 
                                projectId={projectId}
                                maintenancePlans={maintenancePlans}
                                equipment={equipment}
                                wbsItems={wbsItems}
                                canEdit={canEdit}
                                loading={loading}
                            />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
