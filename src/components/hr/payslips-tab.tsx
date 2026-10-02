'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Eye, Printer, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Payslip } from '@/types/workforce';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

interface PayslipsTabProps {
    payslips: Payslip[];
    loading: boolean;
    memberName?: string;
    memberRole?: string;
}

export default function PayslipsTab({ payslips, loading, memberName, memberRole }: PayslipsTabProps) {
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Recibos de Vencimento
                    </CardTitle>
                    <CardDescription>Histórico de todos os recibos de vencimento gerados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Total Horas</TableHead>
                                        <TableHead>Pagamento (Horas)</TableHead>
                                        <TableHead>Pagamento (Produção)</TableHead>
                                        <TableHead className="text-right">Total a Pagar</TableHead>
                                        <TableHead className="w-[80px] text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payslips.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Nenhum recibo de vencimento gerado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        payslips.map(slip => {
                                            const startDate = (slip.periodStart as Timestamp).toDate ? (slip.periodStart as Timestamp).toDate() : new Date(slip.periodStart as any);
                                            const endDate = (slip.periodEnd as Timestamp).toDate ? (slip.periodEnd as Timestamp).toDate() : new Date(slip.periodEnd as any);

                                            return (
                                                <TableRow key={slip.id}>
                                                    <TableCell className="font-medium">
                                                        {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
                                                    </TableCell>
                                                    <TableCell>{slip.totalHours ? slip.totalHours.toFixed(2) : '0.00'}h</TableCell>
                                                    <TableCell>{formatCurrency(slip.totalHourlyPay)}</TableCell>
                                                    <TableCell>{formatCurrency(slip.totalProductionPay)}</TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(slip.totalPay)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            title="Ver Detalhes do Recibo"
                                                            onClick={() => setSelectedPayslip(slip)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Detalhe e Impressão do Recibo */}
            <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between pr-4">
                            <span className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Recibo de Vencimento
                            </span>
                            <Button size="sm" variant="outline" onClick={handlePrint} className="print:hidden">
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            Comprovativo de processamento de remuneração
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPayslip && (() => {
                        const startDate = (selectedPayslip.periodStart as Timestamp).toDate ? (selectedPayslip.periodStart as Timestamp).toDate() : new Date(selectedPayslip.periodStart as any);
                        const endDate = (selectedPayslip.periodEnd as Timestamp).toDate ? (selectedPayslip.periodEnd as Timestamp).toDate() : new Date(selectedPayslip.periodEnd as any);

                        return (
                            <div className="space-y-4 py-2 text-sm">
                                <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                                    <div className="flex justify-between font-semibold">
                                        <span>Funcionário:</span>
                                        <span>{memberName || 'Colaborador'}</span>
                                    </div>
                                    {memberRole && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Função / Cargo:</span>
                                            <span>{memberRole}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Período de Referência:</span>
                                        <span>{format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} a {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                                    </div>
                                    {selectedPayslip.projectId && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Projeto ID:</span>
                                            <span>{selectedPayslip.projectId}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Rubrica / Descrição</TableHead>
                                                <TableHead className="text-right">Quantidade</TableHead>
                                                <TableHead className="text-right">Total (Kz)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>Vencimento / Horas Trabalhadas</TableCell>
                                                <TableCell className="text-right">{selectedPayslip.totalHours.toFixed(2)}h</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(selectedPayslip.totalHourlyPay)}</TableCell>
                                            </TableRow>
                                            {selectedPayslip.totalProductionPay > 0 && (
                                                <TableRow>
                                                    <TableCell>
                                                        Rendimento de Produção
                                                        {selectedPayslip.productionDetails && (
                                                            <div className="text-xs text-muted-foreground">{selectedPayslip.productionDetails}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">-</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(selectedPayslip.totalProductionPay)}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg text-base font-bold">
                                    <span>Líquido a Receber</span>
                                    <span className="text-primary text-xl">{formatCurrency(selectedPayslip.totalPay)}</span>
                                </div>

                                <div className="text-xs text-muted-foreground text-center pt-2">
                                    Documento processado por computador via Profundidade Engenharia &copy; {new Date().getFullYear()}
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </>
    );
}
