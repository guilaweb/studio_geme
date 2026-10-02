'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import type { TelecomSite } from '@/types/telecom';
import type { WbsItem } from '@/types/wbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
    TowerControl, 
    BarChart3, 
    MapPin, 
    Radio, 
    Loader2, 
    Signal, 
    CheckCircle2, 
    Layers,
    Cpu
} from 'lucide-react';
import TelecomDashboardTab from './telecom-dashboard-tab';
import SitesManagementTab from './sites-management-tab';
import SiteMapTab from './site-map-tab';
import SiteEquipmentTab from './site-equipment-tab';

interface SitesTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function SitesTab({ projectId, userRole }: SitesTabProps) {
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [sites, setSites] = useState<TelecomSite[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        let sitesLoaded = false;
        let wbsLoaded = false;

        const checkLoaded = () => {
            if (sitesLoaded && wbsLoaded) {
                setLoading(false);
            }
        };

        // 1. Escutar Sites de Telecomunicações
        const sitesQuery = query(
            collection(db, 'projects', projectId, 'sites'), 
            orderBy('createdAt', 'desc')
        );

        const unsubSites = onSnapshot(sitesQuery, (snapshot) => {
            const list: TelecomSite[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Garantir conversões seguras de timestamps
                    createdAt: data.createdAt,
                    targetOnAirDate: data.targetOnAirDate instanceof Timestamp ? data.targetOnAirDate.toDate() : data.targetOnAirDate,
                    actualOnAirDate: data.actualOnAirDate instanceof Timestamp ? data.actualOnAirDate.toDate() : data.actualOnAirDate,
                } as TelecomSite;
            });
            setSites(list);
            sitesLoaded = true;
            checkLoaded();
        }, (error) => {
            console.error("Erro ao carregar sites de telecom:", error);
            toast({
                title: "Erro ao sincronizar sites",
                description: "Não foi possível carregar a lista de sites e torres.",
                variant: "destructive"
            });
            sitesLoaded = true;
            checkLoaded();
        });

        // 2. Escutar EAP / WBS para vinculação física
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
        const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
            const items: WbsItem[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WbsItem));
            setWbsItems(items);
            wbsLoaded = true;
            checkLoaded();
        }, (error) => {
            console.error("Erro ao carregar tarefas WBS:", error);
            wbsLoaded = true;
            checkLoaded();
        });

        return () => {
            unsubSites();
            unsubWbs();
        };
    }, [projectId, toast]);

    // Métricas rápidas de topo
    const activeSitesCount = sites.filter(s => s.status === 'Ativo').length;
    const rolloutSitesCount = sites.filter(s => ['Site Acquisition', 'Obra Civil', 'Instalação Telecom', 'Comissionamento'].includes(s.status)).length;
    const totalEquipments = sites.reduce((sum, s) => sum + (s.equipments?.length || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header com resumo executivo de Telecomunicações */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <TowerControl className="h-6 w-6 text-primary" />
                        Módulo de Telecomunicações & Redes
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Implantação, georreferenciação e manutenção de torres e sites de telecomunicações.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/60 border text-xs font-medium">
                        <Signal className="h-3.5 w-3.5 text-blue-500" />
                        <span>Total: <strong>{sites.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Ativos (On-Air): <strong>{activeSitesCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                        <Layers className="h-3.5 w-3.5 text-amber-500" />
                        <span>Em Rollout: <strong>{rolloutSitesCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                        <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Equipamentos: <strong>{totalEquipments}</strong></span>
                    </div>
                </div>
            </div>

            {/* Navegação por Abas Especializadas */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Visão Geral & Rollout</span>
                    </TabsTrigger>
                    <TabsTrigger value="sites" className="flex items-center gap-2 py-2">
                        <TowerControl className="h-4 w-4" />
                        <span>Sites & Torres</span>
                    </TabsTrigger>
                    <TabsTrigger value="map" className="flex items-center gap-2 py-2">
                        <MapPin className="h-4 w-4" />
                        <span>Georreferenciação & Mapa</span>
                    </TabsTrigger>
                    <TabsTrigger value="equipments" className="flex items-center gap-2 py-2">
                        <Radio className="h-4 w-4" />
                        <span>Equipamentos RF / TX</span>
                    </TabsTrigger>
                </TabsList>

                {loading ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">A carregar infraestrutura de telecomunicações...</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <TabsContent value="dashboard" className="space-y-4">
                            <TelecomDashboardTab 
                                sites={sites} 
                                onNavigateToTab={(tab) => setActiveTab(tab)} 
                            />
                        </TabsContent>

                        <TabsContent value="sites" className="space-y-4">
                            <SitesManagementTab 
                                projectId={projectId}
                                sites={sites}
                                wbsItems={wbsItems}
                                canEdit={canEdit}
                                loading={loading}
                            />
                        </TabsContent>

                        <TabsContent value="map" className="space-y-4">
                            <SiteMapTab sites={sites} />
                        </TabsContent>

                        <TabsContent value="equipments" className="space-y-4">
                            <SiteEquipmentTab 
                                projectId={projectId}
                                sites={sites}
                                canEdit={canEdit}
                            />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
