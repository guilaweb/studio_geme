'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { type Lot, type LotMovement, type LotStatus } from '@/types/mining';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Gem, MapPin, Award, ShieldCheck, Printer, FileText, CheckCircle2, Lock, ArrowRight, ExternalLink, Globe2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface TraceabilityTabProps {
    projectId: string;
    userRole: UserRole | null;
}

const formatCurrencyUSD = (value?: number) => {
    if (typeof value !== 'number') return '---';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const formatCurrencyAOA = (value?: number) => {
    if (typeof value !== 'number') return '---';
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(value);
};

export default function TraceabilityTab({ projectId, userRole }: TraceabilityTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
    const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
    const [selectedCertificateLot, setSelectedCertificateLot] = useState<Lot | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingLotId, setDeletingLotId] = useState<string | null>(null);

    // Form state for new lot
    const [lotNumber, setLotNumber] = useState('');
    const [material, setMaterial] = useState('Diamantes em Bruto (Rough Diamonds)');
    const [initialQuantity, setInitialQuantity] = useState('');
    const [unit, setUnit] = useState<'t' | 'kg' | 'ct'>('ct');
    const [origin, setOrigin] = useState('');
    const [kimberleyProcessId, setKimberleyProcessId] = useState('');
    const [sealNumber, setSealNumber] = useState('');
    const [gemClassification, setGemClassification] = useState('Run of Mine (ROM)');
    const [estimatedValueUSD, setEstimatedValueUSD] = useState('');
    const [exportDestinationCountry, setExportDestinationCountry] = useState('Bélgica (Antuérpia)');

    // State for movement dialog
    const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
    const [newLocation, setNewLocation] = useState('');
    const [movementNotes, setMovementNotes] = useState('');

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'lots'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lot));
            setLots(fetchedLots);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching lots:", error);
            toast({ title: 'Erro ao carregar lotes', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const kpiSummary = useMemo(() => {
        const totalLots = lots.length;
        const kpCertified = lots.filter(l => Boolean(l.kimberleyProcessId)).length;
        const totalCarats = lots.filter(l => l.unit === 'ct').reduce((sum, l) => sum + (l.currentQuantity || 0), 0);
        const exportReady = lots.filter(l => l.status === 'Pronto para Venda' || l.status === 'Exportado' || l.status === 'Vendido').length;

        return { totalLots, kpCertified, totalCarats, exportReady };
    }, [lots]);

    const resetLotForm = () => {
        setLotNumber('');
        setMaterial('Diamantes em Bruto (Rough Diamonds)');
        setInitialQuantity('');
        setUnit('ct');
        setOrigin('');
        setKimberleyProcessId('');
        setSealNumber('');
        setGemClassification('Run of Mine (ROM)');
        setEstimatedValueUSD('');
        setExportDestinationCountry('Bélgica (Antuérpia)');
        setIsDialogOpen(false);
    };

    const handleAutoGenerateKP = () => {
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear();
        setKimberleyProcessId(`AO-KP-${year}-${randomDigits}`);
        setSealNumber(`SEAL-AO-${Math.floor(10000 + Math.random() * 90000)}`);
    };

    const handleCreateLot = async () => {
        if (!canEdit || !user) return;
        if (!lotNumber.trim() || !material.trim() || !initialQuantity.trim() || !origin.trim()) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Preencha o número do lote, material, quantidade e origem.', variant: 'destructive' });
            return;
        }

        const qty = parseFloat(initialQuantity);
        if (isNaN(qty) || qty <= 0) {
            toast({ title: 'Quantidade inválida', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const usdVal = parseFloat(estimatedValueUSD);
            // Taxa referencial média de câmbio USD/AOA ~ 930
            const aoaVal = !isNaN(usdVal) ? usdVal * 930 : undefined;

            await addDoc(collection(db, 'projects', projectId, 'lots'), {
                lotNumber: lotNumber.trim(),
                material: material.trim(),
                initialQuantity: qty,
                currentQuantity: qty,
                unit,
                origin: origin.trim(),
                status: 'Em Processamento',
                history: [
                    {
                        date: Timestamp.now(),
                        location: `Origem: ${origin.trim()} (Entrada em Parque / Central de Escolha)`,
                        notes: 'Lote gerado e classificado preliminarmente na mina.',
                        author: { uid: user.uid, displayName: user.displayName || 'Engenheiro de Mina' }
                    }
                ],
                kimberleyProcessId: kimberleyProcessId.trim() || null,
                sealNumber: sealNumber.trim() || null,
                gemClassification: gemClassification || null,
                carats: unit === 'ct' ? qty : null,
                estimatedValueUSD: !isNaN(usdVal) ? usdVal : null,
                estimatedValueAOA: aoaVal || null,
                exportDestinationCountry: exportDestinationCountry.trim() || null,
                issuerEntity: 'Conselho Nacional de Diamantes de Angola / SODIAM',
                author: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Lote criado com sucesso!' });
            resetLotForm();
        } catch (error) {
            console.error("Error creating lot:", error);
            toast({ title: 'Erro ao criar lote', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddMovement = async () => {
        if (!canEdit || !user || !selectedLot || !newLocation.trim()) {
            toast({ title: 'A nova localização é obrigatória', variant: 'destructive'});
            return;
        }

        setIsSubmitting(true);
        try {
            const newMovement: LotMovement = {
                date: Timestamp.now(),
                location: newLocation.trim(),
                notes: movementNotes.trim() || undefined,
                author: { uid: user.uid, displayName: user.displayName || 'Responsável de Custódia' },
            };
            
            const lotRef = doc(db, 'projects', projectId, 'lots', selectedLot.id);
            await updateDoc(lotRef, {
                history: arrayUnion(newMovement)
            });

            toast({ title: 'Movimentação registada na cadeia de custódia!' });
            setNewLocation('');
            setMovementNotes('');
            setIsMovementDialogOpen(false);
            setSelectedLot(null);
        } catch (error) {
            console.error("Error updating movement:", error);
            toast({ title: 'Erro ao registar movimentação', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStatusChange = async (lotId: string, status: LotStatus) => {
        if (!canEdit) return;
        try {
            const lotRef = doc(db, 'projects', projectId, 'lots', lotId);
            await updateDoc(lotRef, { status });
            toast({ title: `Estado do lote atualizado para: ${status}` });
        } catch (error) {
            toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
        }
    };

    const handleDeleteLot = async (lotId: string) => {
        if (!canEdit) return;
        if (!confirm('Tem a certeza de que deseja eliminar este lote e o seu histórico de rastreabilidade?')) {
            return;
        }

        setDeletingLotId(lotId);
        try {
            if (idToken) {
                const res = await fetch(`/api/projects/${projectId}/lots/${lotId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Falha ao eliminar lote.');
                }
            } else {
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'projects', projectId, 'lots', lotId));
            }

            toast({ title: 'Lote eliminado com sucesso!' });
        } catch (error: any) {
            console.error("Error deleting lot:", error);
            toast({ title: 'Erro ao eliminar lote', description: error.message, variant: 'destructive' });
        } finally {
            setDeletingLotId(null);
        }
    };
    
    const getStatusVariant = (status: LotStatus) => {
        switch (status) {
            case 'Vendido': case 'Exportado': return 'default';
            case 'Pronto para Venda': return 'secondary';
            default: return 'outline';
        }
    };

    const handlePrintCertificate = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Lotes em Custódia</CardTitle>
                        <Gem className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiSummary.totalLots}</div>
                        <p className="text-xs text-muted-foreground mt-1">Lotes ativos no projeto</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Certificados Kimberley</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {kpiSummary.kpCertified} <span className="text-xs font-normal text-muted-foreground">/ {kpiSummary.totalLots}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Conformidade KPCS assegurada</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Volume em Quilates (ct)</CardTitle>
                        <Award className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {kpiSummary.totalCarats.toLocaleString('pt-AO')} <span className="text-sm font-normal text-muted-foreground">ct</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Diamantes e gemas rastreadas</p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Prontos / Exportados</CardTitle>
                        <Globe2 className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiSummary.exportReady}</div>
                        <p className="text-xs text-muted-foreground mt-1">Destinados ao comércio internacional</p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <Gem className="h-5 w-5 text-primary"/> Rastreabilidade de Lotes & Processo de Kimberley
                            </CardTitle>
                            <CardDescription>
                                Gestão e rastreabilidade rigorosa da cadeia de custódia de diamantes e minerais críticos, em conformidade com o sistema internacional KPCS.
                            </CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button className="shadow-sm">
                                    <Plus className="mr-2 h-4 w-4"/>Criar Novo Lote
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-12 text-muted-foreground gap-2">
                                <Loader2 className="animate-spin h-5 w-5 text-primary" /> Carregando lotes...
                            </div>
                        ) : lots.length === 0 ? (
                            <div className="text-center py-12 px-4 rounded-lg border border-dashed text-muted-foreground">
                                <p className="font-medium">Nenhum lote registado.</p>
                                <p className="text-xs mt-1">Crie um novo lote para iniciar a cadeia de custódia auditável da mina.</p>
                            </div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {lots.map(lot => (
                                    <AccordionItem value={lot.id} key={lot.id} className="border rounded-md px-3 bg-card hover:bg-muted/10 transition-colors">
                                        <AccordionTrigger className="py-3 hover:no-underline">
                                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 w-full text-left pr-4 items-center">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground">{lot.lotNumber}</span>
                                                    <span className="text-[11px] text-muted-foreground truncate">{lot.material}</span>
                                                </div>

                                                <div>
                                                    <span className="font-mono font-bold text-sm">
                                                        {lot.currentQuantity.toLocaleString('pt-AO')} {lot.unit}
                                                    </span>
                                                    {lot.gemClassification && (
                                                        <span className="text-[11px] text-muted-foreground block truncate">{lot.gemClassification}</span>
                                                    )}
                                                </div>

                                                <div>
                                                    {lot.kimberleyProcessId ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-mono">
                                                            <ShieldCheck className="h-3 w-3 mr-1" /> {lot.kimberleyProcessId}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground italic">Sem Certificado KP</span>
                                                    )}
                                                </div>

                                                <div className="hidden md:block">
                                                    <span className="text-xs text-muted-foreground block truncate">Origem: {lot.origin}</span>
                                                    {lot.sealNumber && (
                                                        <span className="text-[11px] text-muted-foreground font-mono">Selo: {lot.sealNumber}</span>
                                                    )}
                                                </div>

                                                <div className="hidden md:block text-xs font-mono">
                                                    {lot.estimatedValueUSD ? formatCurrencyUSD(lot.estimatedValueUSD) : '---'}
                                                </div>

                                                <div className="flex justify-end">
                                                    <Badge variant={getStatusVariant(lot.status)} className="w-fit text-xs">
                                                        {lot.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-2 border-t mt-2 space-y-4 bg-muted/20 rounded-b-md">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <span className="text-muted-foreground block">Origem na Mina:</span>
                                                    <span className="font-semibold">{lot.origin}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Quantidade Inicial:</span>
                                                    <span className="font-semibold">{lot.initialQuantity} {lot.unit}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Selo de Segurança:</span>
                                                    <span className="font-mono font-semibold">{lot.sealNumber || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block">Destino de Exportação:</span>
                                                    <span className="font-semibold">{lot.exportDestinationCountry || 'Angola (Mercado Local)'}</span>
                                                </div>
                                            </div>

                                            {/* Kimberley Process Certificate Actions */}
                                            {lot.kimberleyProcessId && (
                                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-foreground">Certificado Oficial do Processo de Kimberley emitido</p>
                                                            <p className="text-muted-foreground text-[11px]">Número: <span className="font-mono font-bold text-foreground">{lot.kimberleyProcessId}</span> | Selo: <span className="font-mono">{lot.sealNumber || 'Sem selo'}</span></p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedCertificateLot(lot);
                                                            setIsCertificateDialogOpen(true);
                                                        }}
                                                        className="h-8 text-xs bg-background shrink-0"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" /> Ver Certificado Digital
                                                    </Button>
                                                </div>
                                            )}

                                            {/* History of custody */}
                                            <div>
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                                                    Cadeia de Custódia Auditável ({lot.history?.length || 0} Registos)
                                                </h4>
                                                {!lot.history || lot.history.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground py-2">Nenhum movimento registado.</p>
                                                ) : (
                                                    <div className="border-l-2 border-primary/40 ml-2 pl-4 space-y-4">
                                                        {lot.history.map((mov, index) => {
                                                            const movDate = (mov.date as any)?.toDate ? (mov.date as any).toDate() : new Date();
                                                            return (
                                                                <div key={index} className="relative">
                                                                    <div className="absolute -left-[23px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                                                                    <div>
                                                                        <p className="font-semibold text-xs text-foreground">{mov.location}</p>
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            {format(movDate, 'dd/MM/yyyy HH:mm')} por {mov.author?.displayName || 'Sistema'}
                                                                        </p>
                                                                        {mov.notes && <p className="mt-1 text-xs text-muted-foreground/90 bg-muted/30 p-1.5 rounded">{mov.notes}</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3 border-t">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Estado do Lote:</span>
                                                    <Select value={lot.status} onValueChange={(v) => handleStatusChange(lot.id, v as LotStatus)}>
                                                        <SelectTrigger className="w-[180px] h-8 text-xs bg-background"><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                                                            <SelectItem value="Classificado">Classificado</SelectItem>
                                                            <SelectItem value="Pronto para Venda">Pronto para Venda</SelectItem>
                                                            <SelectItem value="Vendido">Vendido</SelectItem>
                                                            <SelectItem value="Exportado">Exportado</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 text-xs"
                                                        onClick={() => { setSelectedLot(lot); setIsMovementDialogOpen(true); }}
                                                    >
                                                        <MapPin className="mr-1.5 h-3.5 w-3.5 text-primary"/>Adicionar Movimentação
                                                    </Button>
                                                    {canEdit && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deletingLotId === lot.id}
                                                            onClick={() => handleDeleteLot(lot.id)}
                                                        >
                                                            {deletingLotId === lot.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                            )}
                                                            Eliminar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog: Criar Novo Lote */}
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gem className="h-5 w-5 text-primary" /> Registar Novo Lote & Cadeia de Custódia
                        </DialogTitle>
                        <DialogDescription>
                            Crie o lote de minerais da lavra e vincule as credenciais de conformidade do Processo de Kimberley.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-4 max-h-[72vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="lot-number" className="text-xs font-semibold">Número / Código do Lote *</Label>
                                <Input 
                                    id="lot-number" 
                                    value={lotNumber} 
                                    onChange={e => setLotNumber(e.target.value)} 
                                    placeholder="Ex: LOTE-CAT-2026-004"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="material" className="text-xs font-semibold">Designação do Mineral *</Label>
                                <Input 
                                    id="material" 
                                    value={material} 
                                    onChange={e => setMaterial(e.target.value)} 
                                    placeholder="Ex: Diamantes em Bruto (Rough Diamonds)"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="quantity" className="text-xs font-semibold">Quantidade Inicial *</Label>
                                <Input 
                                    id="quantity" 
                                    type="number" 
                                    step="0.01" 
                                    value={initialQuantity} 
                                    onChange={e => setInitialQuantity(e.target.value)} 
                                    placeholder="Ex: 850.5"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Unidade de Medida</Label>
                                <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ct">Quilates (ct) - Gemas</SelectItem>
                                        <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                                        <SelectItem value="t">Toneladas (t)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Classificação de Gema</Label>
                                <Select value={gemClassification} onValueChange={setGemClassification}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Gemas Especiais (+10.8 ct)">Gemas Especiais (+10.8 ct)</SelectItem>
                                        <SelectItem value="Run of Mine (ROM)">Run of Mine (ROM)</SelectItem>
                                        <SelectItem value="Near Gem">Near Gem</SelectItem>
                                        <SelectItem value="Industrial / Boer">Industrial / Boer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="origin" className="text-xs font-semibold">Frente de Lavra / Ponto de Origem *</Label>
                            <Input 
                                id="origin" 
                                value={origin} 
                                onChange={e => setOrigin(e.target.value)} 
                                placeholder="Ex: Cava Principal 1, Bancada +480m, Central de Escolha"
                            />
                        </div>

                        {/* Kimberley Process Section */}
                        <div className="p-3.5 bg-muted/40 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-bold text-foreground">Certificação do Processo de Kimberley (KPCS)</span>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleAutoGenerateKP}
                                    className="h-7 text-[11px] text-primary"
                                >
                                    Gerar Código Oficial
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="kimberley-id" className="text-[11px] font-semibold">Nº do Certificado Kimberley</Label>
                                    <Input 
                                        id="kimberley-id" 
                                        value={kimberleyProcessId} 
                                        onChange={e => setKimberleyProcessId(e.target.value)} 
                                        placeholder="Ex: AO-KP-2026-0812"
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="seal-number" className="text-[11px] font-semibold">Nº do Selo Inviolável do Contentor</Label>
                                    <Input 
                                        id="seal-number" 
                                        value={sealNumber} 
                                        onChange={e => setSealNumber(e.target.value)} 
                                        placeholder="Ex: SEAL-ANRM-9941"
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="value-usd" className="text-[11px] font-semibold">Valor Estimado (USD $)</Label>
                                    <Input 
                                        id="value-usd" 
                                        type="number"
                                        value={estimatedValueUSD} 
                                        onChange={e => setEstimatedValueUSD(e.target.value)} 
                                        placeholder="Ex: 1250000"
                                        className="text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="destination-country" className="text-[11px] font-semibold">País de Destino (Exportação)</Label>
                                    <Input 
                                        id="destination-country" 
                                        value={exportDestinationCountry} 
                                        onChange={e => setExportDestinationCountry(e.target.value)} 
                                        placeholder="Ex: Bélgica (Antuérpia), EAU (Dubai)"
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={resetLotForm} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleCreateLot} disabled={isSubmitting} className="shadow-sm">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Criar Lote com Rastreabilidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Dialog: Adicionar Movimento */}
            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" /> Adicionar Movimento ao Lote {selectedLot?.lotNumber}
                        </DialogTitle>
                        <DialogDescription>
                            Registe uma nova transferência, mudança de custódia física ou inspeção de segurança.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="location" className="text-xs font-semibold">Nova Localização / Etapa *</Label>
                            <Input 
                                id="location" 
                                value={newLocation} 
                                onChange={e => setNewLocation(e.target.value)} 
                                placeholder="Ex: Central de Triagem, Cofre Forte A-1, Despacho Alfandegário" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="mov-notes" className="text-xs font-semibold">Notas de Custódia e Verificação de Selo</Label>
                            <Textarea 
                                id="mov-notes" 
                                value={movementNotes} 
                                onChange={e => setMovementNotes(e.target.value)} 
                                placeholder="Registe o estado de integridade do selo, pesagem de conferência e operador recebedor..."
                                rows={3}
                                className="text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMovementDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddMovement} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Plus className="mr-2 h-4 w-4"/>}
                            Registar Movimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Certificado Oficial do Processo de Kimberley */}
            <Dialog open={isCertificateDialogOpen} onOpenChange={setIsCertificateDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader className="border-b pb-3">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-base font-bold flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-500" /> Certificado Oficial do Processo de Kimberley
                            </DialogTitle>
                            <Button size="sm" variant="outline" onClick={handlePrintCertificate} className="h-8 text-xs">
                                <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" /> Imprimir Certificado
                            </Button>
                        </div>
                    </DialogHeader>

                    {selectedCertificateLot && (
                        <div className="p-6 bg-amber-50/20 dark:bg-card border-2 border-amber-500/30 rounded-lg space-y-6 text-foreground print:border-none print:p-0">
                            {/* Certificate Header */}
                            <div className="text-center space-y-1.5 border-b pb-4">
                                <div className="inline-flex items-center justify-center p-2 rounded-full bg-amber-500/10 mb-1">
                                    <ShieldCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                                    REPÚBLICA DE ANGOLA
                                </h2>
                                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                                    MINISTÉRIO DOS RECURSOS MINERAIS, PETRÓLEO E GÁS (MIREMPET)
                                </h3>
                                <h1 className="text-base sm:text-lg font-bold text-primary uppercase tracking-wide">
                                    SISTEMA DE CERTIFICAÇÃO DO PROCESSO DE KIMBERLEY (KPCS)
                                </h1>
                                <p className="text-xs font-mono font-bold text-foreground">
                                    CERTIFICADO Nº: {selectedCertificateLot.kimberleyProcessId}
                                </p>
                            </div>

                            {/* Certificate Body */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">Identificação do Lote:</span>
                                    <span className="font-bold text-sm font-mono">{selectedCertificateLot.lotNumber}</span>
                                </div>
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">Selo de Segurança Inviolável:</span>
                                    <span className="font-bold text-sm font-mono">{selectedCertificateLot.sealNumber || 'NÃO ATRIBUÍDO'}</span>
                                </div>
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">Massa Líquida Declarada:</span>
                                    <span className="font-bold text-sm font-mono">
                                        {selectedCertificateLot.currentQuantity.toLocaleString('pt-AO')} {selectedCertificateLot.unit}
                                    </span>
                                </div>
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">Classificação / Especificação:</span>
                                    <span className="font-bold text-sm">{selectedCertificateLot.gemClassification || selectedCertificateLot.material}</span>
                                </div>
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">País de Origem / Proveniência:</span>
                                    <span className="font-bold text-sm">Angola ({selectedCertificateLot.origin})</span>
                                </div>
                                <div className="space-y-1 p-2.5 rounded bg-muted/40 border">
                                    <span className="text-muted-foreground block text-[11px]">País de Destino Autorizado:</span>
                                    <span className="font-bold text-sm">{selectedCertificateLot.exportDestinationCountry || 'Internacional'}</span>
                                </div>
                            </div>

                            {/* Value Assessment */}
                            <div className="p-3 rounded bg-muted/30 border flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Valor de Avaliação Aduaneira (USD):</span>
                                    <span className="font-bold text-sm font-mono">{formatCurrencyUSD(selectedCertificateLot.estimatedValueUSD || 0)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-muted-foreground block text-[11px]">Contravalor em Moeda Nacional (AOA):</span>
                                    <span className="font-bold text-sm font-mono">{formatCurrencyAOA(selectedCertificateLot.estimatedValueAOA || 0)}</span>
                                </div>
                            </div>

                            {/* Legal Non-Conflict Diamonds Declaration */}
                            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4" /> Declaração Oficial de Não-Financiamento de Conflitos
                                </div>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                    Certifica-se formalmente que os diamantes em bruto constantes desta remessa foram extraídos e manipulados 
                                    em estrita observância das resoluções do Processo de Kimberley e das leis mineiras da República de Angola, 
                                    não tendo qualquer proveniência ou relação com conflitos armados ou entidades ilícitas.
                                </p>
                            </div>

                            {/* Signatures and Seals */}
                            <div className="grid grid-cols-2 gap-8 pt-4 border-t text-center text-xs">
                                <div>
                                    <div className="h-10 border-b border-muted-foreground/40 flex items-end justify-center pb-1">
                                        <span className="font-semibold text-[11px]">Autoridade Emissora (SODIAM / ANRM)</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground block mt-1">Carimbo e Assinatura Digital</span>
                                </div>
                                <div>
                                    <div className="h-10 border-b border-muted-foreground/40 flex items-end justify-center pb-1">
                                        <span className="font-semibold text-[11px]">Responsável Técnico da Concessão</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground block mt-1">Validação de Custódia de Mina</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="outline" onClick={() => setIsCertificateDialogOpen(false)}>Fechar</Button>
                        <Button onClick={handlePrintCertificate} className="shadow-sm">
                            <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
