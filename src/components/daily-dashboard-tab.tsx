
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Truck, AlertTriangle, CalendarPlus, HelpCircle, Loader2 } from 'lucide-react';
import { type Annotation } from '@/app/projects/[id]/page';
import { type WbsItem } from '@/types/wbs';
import { type ProjectWorkforceMember } from '@/types/workforce';
import { type ProjectEquipment } from '@/types/equipment';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface DailyDashboardTabProps {
    projectId: string;
    onTabChange: (tabId: string) => void;
}

export default function DailyDashboardTab({ projectId, onTabChange }: DailyDashboardTabProps) {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [projectWorkforce, setProjectWorkforce] = useState<ProjectWorkforceMember[]>([]);
    const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const unsubscribes = [
            onSnapshot(query(collection(db, 'projects', projectId, 'annotations')), snapshot => {
                setAnnotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Annotation)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), snapshot => {
                setWbsItems(snapshot.docs.map(doc => ({
                    ...doc.data(), id: doc.id,
                    startDate: doc.data().startDate?.toDate(),
                    endDate: doc.data().endDate?.toDate(),
                } as WbsItem)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'workforce')), snapshot => {
                setProjectWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectWorkforceMember)));
            }),
            onSnapshot(query(collection(db, 'projects', projectId, 'equipment')), snapshot => {
                setProjectEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectEquipment)));
            })
        ];
        
        const timer = setTimeout(() => setLoading(false), 3000);
        unsubscribes.push(() => clearTimeout(timer));
        
        return () => unsubscribes.forEach(unsub => unsub());
    }, [projectId]);


    const dailyData = useMemo(() => {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        const tasksToday = wbsItems.filter(task => {
            if (task.startDate && task.endDate) {
                return isWithinInterval(today, { start: startOfDay(new Date(task.startDate)), end: endOfDay(new Date(task.endDate)) });
            }
            return false;
        });

        const urgentPendencias = annotations.filter(a => a.status === 'Aberta' && a.priority === 'Alta');

        return { tasksToday, urgentPendencias };
    }, [wbsItems, annotations]);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                     <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">Painel Diário</h2>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">O Painel Diário fornece um resumo das atividades e recursos para o dia de hoje, ideal para a gestão diária no estaleiro.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="text-muted-foreground">Resumo das atividades e recursos para o dia de hoje.</p>
                </div>
                <Button onClick={() => onTabChange('daily-reports')}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Criar Diário de Obra
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1: Tarefas */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/> Tarefas de Hoje</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyData.tasksToday.length > 0 ? (
                            <ul className="space-y-2">
                                {dailyData.tasksToday.map(task => (
                                    <li key={task.id} className="text-sm p-2 bg-secondary rounded-md">{task.name}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa agendada para hoje.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Coluna 2: Recursos */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/> Equipa no Estaleiro</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {projectWorkforce.length > 0 ? (
                                <ul className="space-y-2">
                                    {projectWorkforce.map(member => (
                                        <li key={member.id} className="text-sm p-2 bg-secondary rounded-md">{member.name} ({member.role})</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mão de obra alocada.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary"/> Equipamentos na Obra</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {projectEquipment.length > 0 ? (
                                <ul className="space-y-2">
                                    {projectEquipment.map(eq => (
                                        <li key={eq.id} className="text-sm p-2 bg-secondary rounded-md">{eq.name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum equipamento alocado.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna 3: Pendências */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/> Pendências Urgentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {dailyData.urgentPendencias.length > 0 ? (
                            <ul className="space-y-2">
                                {dailyData.urgentPendencias.map(item => (
                                    <li key={item.id} className="text-sm p-2 bg-destructive/10 border-l-4 border-destructive rounded-r-md">{item.text}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pendência de alta prioridade.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
