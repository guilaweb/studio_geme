

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileSignature, Upload, Download, FilePlus, HelpCircle } from 'lucide-react';
import type { Contract, ContractAmendment } from '@/types/finance';
import type { UserRole } from '@/app/projects/[id]/page';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DatePicker } from './ui/date-picker';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ContractManagementTabProps {
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

export default function ContractManagementTab({ projectId, userRole }: ContractManagementTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Gestor' || userRole === 'Editor';

    const [contract, setContract] = useState<Contract | null>(null);
    const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
    const [loading, setLoading] = useState(true);

    const [isUploadContractDialogOpen, setIsUploadContractDialogOpen] = useState(false);
    const [isAddAmendmentDialogOpen, setIsAddAmendmentDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state for contract
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [contractValue, setContractValue] = useState('');

    // Form state for amendment
    const [amendmentDescription, setAmendmentDescription] = useState('');
    const [amendmentValue, setAmendmentValue] = useState('');
    const [amendmentDate, setAmendmentDate] = useState<Date | undefined>(new Date());
    const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
    
    // Fetch contract and amendments
    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const contractRef = doc(db, 'projects', projectId, 'contracts', 'main');
        const unsubContract = onSnapshot(contractRef, (doc) => {
            setContract(doc.exists() ? { id: doc.id, ...doc.data() } as Contract : null);
        });

        const amendmentsQuery = query(collection(db, 'projects', projectId, 'contractAmendments'), orderBy('effectiveDate', 'desc'));
        const unsubAmendments = onSnapshot(amendmentsQuery, (snapshot) => {
            const fetchedAmendments = snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    effectiveDate: (data.effectiveDate as Timestamp)?.toDate(),
                } as unknown as ContractAmendment;
            });
            setAmendments(fetchedAmendments);
            setLoading(false);
        });

        return () => {
            unsubContract();
            unsubAmendments();
        };
    }, [projectId]);
    
    const resetContractForm = () => {
        setContractFile(null);
        setContractValue('');
        setIsUploadContractDialogOpen(false);
    }
    
    const resetAmendmentForm = () => {
        setAmendmentDescription('');
        setAmendmentValue('');
        setAmendmentDate(new Date());
        setAmendmentFile(null);
        setIsAddAmendmentDialogOpen(false);
    }

    const handleUploadContract = async () => {
        if (!canEdit || !contractFile || !contractValue) {
            toast({ title: 'Campos em falta', description: 'O ficheiro do contrato e o seu valor são obrigatórios.', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        try {
            const storagePath = `projects/${projectId}/contracts/${contractFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytesResumable(storageRef, contractFile);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            const contractData: Omit<Contract, 'id'> = {
                projectId,
                fileName: contractFile.name,
                fileUrl: downloadURL,
                contractValue: parseFloat(contractValue),
                createdAt: serverTimestamp() as any,
            };

            await setDoc(doc(db, 'projects', projectId, 'contracts', 'main'), contractData);
            
            toast({ title: 'Contrato principal carregado!'});
            resetContractForm();

        } catch (error) {
            console.error("Error uploading contract:", error);
            toast({ title: 'Erro ao carregar contrato', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddAmendment = async () => {
         if (!canEdit || !amendmentFile || !amendmentDescription || !amendmentValue || !amendmentDate) {
            toast({ title: 'Campos em falta', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        try {
            const storagePath = `projects/${projectId}/contracts/amendments/${uuidv4()}-${amendmentFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytesResumable(storageRef, amendmentFile);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            
            const amendmentData: Omit<ContractAmendment, 'id'> = {
                contractId: 'main',
                description: amendmentDescription,
                valueChange: parseFloat(amendmentValue),
                fileName: amendmentFile.name,
                fileUrl: downloadURL,
                effectiveDate: amendmentDate as any,
                createdAt: serverTimestamp() as any,
            };

            await addDoc(collection(db, 'projects', projectId, 'contractAmendments'), amendmentData);
            toast({ title: 'Aditamento adicionado com sucesso!'});
            resetAmendmentForm();

        } catch (error) {
            console.error("Error adding amendment:", error);
            toast({ title: 'Erro ao adicionar aditamento', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const totalContractValue = (contract?.contractValue || 0) + amendments.reduce((sum, item) => sum + item.valueChange, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary"/> Gestão de Contratos</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Gira o contrato principal com o cliente e todos os seus aditamentos (alterações contratuais).</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
                <CardDescription>Armazene contratos, gira aditamentos e controle o valor total contratualizado.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                    <div className="space-y-6">
                        {/* Main Contract Section */}
                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold mb-2">Contrato Principal</h4>
                            {contract ? (
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{contract.fileName}</p>
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-bold">{formatCurrency(contract.contractValue)}</span>
                                        <Button asChild variant="secondary" size="sm">
                                            <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>Ver Contrato</a>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground p-4">
                                    <p>Nenhum contrato principal carregado.</p>
                                    {canEdit && 
                                        <Dialog open={isUploadContractDialogOpen} onOpenChange={setIsUploadContractDialogOpen}>
                                            <DialogTrigger asChild><Button size="sm" className="mt-2"><Upload className="mr-2 h-4 w-4"/>Carregar Contrato</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Carregar Contrato Principal</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                     <div className="space-y-2">
                                                        <Label htmlFor="contract-value">Valor do Contrato (Kz)</Label>
                                                        <Input id="contract-value" type="number" placeholder="150000000" value={contractValue} onChange={e => setContractValue(e.target.value)} />
                                                    </div>
                                                     <div className="space-y-2">
                                                        <Label htmlFor="contract-file">Ficheiro do Contrato (PDF)</Label>
                                                        <Input id="contract-file" type="file" accept=".pdf" onChange={(e) => setContractFile(e.target.files?.[0] || null)} />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="ghost" onClick={resetContractForm}>Cancelar</Button>
                                                    <Button onClick={handleUploadContract} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2" />}Carregar</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    }
                                </div>
                            )}
                        </div>
                        
                        {/* Amendments Section */}
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">Aditamentos ao Contrato</h4>
                                {canEdit && contract && (
                                    <Dialog open={isAddAmendmentDialogOpen} onOpenChange={setIsAddAmendmentDialogOpen}>
                                        <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/>Adicionar Aditamento</Button></DialogTrigger>
                                        <DialogContent className="sm:max-w-xl">
                                             <DialogHeader>
                                                <DialogTitle>Adicionar Novo Aditamento</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="amendment-desc">Descrição do Aditamento</Label>
                                                    <Textarea id="amendment-desc" placeholder="Ex: Adição de novo piso, alteração de acabamentos..." value={amendmentDescription} onChange={e => setAmendmentDescription(e.target.value)} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="amendment-value">Variação de Valor (Kz)</Label>
                                                        <Input id="amendment-value" type="number" placeholder="500000 (positivo ou negativo)" value={amendmentValue} onChange={e => setAmendmentValue(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Data de Efeito</Label>
                                                        <DatePicker date={amendmentDate} setDate={setAmendmentDate} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="amendment-file">Ficheiro do Aditamento (PDF)</Label>
                                                    <Input id="amendment-file" type="file" accept=".pdf" onChange={(e) => setAmendmentFile(e.target.files?.[0] || null)} />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="ghost" onClick={resetAmendmentForm}>Cancelar</Button>
                                                <Button onClick={handleAddAmendment} disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2" />}Adicionar</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                             </div>
                            <div className="border rounded-md">
                                {amendments.length > 0 ? (
                                    amendments.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                                            <div>
                                                <p className="text-sm">{item.description}</p>
                                                <p className="text-xs text-muted-foreground">{item.effectiveDate ? format((item.effectiveDate as any).toDate ? (item.effectiveDate as any).toDate() : new Date(item.effectiveDate as any), 'dd/MM/yyyy') : 'Data inválida'}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-sm font-semibold ${item.valueChange >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(item.valueChange)}</span>
                                                <Button asChild variant="ghost" size="sm"><a href={item.fileUrl} target="_blank" rel="noopener noreferrer">Ver Doc.</a></Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center p-4">Nenhum aditamento registado.</p>
                                )}
                            </div>
                        </div>

                         {/* Total Value Section */}
                         <div className="flex justify-end pt-4">
                             <div className="p-4 bg-secondary rounded-lg text-right">
                                <p className="text-sm font-semibold text-muted-foreground">VALOR TOTAL CONTRATUALIZADO</p>
                                <p className="text-3xl font-bold">{formatCurrency(totalContractValue)}</p>
                            </div>
                         </div>
                    </div>
                }
            </CardContent>
        </Card>
    );
}
