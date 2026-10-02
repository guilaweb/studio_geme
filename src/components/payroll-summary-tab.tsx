

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc, serverTimestamp, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type TimesheetEntry, type ProductionEntry, type WorkforceMember } from '@/types/workforce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { addDays, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import Papa from 'papaparse';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


interface PayrollSummaryTabProps {
    projectId: string; // 'global' for all projects
    userRole: UserRole | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function PayrollSummaryTab({ projectId, userRole }: PayrollSummaryTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
    const [production, setProduction] = useState<ProductionEntry[]>([]);
    const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        let completedCount = 0;
        const isGlobal = projectId === 'global';
        const totalSubs = 3;

        const checkDone = () => {
            completedCount++;
            if (completedCount === totalSubs) {
                setLoading(false);
            }
        };

        const createSubscription = (subcollection: string, setter: React.Dispatch<any>, dateField: string) => {
            let collRef: any = isGlobal 
                ? collectionGroup(db, subcollection) 
                : collection(db, 'projects', projectId, subcollection);
            
            const q = query(
                collRef, 
                where('date', '>=', dateRange.from),
                where('date', '<=', addDays(dateRange.to, 1))
            );
            
            return onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => {
                     const data = doc.data() as Record<string, any>;
                     const pid = isGlobal ? doc.ref.parent.parent?.id : projectId;
                     const dateVal = data[dateField] as Timestamp | undefined;
                     return {
                        ...data,
                        id: doc.id,
                        date: dateVal?.toDate ? dateVal.toDate() : (dateVal ? new Date(dateVal as any) : new Date()),
                        projectId: pid,
                    };
                });
                setter(items);
                checkDone();
            }, (error) => {
                console.error(`Error fetching ${subcollection}:`, error);
                toast({ title: `Erro ao carregar dados de ${subcollection}`, variant: 'destructive' });
                checkDone();
            });
        };
        
        const q = query(collection(db, 'workforce'));
        const unsubWorkforce = onSnapshot(q, (snapshot) => {
             setWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkforceMember)));
             checkDone();
        });

        const unsubTimesheets = createSubscription('timesheets', setTimesheets, 'date');
        const unsubProduction = createSubscription('productionEntries', setProduction, 'date');

        return () => {
            unsubTimesheets();
            unsubProduction();
            unsubWorkforce();
        };
    }, [projectId, user, dateRange, toast]);

    const payrollData = useMemo(() => {
        const summary: Record<string, {
            workforceId: string;
            name: string;
            role: string;
            totalHours: number;
            totalHourlyPay: number;
            totalProduction: { [unit: string]: number };
            totalProductionPay: number;
        }> = {};

        workforce.forEach(member => {
            summary[member.id] = {
                workforceId: member.id,
                name: member.name,
                role: member.role,
                totalHours: 0,
                totalHourlyPay: 0,
                totalProduction: {},
                totalProductionPay: 0,
            };
        });

        timesheets.forEach(entry => {
            if (summary[entry.workforceId]) {
                summary[entry.workforceId].totalHours += entry.hours;
                summary[entry.workforceId].totalHourlyPay += entry.cost || 0;
            }
        });

        production.forEach(entry => {
            const member = workforce.find(w => w.id === entry.workforceId);
            if (member && summary[entry.workforceId]) {
                const unit = entry.unit || 'un';
                if (!summary[entry.workforceId].totalProduction[unit]) {
                    summary[entry.workforceId].totalProduction[unit] = 0;
                }
                summary[entry.workforceId].totalProduction[unit] += entry.quantity;
                summary[entry.workforceId].totalProductionPay += (member.costPerUnit || 0) * entry.quantity;
            }
        });
        
        return Object.values(summary).map(s => ({
            ...s,
            totalPay: s.totalHourlyPay + s.totalProductionPay
        })).filter(s => s.totalPay > 0).sort((a,b) => a.name.localeCompare(b.name));
    }, [timesheets, production, workforce]);
    
    const handleExport = () => {
        if(payrollData.length === 0) {
            toast({description: "Nenhum dado para exportar.", variant: 'destructive'});
            return;
        }
        const dataToExport = payrollData.map(p => ({
            'Funcionário': p.name,
            'Total Horas': p.totalHours.toFixed(2),
            'Pagamento (Horas)': p.totalHourlyPay.toFixed(2),
            'Produção': Object.entries(p.totalProduction).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join(', ') || 'N/A',
            'Pagamento (Produção)': p.totalProductionPay.toFixed(2),
            'Total a Pagar (Kz)': p.totalPay.toFixed(2),
        }));
        
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `folha_pagamentos_${projectId === 'global' ? 'global' : projectId}_${format(dateRange.from, 'yyyy-MM-dd')}_a_${format(dateRange.to, 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFinalizePayroll = async () => {
        if (projectId === 'global') {
            toast({ title: "Ação não disponível", description: "O processamento de salários deve ser finalizado dentro de cada projeto individualmente.", variant: "destructive" });
            return;
        }
        if (!user || payrollData.length === 0) return;

        setIsFinalizing(true);
        toast({ title: 'A finalizar processamento...', description: 'A gerar recibos de vencimento e transações financeiras.' });
        
        const batch = writeBatch(db);
        
        try {
            let totalPayrollCost = 0;

            for (const data of payrollData) {
                const payslipRef = doc(collection(db, 'workforce', data.workforceId, 'payslips'));
                const payslipData = {
                    periodStart: dateRange.from,
                    periodEnd: dateRange.to,
                    totalHours: data.totalHours,
                    totalHourlyPay: data.totalHourlyPay,
                    productionDetails: Object.entries(data.totalProduction).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join(', ') || 'N/A',
                    totalProductionPay: data.totalProductionPay,
                    totalPay: data.totalPay,
                    generatedAt: serverTimestamp(),
                    projectId: projectId,
                };
                batch.set(payslipRef, payslipData);
                totalPayrollCost += data.totalPay;
            }

            // Create a single financial transaction for this payroll run
            if (totalPayrollCost > 0) {
                const transactionRef = doc(collection(db, 'projects', projectId, 'transactions'));
                batch.set(transactionRef, {
                    description: `Processamento Salarial - ${format(dateRange.from, 'MMMM yyyy', { locale: ptBR })}`,
                    amount: totalPayrollCost,
                    date: serverTimestamp(),
                    type: 'Despesa',
                    status: 'Pendente',
                    accountId: 'salaries',
                    accountName: 'Salários e Encargos',
                    author: { uid: user.uid, displayName: user.displayName || user.email },
                });
            }

            await batch.commit();
            toast({ title: 'Processamento Finalizado!', description: `${payrollData.length} recibos gerados e uma transação financeira foi criada.` });

        } catch (error) {
            console.error("Error finalizing payroll:", error);
            toast({ title: 'Erro ao finalizar processamento', variant: 'destructive' });
        } finally {
            setIsFinalizing(false);
        }
    };

    const isGlobal = projectId === 'global';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Filtros e Ações</CardTitle>
                    <CardDescription>Selecione o período para gerar a folha de pagamentos e exporte ou finalize o processo.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <Label>Data de Início</Label>
                            <DatePicker date={dateRange.from} setDate={(d) => setDateRange(prev => ({...prev, from: d || prev.from}))}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Data de Fim</Label>
                            <DatePicker date={dateRange.to} setDate={(d) => setDateRange(prev => ({...prev, to: d || prev.to}))}/>
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button onClick={handleExport} disabled={payrollData.length === 0} variant="outline" className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4"/>
                            Exportar CSV
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={payrollData.length === 0 || isFinalizing || isGlobal} className="w-full sm:w-auto">
                                    {isFinalizing ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                    Finalizar e Gerar Recibos
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Finalizar Processamento de Salários?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação irá criar {payrollData.length} recibos de vencimento para o período de {format(dateRange.from, 'dd/MM/yy')} a {format(dateRange.to, 'dd/MM/yy')}.
                                        Um lançamento financeiro no valor de {formatCurrency(payrollData.reduce((sum, p) => sum + p.totalPay, 0))} será criado. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleFinalizePayroll}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Resumo de Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                     {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>Total Horas</TableHead>
                                        <TableHead>Produção</TableHead>
                                        <TableHead className="text-right">Total a Pagar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">Nenhum dado de trabalho registado no período selecionado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        payrollData.map((row, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{row.name}</TableCell>
                                                <TableCell>{row.totalHours.toFixed(2)}h</TableCell>
                                                <TableCell className="text-xs">
                                                    {Object.entries(row.totalProduction).map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`).join(', ') || '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(row.totalPay)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
