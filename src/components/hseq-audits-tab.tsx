
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { type Audit, type AuditType, type AuditStatus, type AuditFinding, type AuditFindingSeverity } from '@/types/hseq';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from './ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Plus, ShieldCheck, Search, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { UserRole } from '@/app/projects/[id]/page';

interface HseqAuditsTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function HseqAuditsTab({ projectId, userRole }: HseqAuditsTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [audits, setAudits] = useState<Audit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

    // Form state for new audit
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [auditDate, setAuditDate] = useState<Date | undefined>(new Date());
    const [auditType, setAuditType] = useState<AuditType>('Segurança');
    const [auditor, setAuditor] = useState('');
    const [scope, setScope] = useState('');

    // Form state for new finding
    const [findingDescription, setFindingDescription] = useState('');
    const [findingSeverity, setFindingSeverity] = useState<AuditFindingSeverity>('Menor');
    const [isAddingFinding, setIsAddingFinding] = useState(false);
    
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'audits'), orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAudits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: (doc.data().date as Timestamp).toDate(),
                findings: (doc.data().findings || []).map((f: any) => ({...f, id: f.id || crypto.randomUUID()})) // Ensure findings have an id
            } as unknown as Audit));
            setAudits(fetchedAudits);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching audits: ", error);
            toast({ title: 'Erro ao carregar auditorias', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setAuditDate(new Date());
        setAuditType('Segurança');
        setAuditor('');
        setScope('');
        setIsAddDialogOpen(false);
    };
    
     const resetFindingForm = () => {
        setFindingDescription('');
        setFindingSeverity('Menor');
    };

    const handleScheduleAudit = async () => {
        if (!canEdit || !user || !idToken) return;
        if (!auditDate || !auditor.trim() || !scope.trim()) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Data, auditor e âmbito são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/audits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ date: auditDate.toISOString(), type: auditType, auditor, scope }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao agendar auditoria.');
            toast({ title: 'Auditoria agendada com sucesso!' });
            resetForm();
        } catch (error: any) {
            toast({ title: 'Erro ao agendar auditoria', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = async (auditId: string, newStatus: AuditStatus) => {
        if (!idToken || !canEdit) return;
        try {
            const response = await fetch(`/api/projects/${projectId}/audits/${auditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Falha ao atualizar o estado da auditoria.');
            }
            toast({ title: "Estado da Auditoria Atualizado", description: `A auditoria foi marcada como "${newStatus}".` });
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        }
    };
    
     const handleAddFinding = async () => {
        if (!idToken || !selectedAuditId || !findingDescription.trim()) {
            toast({ title: 'Descrição obrigatória', variant: 'destructive'});
            return;
        }
        setIsAddingFinding(true);
        try {
            const newFinding: Omit<AuditFinding, 'id'> = {
                description: findingDescription,
                severity: findingSeverity,
                isResolved: false,
                createdAt: new Date().toISOString()
            };

            const response = await fetch(`/api/projects/${projectId}/audits/${selectedAuditId}`, {
                method: 'POST', // Use POST for adding a sub-resource
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(newFinding),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao adicionar achado.');
            
            toast({ title: 'Achado adicionado!' });
            resetFindingForm();
        } catch (error: any) {
             toast({ title: 'Erro ao adicionar achado', description: error.message, variant: 'destructive' });
        } finally {
            setIsAddingFinding(false);
        }
    };

    const handleToggleFindingStatus = async (auditId: string, findingId: string, currentStatus: boolean) => {
        if (!idToken) return;
        try {
            const response = await fetch(`/api/projects/${projectId}/audits/${auditId}`, {
                method: 'PATCH', // Use PATCH for partial updates
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ findingId, isResolved: !currentStatus }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao atualizar o achado.');
            toast({ title: 'Estado do achado atualizado!' });
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar achado', description: error.message, variant: 'destructive' });
        }
    };


    const getStatusVariant = (status: Audit['status']) => {
        switch (status) {
            case 'Concluída': return 'default';
            case 'Agendada': return 'secondary';
            case 'Em Andamento': return 'outline';
            default: return 'outline';
        }
    };

     const getSeverityVariant = (severity: AuditFindingSeverity) => {
        switch (severity) {
            case 'Crítica':
            case 'Major':
                return 'destructive';
            case 'Menor':
                return 'secondary';
            case 'Oportunidade de Melhoria':
            default:
                return 'outline';
        }
    };

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                         <CardTitle>Auditorias de Segurança e Qualidade</CardTitle>
                         <CardDescription>Agende e acompanhe as auditorias internas e externas do projeto.</CardDescription>
                    </div>
                     {canEdit && (
                         <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2"/> Agendar Auditoria
                            </Button>
                        </DialogTrigger>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                    ) : (
                         <Accordion type="single" collapsible className="w-full" onValueChange={setSelectedAuditId}>
                            {audits.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center p-4">Nenhuma auditoria agendada.</p>
                            ) : (
                                audits.map(item => (
                                    <AccordionItem value={item.id} key={item.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <div className="text-left">
                                                     <p className="font-semibold">{item.scope}</p>
                                                     <p className="text-sm text-muted-foreground">{item.auditor} - {item.date ? format((item.date as any).toDate ? (item.date as any).toDate() : new Date(item.date as any), 'dd/MM/yyyy') : 'N/A'}</p>
                                                </div>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 space-y-6">
                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold mb-2">Achados e Ações Corretivas</h4>
                                                <div className="space-y-3 mb-6">
                                                    {(item.findings || []).length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum achado registado.</p>
                                                    ) : (
                                                        (item.findings || []).map((finding) => (
                                                            <div key={finding.id} className={cn("flex items-start gap-3 p-3 border rounded-lg", finding.isResolved && "bg-secondary/50")}>
                                                                <Checkbox 
                                                                    id={`finding-${finding.id}`}
                                                                    checked={finding.isResolved} 
                                                                    onCheckedChange={() => handleToggleFindingStatus(item.id, finding.id, finding.isResolved)} 
                                                                    className="mt-1" 
                                                                    disabled={!canEdit}
                                                                />
                                                                <div className="flex-1">
                                                                    <Label htmlFor={`finding-${finding.id}`} className={cn("text-sm cursor-pointer", finding.isResolved && "line-through text-muted-foreground")}>{finding.description}</Label>
                                                                    <Badge variant={getSeverityVariant(finding.severity)} className="mt-1">{finding.severity}</Badge>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                
                                                {item.status !== 'Concluída' && canEdit && (
                                                <div className="p-4 border-t mt-4 space-y-3">
                                                    <h5 className="font-medium text-sm">Adicionar Novo Achado</h5>
                                                    <Textarea placeholder="Descrição da não-conformidade ou oportunidade de melhoria..." value={findingDescription} onChange={e => setFindingDescription(e.target.value)} />
                                                    <div className="flex items-center justify-between">
                                                        <Select value={findingSeverity} onValueChange={v => setFindingSeverity(v as AuditFindingSeverity)}>
                                                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Oportunidade de Melhoria">Oportunidade de Melhoria</SelectItem>
                                                                <SelectItem value="Menor">Não-Conformidade Menor</SelectItem>
                                                                <SelectItem value="Major">Não-Conformidade Major</SelectItem>
                                                                <SelectItem value="Crítica">Não-Conformidade Crítica</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button onClick={handleAddFinding} disabled={isAddingFinding}>
                                                            {isAddingFinding ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                                                            Adicionar Achado
                                                        </Button>
                                                    </div>
                                                </div>
                                                )}
                                            </div>
                                             <div className="border-t pt-4 flex justify-end items-center gap-2">
                                                <Label>Alterar Status:</Label>
                                                <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value as AuditStatus)}>
                                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Agendada">Agendada</SelectItem>
                                                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                                        <SelectItem value="Concluída">Concluída</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))
                            )}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

             <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Agendar Nova Auditoria</DialogTitle>
                    <DialogDescription>Preencha os detalhes para agendar uma nova auditoria.</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data da Auditoria</Label>
                            <DatePicker date={auditDate} setDate={setAuditDate} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="auditor">Nome do Auditor</Label>
                            <Input id="auditor" placeholder="Ex: João da Silva" value={auditor} onChange={e => setAuditor(e.target.value)} />
                        </div>
                    </div>
                        <div className="space-y-2">
                        <Label>Tipo de Auditoria</Label>
                        <Select value={auditType} onValueChange={(v) => setAuditType(v as AuditType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Segurança">Segurança do Trabalho</SelectItem>
                                <SelectItem value="Qualidade">Qualidade</SelectItem>
                                <SelectItem value="Ambiental">Ambiental</SelectItem>
                                <SelectItem value="Integrada">Integrada (SGI)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                        <div className="space-y-2">
                        <Label htmlFor="scope">Âmbito e Objetivos da Auditoria</Label>
                        <Textarea id="scope" placeholder="Descreva o que será auditado..." value={scope} onChange={e => setScope(e.target.value)} rows={3}/>
                    </div>
                </div>
                    <DialogFooter>
                    <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleScheduleAudit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                        Agendar Auditoria
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
