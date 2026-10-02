'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type LicensePermit, type LicenseType, type LegalDocStatus } from '@/types/legal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { format, differenceInDays } from 'date-fns';

interface LicensesTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function LicensesTab({ projectId, userRole }: LicensesTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Gestor' || userRole === 'Editor';

    const [licenses, setLicenses] = useState<LicensePermit[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState<LicenseType>('Alvará de Construção');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [issuingBody, setIssuingBody] = useState('');
    const [issueDate, setIssueDate] = useState<Date | undefined>();
    const [expiryDate, setExpiryDate] = useState<Date | undefined>();
    const [licenseFile, setLicenseFile] = useState<File | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'licenses'), orderBy('expiryDate', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                issueDate: (doc.data().issueDate as Timestamp)?.toDate(),
                expiryDate: (doc.data().expiryDate as Timestamp).toDate(),
            } as LicensePermit));
            setLicenses(fetchedData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching licenses: ", error);
            toast({ title: 'Erro ao carregar licenças', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setName('');
        setType('Alvará de Construção');
        setReferenceNumber('');
        setIssuingBody('');
        setIssueDate(undefined);
        setExpiryDate(undefined);
        setLicenseFile(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!name || !type || !referenceNumber || !expiryDate || !licenseFile) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Nome, tipo, referência, data de validade e o ficheiro são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('type', type);
            formData.append('referenceNumber', referenceNumber);
            if (issuingBody) formData.append('issuingBody', issuingBody);
            if (issueDate) formData.append('issueDate', issueDate.toISOString());
            formData.append('expiryDate', expiryDate.toISOString());
            formData.append('file', licenseFile);

            const response = await fetch(`/api/projects/${projectId}/licenses`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData,
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao registar a licença.');
            toast({ title: 'Licença/Alvará registado com sucesso!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao registar licença', description: error.message, variant: 'destructive' });
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
                        <CardTitle>Licenças & Alvarás</CardTitle>
                        <CardDescription>Registe e controle a validade de todos os documentos legais do projeto.</CardDescription>
                    </div>
                    {canEdit && (
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2"/>Adicionar Licença</Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Validade</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {licenses.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma licença registada.</TableCell></TableRow>
                                ) : (
                                    licenses.map(item => {
                                        const { status, variant } = getStatus(item.expiryDate);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.type}</TableCell>
                                                <TableCell>{format(item.expiryDate, 'dd/MM/yyyy')}</TableCell>
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
                <DialogHeader><DialogTitle>Adicionar Nova Licença ou Alvará</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="space-y-2"><Label htmlFor="name">Nome do Documento</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Alvará de Construção Nº123/2024" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Tipo</Label><Select value={type} onValueChange={(v) => setType(v as LicenseType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alvará de Construção">Alvará de Construção</SelectItem><SelectItem value="Licença de Utilização">Licença de Utilização</SelectItem><SelectItem value="Licença Ambiental">Licença Ambiental</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="ref">Nº de Referência</Label><Input id="ref" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} /></div>
                    </div>
                     <div className="space-y-2"><Label htmlFor="body">Entidade Emissora (Opcional)</Label><Input id="body" value={issuingBody} onChange={e => setIssuingBody(e.target.value)} placeholder="Ex: Administração Municipal de Luanda" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Data de Emissão (Opcional)</Label><DatePicker date={issueDate} setDate={setIssueDate} /></div>
                        <div className="space-y-2"><Label>Data de Validade</Label><DatePicker date={expiryDate} setDate={setExpiryDate} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="file">Anexar Documento (PDF)</Label><Input id="file" type="file" accept=".pdf" onChange={e => setLicenseFile(e.target.files?.[0] || null)} /></div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={resetForm}>Cancelar</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2"/>}Adicionar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
