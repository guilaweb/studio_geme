'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isBefore, addDays, isWithinInterval } from 'date-fns';
import type { WorkforceMember } from '@/types/workforce';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface TrainingMatrixTabProps {
    workforce: WorkforceMember[];
    loading: boolean;
}

const getTrainingStatus = (expiryDate?: Date): { status: 'Válido' | 'Expirado' | 'Expira em breve' | 'Não definido'; variant: 'default' | 'destructive' | 'secondary' | 'outline' } => {
    if (!expiryDate) return { status: 'Não definido', variant: 'outline' };
    
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(expiryDate, today)) {
        return { status: 'Expirado', variant: 'destructive' };
    }
    if (isWithinInterval(expiryDate, { start: today, end: thirtyDaysFromNow })) {
        return { status: 'Expira em breve', variant: 'secondary' };
    }
    return { status: 'Válido', variant: 'default' };
};


export default function TrainingMatrixTab({ workforce, loading }: TrainingMatrixTabProps) {
    const [searchName, setSearchName] = useState('');
    const [searchTraining, setSearchTraining] = useState('');

    const { trainingColumns, filteredWorkforce } = useMemo(() => {
        const allTrainings = new Set<string>();
        workforce.forEach(member => {
            (member.training || []).forEach(t => allTrainings.add(t.courseName));
        });

        const trainingColumns = Array.from(allTrainings).sort();

        const filtered = workforce.filter(member =>
            member.name.toLowerCase().includes(searchName.toLowerCase()) &&
            (searchTraining === '' || (member.training || []).some(t => t.courseName.toLowerCase().includes(searchTraining.toLowerCase())))
        );

        return { trainingColumns, filteredWorkforce: filtered };
    }, [workforce, searchName, searchTraining]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Matriz de Formação e Competências</CardTitle>
                <CardDescription>Visualize o estado das certificações e formações de toda a equipa.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Filtrar por nome do funcionário..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="max-w-sm"
                    />
                     <Input
                        placeholder="Filtrar por nome da formação..."
                        value={searchTraining}
                        onChange={(e) => setSearchTraining(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <ScrollArea className="w-full whitespace-nowrap border rounded-lg max-h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-secondary w-[250px] z-10">Funcionário</TableHead>
                                {trainingColumns.map(courseName => (
                                    <TableHead key={courseName} className="min-w-[150px] text-center">{courseName}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWorkforce.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={trainingColumns.length + 1} className="h-24 text-center">Nenhum funcionário encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                filteredWorkforce.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="sticky left-0 bg-secondary font-medium w-[250px] z-10">{member.name}</TableCell>
                                        {trainingColumns.map(courseName => {
                                            const training = (member.training || []).find(t => t.courseName === courseName);
                                            if (!training) {
                                                return <TableCell key={courseName} className="text-center">-</TableCell>;
                                            }
                                            const { status, variant } = getTrainingStatus(training.expiryDate?.toDate());
                                            return (
                                                <TableCell key={courseName} className="text-center">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge variant={variant}>{status}</Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {training.expiryDate ? (
                                                                    <p>Expira em: {format(training.expiryDate.toDate(), 'dd/MM/yyyy')}</p>
                                                                ) : (
                                                                    <p>Concluído em: {format(training.completionDate.toDate(), 'dd/MM/yyyy')}</p>
                                                                )}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
