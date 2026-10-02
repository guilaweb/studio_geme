'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type InsurancePolicy, type InsuranceType, type LegalDocStatus } from '@/types/legal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { format, differenceInDays } from 'date-fns';

interface InsurancesTabProps {
    projectId: string;
    userRole: UserRole | null;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};


export default function InsurancesTab({ projectId, userRole }: InsurancesTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Gestor' || userRole === 'Editor';

    const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [type, setType] = useState<InsuranceType>('Responsabilidade Civil');
    const [policyNumber, setPolicyNumber] = useState('');
    const [insurer, setInsurer] = useState('');
    const [coverageAmount, setCoverageAmount] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [policyFile, setPolicyFile] = useState<File | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'insurancePolicies'), orderBy('endDate', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(),
                startDate: (doc.data().startDate as Timestamp)?.toDate(),
                endDate: (doc.data().endDate as Timestamp).toDate(),
            } as InsurancePolicy));
            setPolicies(fetchedData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching policies:", error);
            toast({ title: 'Erro ao carregar apólices', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setType('Responsabilidade Civil');
        setPolicyNumber('');
        setInsurer('');
        setCoverageAmount('');
        setStartDate(undefined);
        setEndDate(undefined);
        setPolicyFile(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!type || !policyNumber || !insurer || !coverageAmount || !endDate || !policyFile) {
            toast({ title: 'Campos obrigatórios em falta', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', type);
            formData.append('policyNumber', policyNumber);
            formData.append('insurer', insurer);
            formData.append('coverageAmount', coverageAmount);
            if (startDate) formData.append('startDate', startDate.toISOString());
            formData.append('endDate', endDate.toISOString());
            formData.append('file', policyFile);

            const response = await fetch(`/api/projects/${projectId}/insurances`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData,
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao registar a apólice.');
            toast({ title: 'Apólice de Seguro registada com sucesso!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao registar apólice', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getStatus = (expiry: Date): { status: LegalDocStatus; variant: 'default' | 'secondary' | 'destructive' } => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
        
        if (expiry < today) {
            return { status: 'Expirado', variant: 'destructive' };
        }
        const daysLeft = differenceInDays(expiry, today);
        if (daysLeft <= 30) {
            return { status: 'Perto de Expirar', variant: 'secondary' };
        }
        return { status: 'Válido', variant: 'default' };
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex-row items-start justify-between">
                    <div>
                        <CardTitle>Apólices de Seguro</CardTitle>
                        <CardDescription>Faça a gestão dos seguros associados ao projeto.</CardDescription>
                    </div>
                    {canEdit && (
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2"/>Adicionar Apólice</Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Nº Apólice</TableHead><TableHead>Seguradora</TableHead><TableHead>Validade</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {policies.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma apólice registada.</TableCell></TableRow>
                                ) : (
                                    policies.map(item => {
                                        const { status, variant } = getStatus(item.endDate);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.type}</TableCell>
                                                <TableCell>{item.policyNumber}</TableCell>
                                                <TableCell>{item.insurer}</TableCell>
                                                <TableCell>{format(item.endDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell><Badge variant={variant}>{status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    {item.fileUrl && (
                                                        <Button asChild variant="outline" size="sm">
                                                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>Ver</a>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Adicionar Nova Apólice de Seguro</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                     <div className="space-y-2"><Label>Tipo de Seguro</Label><Select value={type} onValueChange={(v) => setType(v as InsuranceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Responsabilidade Civil">Responsabilidade Civil</SelectItem><SelectItem value="Acidentes de Trabalho">Acidentes de Trabalho</SelectItem><SelectItem value="Equipamentos">Equipamentos</SelectItem><SelectItem value="Automóvel">Automóvel</SelectItem><SelectItem value="Construção (All Risks)">Construção (All Risks)</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="insurer">Seguradora</Label><Input id="insurer" value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="Ex: Seguradora XPTO" /></div>
                        <div className="space-y-2"><Label htmlFor="policy-number">Nº da Apólice</Label><Input id="policy-number" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} /></div>
                     </div>
                     <div className="space-y-2"><Label htmlFor="coverage">Valor da Cobertura (Kz)</Label><Input id="coverage" type="number" value={coverageAmount} onChange={e => setCoverageAmount(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Data de Início (Opcional)</Label><DatePicker date={startDate} setDate={setStartDate} /></div>
                        <div className="space-y-2"><Label>Data de Fim</Label><DatePicker date={endDate} setDate={setEndDate} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="file">Anexar Apólice (PDF)</Label><Input id="file" type="file" accept=".pdf" onChange={e => setPolicyFile(e.target.files?.[0] || null)} /></div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={resetForm}>Cancelar</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2"/>}Adicionar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
