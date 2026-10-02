'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { type QualityControlRecord, type QualityTestStatus } from '@/types/hseq';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePicker } from './ui/date-picker';
import { Loader2, Plus, TestTube2, FileUp, Download } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '@/app/projects/[id]/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface HseqQualityTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function HseqQualityTab({ projectId, userRole }: HseqQualityTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [records, setRecords] = useState<QualityControlRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testType, setTestType] = useState('');
    const [sampleId, setSampleId] = useState('');
    const [testDate, setTestDate] = useState<Date | undefined>(new Date());
    const [reportFile, setReportFile] = useState<File | null>(null);
    
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'quality-control'), orderBy('testDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRecords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                testDate: (doc.data().testDate as Timestamp).toDate(),
            } as unknown as QualityControlRecord));
            setRecords(fetchedRecords);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quality records: ", error);
            toast({ title: 'Erro ao carregar ensaios', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setTestType('');
        setSampleId('');
        setTestDate(new Date());
        setReportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsDialogOpen(false);
    };

    const handleRegisterTest = async () => {
        if (!canEdit || !user) return;
        if (!testType.trim()) {
            toast({ title: 'Campo obrigatório', description: 'Por favor, indique o tipo de ensaio realizado.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            let downloadURL: string | null = null;
            let reportName: string | null = null;

            // Upload Report to Storage if provided
            if (reportFile) {
                const fileId = uuidv4();
                const storagePath = `projects/${projectId}/quality-reports/${fileId}-${reportFile.name}`;
                const storageRef = ref(storage, storagePath);
                const uploadTask = await uploadBytesResumable(storageRef, reportFile);
                downloadURL = await getDownloadURL(uploadTask.ref);
                reportName = reportFile.name;
            }

            const effectiveSampleId = sampleId.trim() || `AMO-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}`;

            const newRecordData = {
                testType,
                sampleId: effectiveSampleId,
                testDate: testDate || new Date(),
                status: 'Pendente',
                reportUrl: downloadURL,
                reportName: reportName,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                },
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'projects', projectId, 'quality-control'), newRecordData);
            
            toast({ title: 'Ensaio registado com sucesso!' });
            resetForm();

        } catch (error) {
            console.error("Error registering test: ", error);
            toast({ title: 'Erro ao registar ensaio', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = async (recordId: string, status: QualityTestStatus) => {
        if (!canEdit || !idToken) return;

        try {
            const response = await fetch(`/api/projects/${projectId}/quality-control/${recordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                throw new Error((await response.json()).error || 'Falha ao atualizar o estado.');
            }
            toast({ title: 'Estado do ensaio atualizado.' });
        } catch (error: any) {
            console.error("Error updating quality record status:", error);
            toast({ title: 'Erro ao atualizar estado', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReportFile(e.target.files[0]);
        }
    };

    const getStatusVariant = (status: QualityTestStatus) => {
        switch (status) {
            case 'Aprovado': return 'default';
            case 'Pendente': return 'secondary';
            case 'Reprovado': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                         <CardTitle>Controlo de Qualidade</CardTitle>
                         <CardDescription>Registo de ensaios de materiais e gestão de não-conformidades de qualidade.</CardDescription>
                    </div>
                     {canEdit && (
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2"/> Registar Novo Ensaio
                            </Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Ensaio</TableHead>
                                        <TableHead>Amostra</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Relatório</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                    <TestTube2 className="h-8 w-8 text-primary/60" />
                                                    <p className="font-medium text-foreground">Nenhum ensaio de qualidade registado.</p>
                                                    <p className="text-xs">Registe ensaios de betão, solos, soldaduras ou armaduras para assegurar conformidade.</p>
                                                    {canEdit && (
                                                        <Button onClick={() => setIsDialogOpen(true)} size="sm" className="mt-2">
                                                            <Plus className="mr-2 h-4 w-4" /> Registar Primeiro Ensaio
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.testType}</TableCell>
                                                <TableCell>{item.sampleId}</TableCell>
                                                <TableCell>{item.testDate ? format((item.testDate as any).toDate ? (item.testDate as any).toDate() : new Date(item.testDate as any), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                <TableCell>
                                                    {canEdit ? (
                                                        <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v as QualityTestStatus)}>
                                                            <SelectTrigger className="w-[150px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Pendente">Pendente</SelectItem>
                                                                <SelectItem value="Aprovado">Aprovado</SelectItem>
                                                                <SelectItem value="Reprovado">Reprovado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.reportUrl ? (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <a href={item.reportUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-4 w-4 mr-2" />
                                                                Ver Relatório
                                                            </a>
                                                        </Button>
                                                    ) : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Registar Novo Ensaio de Qualidade</DialogTitle>
                    <DialogDescription>Preencha os detalhes do ensaio realizado.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                     <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="test-type">Tipo de Ensaio *</Label>
                            <span className="text-[11px] text-muted-foreground">Ensaios padrão</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-1">
                            {[
                                'Compressão Betão (28d)',
                                'Compressão Betão (7d)',
                                'Abaixamento Slump',
                                'Tração de Armaduras',
                                'Compactação de Solos',
                            ].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTestType(t)}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                        testType === t
                                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                                    }`}
                                >
                                    + {t}
                                </button>
                            ))}
                        </div>
                        <Input id="test-type" placeholder="Ex: Ensaio de Compressão de Betão" value={testType} onChange={e => setTestType(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sample-id">ID da Amostra / Lote</Label>
                            <Input id="sample-id" placeholder="Auto-gerado se vazio" value={sampleId} onChange={e => setSampleId(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Data do Ensaio</Label>
                            <DatePicker date={testDate} setDate={setTestDate} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="report-file">Boletim / Relatório Laboratorial (Opcional - PDF)</Label>
                        <Input id="report-file" type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileSelect} />
                        {reportFile && <p className="text-xs text-muted-foreground">Ficheiro selecionado: {reportFile.name}</p>}
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleRegisterTest} disabled={isSubmitting || !testType.trim()}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <TestTube2 className="mr-2" />}
                        Registar Ensaio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
