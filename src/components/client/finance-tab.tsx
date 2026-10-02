
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Landmark, FileText, Wallet, FilePlus, FileMinus } from 'lucide-react';
import type { Contract, ContractAmendment, ClientInvoice, ClientInvoiceStatus } from '@/types/finance';

interface ClientFinanceTabProps {
    contract: Contract | null;
    amendments: ContractAmendment[];
    invoices: ClientInvoice[];
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

const getStatusVariant = (status: ClientInvoiceStatus) => {
    switch (status) {
        case 'Paga': return 'default';
        case 'Pendente': return 'secondary';
        case 'Atrasada': return 'destructive';
        default: return 'outline';
    }
};

export default function ClientFinanceTab({ contract, amendments, invoices }: ClientFinanceTabProps) {
    const summary = useMemo(() => {
        const initialContractValue = contract?.contractValue || 0;
        const amendmentsValue = amendments.reduce((sum, item) => sum + item.valueChange, 0);
        const totalContractValue = initialContractValue + amendmentsValue;
        const totalInvoiced = invoices.reduce((sum, inv) => inv.status !== 'Anulada' ? sum + inv.totalAmount : sum, 0);
        const balanceToInvoice = totalContractValue - totalInvoiced;

        return {
            initialContractValue,
            amendmentsValue,
            totalContractValue,
            totalInvoiced,
            balanceToInvoice,
        };
    }, [contract, amendments, invoices]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contrato Inicial</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.initialContractValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aditamentos</CardTitle>
                        <FilePlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.amendmentsValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total Contratualizado</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.totalContractValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
                        <FileMinus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalInvoiced)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo por Faturar</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.balanceToInvoice)}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Faturas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Fatura</TableHead>
                                <TableHead>Data Emissão</TableHead>
                                <TableHead>Data Vencimento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">Nenhuma fatura emitida para este projeto.</TableCell>
                                </TableRow>
                            ) : (
                                invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{format(invoice.issueDate, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{format(invoice.dueDate, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(invoice.totalAmount)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
