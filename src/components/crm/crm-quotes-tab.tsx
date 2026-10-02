'use client';

import React, { useState, useMemo } from 'react';
import { CustomerQuote, CustomerQuoteStatus, Opportunity, QuoteItem } from '@/types/crm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    FileText,
    Search,
    Download,
    CheckCircle2,
    Clock,
    XCircle,
    Send,
    Eye,
    TrendingUp,
    DollarSign,
    Layers,
    Percent,
    Plus,
    Trash2,
    Loader2,
    Calendar,
    Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { compileCommercialProposalPDF } from '@/lib/pdf/proposal-pdf-engine';

export interface EnhancedQuote extends CustomerQuote {
    opportunityName?: string;
    clientName?: string;
    opportunityId?: string;
}

interface CrmQuotesTabProps {
    quotes?: EnhancedQuote[];
    opportunities?: Opportunity[];
    onSelectOpportunity?: (opportunityId: string) => void;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

export function CrmQuotesTab({ quotes = [], opportunities = [], onSelectOpportunity }: CrmQuotesTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedQuote, setSelectedQuote] = useState<EnhancedQuote | null>(null);

    // New Quote Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Form fields
    const [selectedOppId, setSelectedOppId] = useState<string>('none');
    const [title, setTitle] = useState('');
    const [accountName, setAccountName] = useState('');
    const [clientNif, setClientNif] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [scopeDescription, setScopeDescription] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('30% Adiantamento, 70% com Autos Mensais');
    const [deliveryPeriodDays, setDeliveryPeriodDays] = useState(60);
    const [markup, setMarkup] = useState(20);
    
    // Items builder
    const [items, setItems] = useState<Array<Omit<QuoteItem, 'id'>>>([
        { name: 'Mobilização de Estaleiro & Equipas', quantity: 1, unit: 'vb', cost: 1500000 },
        { name: 'Trabalhos Preparatórios & Topografia', quantity: 1, unit: 'vb', cost: 2000000 },
    ]);

    // Handle Opp selection auto-fill
    const handleOpportunityChange = (oppId: string) => {
        setSelectedOppId(oppId);
        if (oppId !== 'none') {
            const opp = opportunities.find(o => o.id === oppId);
            if (opp) {
                setAccountName(opp.accountName || '');
                if (!title) {
                    setTitle(`Proposta Comercial - ${opp.name}`);
                }
            }
        }
    };

