'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type Requirement, type RequirementType, type RequirementPriority, type RequirementStatus } from '@/types/requirements';
import { type WbsItem } from '@/types/wbs';
import { type ProjectFile } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Target, Check, Circle, X, CheckCircle, FileCheck2, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RequirementsTabProps {
    projectId: string;
    userRole: UserRole | null;
    onFvsSelect: (file: ProjectFile) => void;
}

export default function RequirementsTab({ projectId, userRole, onFvsSelect }: RequirementsTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
    const [fvsTemplates, setFvsTemplates] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [text, setText] = useState('');
    const [type, setType] = useState<RequirementType>('Funcional');
    const [priority, setPriority] = useState<RequirementPriority>('Importante');
    const [notes, setNotes] = useState('');
    const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('none');
    const [selectedFvsId, setSelectedFvsId] = useState<string>('none');

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);

        const reqQuery = query(collection(db, 'projects', projectId, 'requirements'), orderBy('createdAt', 'desc'));
        const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'), orderBy('name', 'asc'));
        const fvsQuery = query(collection(db, 'projects', projectId, 'documents'), where('type', '==', 'file'));

        const unsubRequirements = onSnapshot(reqQuery, (snapshot) => {
            const fetchedRequirements = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp),
            } as Requirement));
            setRequirements(fetchedRequirements);
        }, (error) => {
            console.error("Error fetching requirements:", error);
            toast({ title: 'Erro ao carregar requisitos', variant: 'destructive' });
        });
        
        const unsubWbs = onSnapshot(wbsQuery, (snapshot) => {
            const fetchedWbsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WbsItem));
            setWbsItems(fetchedWbsItems);
        });

        const unsubFvs = onSnapshot(fvsQuery, (snapshot) => {
            const fetchedFvsTemplates = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile))
                .filter(file => file.name.endsWith('.md'));
            setFvsTemplates(fetchedFvsTemplates);
        });

        Promise.all([
            new Promise(resolve => onSnapshot(reqQuery, () => resolve(true))),
            new Promise(resolve => onSnapshot(wbsQuery, () => resolve(true))),
            new Promise(resolve => onSnapshot(fvsQuery, () => resolve(true))),
        ]).then(() => setLoading(false));

        return () => {
            unsubRequirements();
            unsubWbs();
            unsubFvs();
        };
    }, [projectId, toast]);

    const resetForm = () => {
        setText('');
        setType('Funcional');
        setPriority('Importante');
        setNotes('');
        setSelectedWbsItemId('none');
        setSelectedFvsId('none');
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!text.trim()) {
            toast({ title: 'A descrição do requisito é obrigatória.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const wbsItem = wbsItems.find(item => item.id === selectedWbsItemId);
            const fvsTemplate = fvsTemplates.find(item => item.id === selectedFvsId);

            const response = await fetch(`/api/projects/${projectId}/requirements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ 
                    text, 
                    type, 
                    priority, 
                    notes, 
                    wbsItemId: selectedWbsItemId === 'none' ? null : selectedWbsItemId,
                    wbsItemName: wbsItem ? wbsItem.name : null,
                    fvsId: selectedFvsId === 'none' ? null : selectedFvsId,
                    fvsName: fvsTemplate ? fvsTemplate.name : null,
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao adicionar requisito.');
            toast({ title: 'Requisito adicionado!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao adicionar requisito', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = async (reqId: string, status: RequirementStatus) => {
        if (!canEdit || !idToken) return;
        try {
             const response = await fetch(`/api/projects/${projectId}/requirements/${reqId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ status }),
            });
             if (!response.ok) throw new Error((await response.json()).error || 'Falha ao atualizar requisito.');
             toast({ title: `Estado do requisito atualizado para "${status}".` });
        } catch (error: any) {
             toast({ title: 'Erro ao atualizar estado', description: error.message, variant: 'destructive' });
        }
    };

    const getPriorityVariant = (p: RequirementPriority) => {
        switch (p) {
            case 'Essencial': return 'destructive';
            case 'Importante': return 'secondary';
            case 'Desejável': return 'outline';
        }
    };
    
    const getStatusIcon = (s: RequirementStatus) => {
        switch (s) {
            case 'Proposto': return <Circle className="h-4 w-4 text-gray-400" />;
            case 'Em Análise': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'Aprovado': return <Check className="h-4 w-4 text-green-500" />;
            case 'Em Teste': return <FileCheck2 className="h-4 w-4 text-yellow-500" />;
            case 'Verificado': return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'Rejeitado': return <X className="h-4 w-4 text-red-500" />;
            default: return <Circle className="h-4 w-4" />;
        }
    };

    const handleFvsClick = (fvsId: string) => {
        const file = fvsTemplates.find(f => f.id === fvsId);
        if (file) {
            onFvsSelect(file);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/> Gestão de Requisitos</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Documente, rastreie e valide todos os requisitos técnicos, funcionais e de negócio do projeto, associando-os a itens da EAP e a checklists de verificação.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>Documente e rastreie os requisitos técnicos e funcionais do projeto.</CardDescription>
                    </div>
                    {canEdit && <DialogTrigger asChild><Button><Plus className="mr-2"/> Adicionar Requisito</Button></DialogTrigger>}
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Requisito</TableHead>
                                        <TableHead>Item da EAP</TableHead>
                                        <TableHead>Checklist (FVS)</TableHead>
                                        <TableHead>Prioridade</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requirements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">Nenhum requisito documentado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        requirements.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium max-w-sm truncate">{req.text}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{req.wbsItemName || 'N/A'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {req.fvsId && req.fvsName ? (
                                                        <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleFvsClick(req.fvsId!)}>
                                                            {req.fvsName}
                                                        </Button>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </TableCell>
                                                <TableCell><Badge variant={getPriorityVariant(req.priority)}>{req.priority}</Badge></TableCell>
                                                <TableCell>
                                                    <Select value={req.status} onValueChange={(v) => handleStatusChange(req.id, v as RequirementStatus)} disabled={!canEdit}>
                                                        <SelectTrigger className="w-[180px] h-9">
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(req.status)}
                                                                <SelectValue />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Proposto">Proposto</SelectItem>
                                                            <SelectItem value="Em Análise">Em Análise</SelectItem>
                                                            <SelectItem value="Aprovado">Aprovado</SelectItem>
                                                            <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                                                            {(req.status === 'Aprovado' || req.status === 'Em Teste') && <SelectItem value="Em Teste">Em Teste</SelectItem>}
                                                            {(req.status === 'Aprovado' || req.status === 'Em Teste') && <SelectItem value="Verificado">Verificado</SelectItem>}
                                                        </SelectContent>
                                                    </Select>
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
                    <DialogTitle>Adicionar Novo Requisito</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="space-y-2">
                        <Label htmlFor="req-text">Descrição do Requisito</Label>
                        <Textarea id="req-text" placeholder="Ex: O sistema deve suportar 100 utilizadores em simultâneo." value={text} onChange={e => setText(e.target.value)} rows={3}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="req-type">Tipo</Label>
                             <Select value={type} onValueChange={(v) => setType(v as RequirementType)}>
                                <SelectTrigger id="req-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Funcional">Funcional</SelectItem>
                                    <SelectItem value="Não-Funcional">Não-Funcional</SelectItem>
                                    <SelectItem value="Técnico">Técnico</SelectItem>
                                    <SelectItem value="De Negócio">De Negócio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="req-priority">Prioridade</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as RequirementPriority)}>
                                <SelectTrigger id="req-priority"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Essencial">Essencial</SelectItem>
                                    <SelectItem value="Importante">Importante</SelectItem>
                                    <SelectItem value="Desejável">Desejável</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="req-wbs">Associar à EAP (Opcional)</Label>
                        <Select value={selectedWbsItemId} onValueChange={setSelectedWbsItemId}>
                            <SelectTrigger id="req-wbs">
                                <SelectValue placeholder="Selecione um item da EAP..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma associação</SelectItem>
                                {wbsItems.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="req-fvs">Associar a Checklist (FVS) (Opcional)</Label>
                        <Select value={selectedFvsId} onValueChange={setSelectedFvsId}>
                            <SelectTrigger id="req-fvs">
                                <SelectValue placeholder="Selecione um template de FVS..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma associação</SelectItem>
                                {fvsTemplates.map(item => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="req-notes">Notas (Opcional)</Label>
                        <Textarea id="req-notes" placeholder="Critérios de aceitação, referências, etc." value={notes} onChange={e => setNotes(e.target.value)} rows={2}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2"/>}
                        Adicionar Requisito
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
