
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, updateDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type ClientInvoice, type ClientInvoiceStatus } from '@/types/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface InvoicingTabProps {
    projectId: string;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export default function InvoicingTab({ projectId }: InvoicingTabProps) {
    const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'clientInvoices'), orderBy('issueDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInvoices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                issueDate: (doc.data().issueDate as Timestamp).toDate(),
                dueDate: (doc.data().dueDate as Timestamp).toDate(),
            } as ClientInvoice));
            setInvoices(fetchedInvoices);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching invoices: ", error);
            toast({ title: 'Erro ao carregar faturas', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const handleMarkAsPaid = async (invoice: ClientInvoice) => {
        if (invoice.status === 'Paga') return;

        try {
            const invoiceRef = doc(db, 'projects', projectId, 'clientInvoices', invoice.id);
            const transactionQuery = query(collection(db, 'projects', projectId, 'transactions'), where('invoiceId', '==', invoice.id));
            const transactionSnapshot = await getDocs(transactionQuery);

            const batch = writeBatch(db);
            batch.update(invoiceRef, { status: 'Paga' });

            if (!transactionSnapshot.empty) {
                const transactionDocRef = transactionSnapshot.docs[0].ref;
                batch.update(transactionDocRef, { status: 'Pago' });
            }

            await batch.commit();
            toast({ title: 'Fatura marcada como paga!' });

        } catch (error) {
            console.error("Error marking invoice as paid: ", error);
            toast({ title: 'Erro ao marcar como paga', variant: 'destructive' });
        }
    };


    const getStatusVariant = (status: ClientInvoiceStatus) => {
        switch (status) {
            case 'Paga': return 'default';
            case 'Pendente': return 'secondary';
            case 'Atrasada': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/> Faturas Emitidas ao Cliente</CardTitle>
                <CardDescription>Acompanhe o estado de todas as faturas geradas para este projeto.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /> Carregando faturas...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Fatura</TableHead>
                                <TableHead>Data Emissão</TableHead>
                                <TableHead>Data Vencimento</TableHead>
                                <TableHead>Valor Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Nenhuma fatura emitida.</TableCell>
                                </TableRow>
                            ) : (
                                invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{format(invoice.issueDate, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{format(invoice.dueDate, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="font-semibold">{formatCurrency(invoice.totalAmount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {invoice.status === 'Pendente' && (
                                                 <Button size="sm" onClick={() => handleMarkAsPaid(invoice)}>
                                                    <CheckCircle className="mr-2 h-4 w-4"/> Marcar como Paga
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
