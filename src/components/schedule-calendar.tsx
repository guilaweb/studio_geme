'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { WbsItem } from '@/types/wbs';
import { format, isWithinInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduleCalendarProps {
    projectId: string;
}

export default function ScheduleCalendar({ projectId }: ScheduleCalendarProps) {
    const [tasks, setTasks] = useState<WbsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'wbs'), orderBy('startDate'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
                    endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
                } as WbsItem;
            }).filter(task => task.startDate && task.endDate);
            setTasks(fetchedTasks);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const taskDays = useMemo(() => {
        const days = new Set<string>();
        tasks.forEach(task => {
            if (task.startDate && task.endDate) {
                let currentDate = new Date(task.startDate);
                while (currentDate <= task.endDate) {
                    days.add(format(currentDate, 'yyyy-MM-dd'));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });
        return Array.from(days).map(dayStr => new Date(dayStr));
    }, [tasks]);
    
    const tasksForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        const startOfSelectedDay = startOfDay(selectedDate);
        return tasks.filter(task => {
            if (task.startDate && task.endDate) {
                return isWithinInterval(startOfSelectedDay, { start: startOfDay(task.startDate), end: startOfDay(task.endDate) });
            }
            return false;
        });
    }, [tasks, selectedDate]);
    
    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /> Carregando calendário...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Calendário de Atividades</CardTitle>
                <CardDescription>Visualize as atividades do projeto num calendário mensal.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border p-4 w-full"
                        locale={ptBR}
                        modifiers={{ task: taskDays }}
                        modifiersClassNames={{ task: 'bg-primary/20 rounded-full' }}
                    />
                </div>
                <div className="md:col-span-1">
                    <h3 className="font-semibold mb-4">
                        Atividades para {selectedDate ? format(selectedDate, 'dd MMMM, yyyy', { locale: ptBR }) : ''}
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {tasksForSelectedDay.length > 0 ? tasksForSelectedDay.map(task => (
                            <div key={task.id} className="p-3 bg-secondary rounded-md">
                                <p className="font-medium text-sm">{task.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(task.startDate!, 'dd/MM')} - {format(task.endDate!, 'dd/MM')}
                                </p>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade neste dia.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