    const addItem = () => {
        setItems(prev => [...prev, { name: '', quantity: 1, unit: 'un', cost: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const updateItem = (index: number, field: keyof Omit<QuoteItem, 'id'>, value: any) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // Computations
    const calculations = useMemo(() => {
        const totalCost = items.reduce((acc, it) => acc + ((Number(it.cost) || 0) * (Number(it.quantity) || 1)), 0);
        const salePrice = totalCost * (1 + (Number(markup) || 0) / 100);
        const margin = salePrice - totalCost;
        return { totalCost, salePrice, margin };
    }, [items, markup]);

    const resetCreateForm = () => {
        setSelectedOppId('none');
        setTitle('');
        setAccountName('');
        setClientNif('');
        setClientEmail('');
        setClientPhone('');
        setScopeDescription('');
        setPaymentTerms('30% Adiantamento, 70% com Autos Mensais');
        setDeliveryPeriodDays(60);
        setMarkup(20);
        setItems([
            { name: 'Mobilização de Estaleiro & Equipas', quantity: 1, unit: 'vb', cost: 1500000 },
            { name: 'Trabalhos Preparatórios & Topografia', quantity: 1, unit: 'vb', cost: 2000000 },
        ]);
        setIsCreateOpen(false);
    };

    const handleCreateQuote = async () => {
        if (!title.trim()) {
            toast({ title: "Título da proposta é obrigatório", variant: "destructive" });
            return;
        }
        if (items.length === 0) {
            toast({ title: "Adicione pelo menos um item à proposta", variant: "destructive" });
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            const opp = selectedOppId !== 'none' ? opportunities.find(o => o.id === selectedOppId) : null;
            const quoteNumber = `PROP-${format(new Date(), 'yyyyMM')}-${Math.floor(100 + Math.random() * 900)}`;

            const quotePayload = {
                quoteNumber,
                title: title.trim(),
                status: 'Rascunho' as CustomerQuoteStatus,
                opportunityId: opp?.id || undefined,
                opportunityName: opp?.name || undefined,
                accountId: opp?.accountId || undefined,
                accountName: accountName.trim() || opp?.accountName || 'Cliente Geral',
                clientNif: clientNif.trim() || undefined,
                clientEmail: clientEmail.trim() || undefined,
                clientPhone: clientPhone.trim() || undefined,
                scopeDescription: scopeDescription.trim() || undefined,
                paymentTerms: paymentTerms.trim() || undefined,
                deliveryPeriodDays: Number(deliveryPeriodDays) || 60,
                items: items.map(it => ({
                    id: crypto.randomUUID(),
                    name: it.name || 'Serviço / Fornecimento',
                    quantity: Number(it.quantity) || 1,
                    unit: it.unit || 'un',
                    cost: Number(it.cost) || 0,
                    total: (Number(it.cost) || 0) * (Number(it.quantity) || 1)
                })),
                totalCost: calculations.totalCost,
                markup: Number(markup) || 0,
                salePrice: calculations.salePrice,
                margin: calculations.margin,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                }
            };

            // Save in root customerQuotes collection
            const docRef = await addDoc(collection(db, 'customerQuotes'), quotePayload);

            // Also save in subcollection under the opportunity if chosen
            if (opp?.id) {
                try {
                    await addDoc(collection(db, 'opportunities', opp.id, 'customerQuotes'), {
                        ...quotePayload,
                        rootQuoteId: docRef.id
                    });
                } catch (subErr) {
                    console.warn("Could not save to subcollection:", subErr);
                }
            }

            toast({ title: "Proposta Comercial criada com sucesso!" });
            resetCreateForm();
        } catch (error) {
            console.error("Error creating quote:", error);
            toast({ title: "Erro ao criar proposta", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter quotes
    const filteredQuotes = useMemo(() => {
        return quotes.filter(q => {
            const matchesSearch =
                q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (q.opportunityName && q.opportunityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (q.clientName && q.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (q.accountName && q.accountName.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [quotes, searchTerm, statusFilter]);

    // Metrics
    const metrics = useMemo(() => {
        const total = quotes.length;
        const approved = quotes.filter(q => q.status === 'Aprovada');
        const sent = quotes.filter(q => q.status === 'Enviada');
        const totalSaleValue = quotes.reduce((acc, q) => acc + (q.salePrice || 0), 0);
        const approvedValue = approved.reduce((acc, q) => acc + (q.salePrice || 0), 0);
        const avgMarkup = total > 0 ? quotes.reduce((acc, q) => acc + (q.markup || 0), 0) / total : 0;
        const conversionRate = total > 0 ? (approved.length / total) * 100 : 0;

        return {
            total,
            approvedCount: approved.length,
            sentCount: sent.length,
            totalSaleValue,
            approvedValue,
            avgMarkup,
            conversionRate,
        };
    }, [quotes]);

    const handleUpdateQuoteStatus = async (quote: EnhancedQuote, newStatus: CustomerQuoteStatus) => {
        try {
            // Update root doc if exists
            const quoteRef = doc(db, 'customerQuotes', quote.id);
            await updateDoc(quoteRef, { status: newStatus });
            
            setSelectedQuote(prev => prev ? { ...prev, status: newStatus } : null);
            toast({ title: `Estado da proposta atualizado para "${newStatus}"` });
        } catch (err) {
            // Fallback: could be under subcollection
            if (quote.opportunityId) {
                try {
                    const subRef = doc(db, 'opportunities', quote.opportunityId, 'customerQuotes', quote.id);
                    await updateDoc(subRef, { status: newStatus });
                    setSelectedQuote(prev => prev ? { ...prev, status: newStatus } : null);
                    toast({ title: `Estado atualizado para "${newStatus}"` });
                    return;
                } catch {}
            }
            toast({ title: "Erro ao atualizar estado", variant: "destructive" });
        }
    };

    const handleDownloadPdf = async (quote: EnhancedQuote) => {
        setIsGeneratingPdf(true);
        try {
            toast({ title: "A compilar Proposta Comercial em PDF...", description: "Aguarde um instante." });
            const opp = opportunities.find(o => o.id === quote.opportunityId);
            const docPdf = await compileCommercialProposalPDF({
                quote,
                opportunity: opp,
                companyName: 'Profundidade Engenharia & Gestão',
                companyNif: '5418000000',
                companyAddress: 'Luanda, Angola',
                companyContact: '+244 923 000 000',
            });
            const filename = `Proposta_${quote.quoteNumber || quote.title.replace(/\s+/g, '_')}.pdf`;
            docPdf.save(filename);
            toast({ title: "PDF gerado e descarregado com sucesso!" });
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            toast({ title: "Erro ao compilar documento PDF", variant: "destructive" });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const getStatusBadge = (status: CustomerQuoteStatus) => {
        switch (status) {
            case 'Aprovada':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovada</Badge>;
            case 'Enviada':
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"><Send className="h-3 w-3" /> Enviada</Badge>;
            case 'Em Negociação':
                return <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"><Clock className="h-3 w-3" /> Em Negociação</Badge>;
            case 'Rejeitada':
                return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejeitada</Badge>;
            case 'Rascunho':
            default:
                return <Badge variant="outline" className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Rascunho</Badge>;
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        try {
            const d = date?.toDate ? date.toDate() : new Date(date);
            return format(d, "dd 'de' MMM, yyyy", { locale: ptBR });
        } catch {
            return '-';
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.sentCount} enviadas aguardando resposta
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{metrics.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.approvedCount} propostas convertidas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume Ofertado Global</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.totalSaleValue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(metrics.approvedValue)} contratados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">BDI / Markup Médio</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.avgMarkup.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            Margem média calculada sobre custos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card>
                <CardHeader className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Procurar por proposta, oportunidade ou cliente..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Estados</SelectItem>
                                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                                    <SelectItem value="Enviada">Enviada</SelectItem>
                                    <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                                    <SelectItem value="Aprovada">Aprovada</SelectItem>
                                    <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    const csvRows = [
                                        ['Título', 'Oportunidade', 'Cliente', 'Estado', 'Custo Total (Kz)', 'Preço Venda (Kz)', 'Markup (%)'].join(','),
                                        ...filteredQuotes.map(q => [
                                            `"${q.title.replace(/"/g, '""')}"`,
                                            `"${(q.opportunityName || '').replace(/"/g, '""')}"`,
                                            `"${(q.clientName || q.accountName || '').replace(/"/g, '""')}"`,
                                            `"${q.status}"`,
                                            q.totalCost,
                                            q.salePrice,
                                            q.markup
                                        ].join(','))
                                    ];
                                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.setAttribute('href', url);
                                    link.setAttribute('download', `propostas_crm_${format(new Date(), 'yyyyMMdd')}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <Download className="h-4 w-4 mr-1.5" /> CSV
                            </Button>

                            <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
                                <Plus className="h-4 w-4" /> Nova Proposta
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proposta / Descrição</TableHead>
                                <TableHead>Oportunidade & Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-center">Itens</TableHead>
                                <TableHead className="text-right">Markup</TableHead>
                                <TableHead className="text-right">Preço de Venda</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredQuotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhuma proposta comercial encontrada para os filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredQuotes.map((quote) => (
                                    <TableRow key={quote.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                                        <TableCell>
                                            <div className="font-semibold text-foreground">{quote.title}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                {quote.quoteNumber && <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{quote.quoteNumber}</span>}
                                                <span>Autor: {quote.author?.displayName || 'Equipa Comercial'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{quote.opportunityName || 'Oportunidade Direta'}</div>
                                            <div className="text-xs text-muted-foreground">{quote.clientName || quote.accountName || 'Cliente Geral'}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDate(quote.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {quote.items?.length || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {quote.markup}%
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-primary font-mono">
                                            {formatCurrency(quote.salePrice)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(quote.status)}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadPdf(quote)}
                                                    className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                    title="Descarregar Proposta Oficial em PDF"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> PDF
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedQuote(quote)}
                                                    className="h-8 gap-1"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> Detalhes
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* MODAL: NOVA PROPOSTA COMERCIAL */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Elaborar Nova Proposta Comercial
                        </DialogTitle>
                        <DialogDescription>
                            Configure a discriminação de itens, margem de venda e gere a proposta formal em PDF.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="quote-opp" className="text-xs">Oportunidade Comercial Associada</Label>
                                <Select value={selectedOppId} onValueChange={handleOpportunityChange}>
                                    <SelectTrigger id="quote-opp">
                                        <SelectValue placeholder="Vincular a uma oportunidade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Sem Oportunidade Vinculada --</SelectItem>
                                        {opportunities.map(o => (
                                            <SelectItem key={o.id} value={o.id}>
                                                {o.name} ({o.accountName || 'Cliente'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quote-title" className="text-xs">Título da Proposta *</Label>
                                <Input
                                    id="quote-title"
                                    placeholder="Ex: Empreitada de Requalificação Viária"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="quote-acc" className="text-xs">Nome do Cliente / Empresa</Label>
                                <Input
                                    id="quote-acc"
                                    placeholder="Ex: Grupo Carrinho, S.A."
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quote-nif" className="text-xs">NIF do Cliente</Label>
                                <Input
                                    id="quote-nif"
                                    placeholder="Ex: 5418000123"
                                    value={clientNif}
                                    onChange={e => setClientNif(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quote-contact" className="text-xs">Telefone / Email</Label>
                                <Input
                                    id="quote-contact"
                                    placeholder="comercial@cliente.ao"
                                    value={clientEmail}
                                    onChange={e => setClientEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="quote-scope" className="text-xs">Escopo Resumido dos Serviços</Label>
                            <Textarea
                                id="quote-scope"
                                placeholder="Descreva sucintamente o objetivo e escopo da empreitada..."
                                rows={2}
                                value={scopeDescription}
                                onChange={e => setScopeDescription(e.target.value)}
                            />
                        </div>

                        {/* Items Builder */}
                        <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-xs flex items-center gap-1.5">
                                    <Layers className="h-4 w-4 text-primary" /> Discriminação de Itens Orçamentados
                                </h4>
                                <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
                                    <Plus className="h-3 w-3" /> Adicionar Item
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded border">
                                        <div className="col-span-5">
                                            <Input
                                                placeholder="Descrição do item / serviço"
                                                value={item.name}
                                                onChange={e => updateItem(idx, 'name', e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                placeholder="Qtd"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                placeholder="Un"
                                                value={item.unit}
                                                onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                className="h-8 text-xs text-center"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                placeholder="Custo Unit. (Kz)"
                                                value={item.cost}
                                                onChange={e => updateItem(idx, 'cost', Number(e.target.value))}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeItem(idx)}
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                disabled={items.length <= 1}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Financial totals row */}
                            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                                <div className="p-2 rounded bg-muted/60">
                                    <div className="text-[11px] text-muted-foreground">Custo Direto Estimado</div>
                                    <div className="text-sm font-bold font-mono">{formatCurrency(calculations.totalCost)}</div>
                                </div>
                                <div className="p-2 rounded bg-muted/60 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>BDI / Markup (%)</span>
                                        <span className="font-bold text-primary font-mono">{markup}%</span>
                                    </div>
                                    <Input
                                        type="number"
                                        value={markup}
                                        onChange={e => setMarkup(Number(e.target.value))}
                                        className="h-7 text-xs font-mono"
                                        min={0}
                                        max={200}
                                    />
                                </div>
                                <div className="p-2 rounded bg-primary/10 border border-primary/20">
                                    <div className="text-[11px] text-primary font-medium">Preço de Venda Ofertado</div>
                                    <div className="text-sm font-bold font-mono text-primary">{formatCurrency(calculations.salePrice)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="quote-terms" className="text-xs">Condições de Pagamento</Label>
                                <Input
                                    id="quote-terms"
                                    value={paymentTerms}
                                    onChange={e => setPaymentTerms(e.target.value)}
                                    placeholder="Ex: 30% sinal, 70% com autos mensais"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quote-delivery" className="text-xs">Prazo Estimado de Execução (dias)</Label>
                                <Input
                                    id="quote-delivery"
                                    type="number"
                                    value={deliveryPeriodDays}
                                    onChange={e => setDeliveryPeriodDays(Number(e.target.value))}
                                    placeholder="60"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={resetCreateForm} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateQuote} disabled={isSubmitting} className="gap-1.5">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Gravar Proposta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quote Preview Modal */}
            <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedQuote && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between pr-6">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {selectedQuote.quoteNumber && (
                                                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-semibold text-muted-foreground">
                                                    {selectedQuote.quoteNumber}
                                                </span>
                                            )}
                                            <DialogTitle className="text-xl font-bold">{selectedQuote.title}</DialogTitle>
                                        </div>
                                        <DialogDescription className="mt-1">
                                            {selectedQuote.opportunityName || 'Oportunidade Comercial'} • {selectedQuote.clientName || selectedQuote.accountName || 'Cliente Geral'}
                                        </DialogDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={selectedQuote.status}
                                            onValueChange={(v) => handleUpdateQuoteStatus(selectedQuote, v as CustomerQuoteStatus)}
                                        >
                                            <SelectTrigger className="w-[150px] h-8 text-xs font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Rascunho">Rascunho</SelectItem>
                                                <SelectItem value="Enviada">Enviada</SelectItem>
                                                <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                                                <SelectItem value="Aprovada">Aprovada</SelectItem>
                                                <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Summary cards inside modal */}
                            <div className="grid grid-cols-3 gap-4 my-2">
                                <div className="p-3 bg-muted/40 rounded-lg">
                                    <div className="text-xs text-muted-foreground">Custo Direto Estimado</div>
                                    <div className="text-lg font-bold font-mono">{formatCurrency(selectedQuote.totalCost)}</div>
                                </div>
                                <div className="p-3 bg-muted/40 rounded-lg">
                                    <div className="text-xs text-muted-foreground">BDI / Markup Aplicado</div>
                                    <div className="text-lg font-bold text-primary font-mono">+{selectedQuote.markup}%</div>
                                    <div className="text-xs text-muted-foreground">Margem: {formatCurrency(selectedQuote.margin)}</div>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <div className="text-xs text-primary font-medium">Preço de Venda Ofertado</div>
                                    <div className="text-lg font-bold text-primary font-mono">{formatCurrency(selectedQuote.salePrice)}</div>
                                </div>
                            </div>

                            {/* Terms & Conditions summary */}
                            {(selectedQuote.scopeDescription || selectedQuote.paymentTerms) && (
                                <div className="p-3 bg-muted/20 border rounded-lg space-y-1.5 text-xs">
                                    {selectedQuote.scopeDescription && (
                                        <p><strong>Escopo:</strong> {selectedQuote.scopeDescription}</p>
                                    )}
                                    {selectedQuote.paymentTerms && (
                                        <p><strong>Condições de Pagamento:</strong> {selectedQuote.paymentTerms}</p>
                                    )}
                                    {selectedQuote.deliveryPeriodDays && (
                                        <p><strong>Prazo de Execução:</strong> {selectedQuote.deliveryPeriodDays} dias</p>
                                    )}
                                </div>
                            )}

                            {/* Items breakdown */}
                            <div className="space-y-2 mt-4">
                                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                    <Layers className="h-4 w-4 text-primary" /> Discriminação de Itens da Proposta
                                </h4>
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Item / Descrição</TableHead>
                                                <TableHead className="text-center w-[90px]">Qtd</TableHead>
                                                <TableHead className="text-center w-[70px]">Unidade</TableHead>
                                                <TableHead className="text-right w-[140px]">Custo Unitário</TableHead>
                                                <TableHead className="text-right w-[160px]">Subtotal Estimado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedQuote.items && selectedQuote.items.length > 0 ? (
                                                selectedQuote.items.map((item, idx) => (
                                                    <TableRow key={item.id || idx}>
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell className="text-center font-mono">{item.quantity}</TableCell>
                                                        <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            {formatCurrency((item.cost || 0) * (item.quantity || 1))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                                        Nenhum item discriminado nesta proposta.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t mt-4">
                                <div className="text-xs text-muted-foreground">
                                    Criado a {formatDate(selectedQuote.createdAt)} por {selectedQuote.author?.displayName || 'Equipa Comercial'}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="default"
                                        onClick={() => handleDownloadPdf(selectedQuote)}
                                        disabled={isGeneratingPdf}
                                        className="gap-1.5 shadow-sm"
                                    >
                                        {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        Descarregar PDF Oficial
                                    </Button>

                                    {selectedQuote.opportunityId && onSelectOpportunity && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const oppId = selectedQuote.opportunityId;
                                                setSelectedQuote(null);
                                                if (oppId) onSelectOpportunity(oppId);
                                            }}
                                        >
                                            Ver Oportunidade
                                        </Button>
                                    )}
                                    <Button variant="ghost" onClick={() => setSelectedQuote(null)}>
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
