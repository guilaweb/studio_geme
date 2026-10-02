'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    AlertTriangle, 
    Fuel, 
    GitCommitVertical, 
    ShieldAlert, 
    Clock, 
    DollarSign, 
    CheckCircle2, 
    RefreshCw, 
    ArrowUpRight, 
    TrendingDown, 
    Truck, 
    ShieldCheck, 
    Search 
} from 'lucide-react';
import type { EarlyWarningSummary, FuelAnomalyAlert, CriticalPathRiskAlert, RegulatoryWatchItem } from '@/types/engine-early-warning';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EarlyWarningTabProps {
    projectId?: string;
    summary?: EarlyWarningSummary;
    onRefresh?: () => void;
    isLoading?: boolean;
}

const EMPTY_EARLY_WARNING_SUMMARY: EarlyWarningSummary = {
    totalActiveAlerts: 0,
    criticalAlertsCount: 0,
    estimatedFinancialLossAOA: 0,
    criticalPathDelayDaysMax: 0,
    expiringRegulationsWithin30Days: 0,
    fuelAnomalies: [],
    criticalPathRisks: [],
    regulatoryWatches: []
};

export function EarlyWarningTab({ projectId, summary: initialSummary, onRefresh, isLoading: externalLoading }: EarlyWarningTabProps) {
    const [internalSummary, setInternalSummary] = useState<EarlyWarningSummary>(initialSummary || EMPTY_EARLY_WARNING_SUMMARY);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!initialSummary && projectId) {
            setLoading(true);
            fetch(`/api/projects/${projectId}/engines/early-warning`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.summary) {
                        setInternalSummary(data.summary);
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        } else if (initialSummary) {
            setInternalSummary(initialSummary);
        }
    }, [projectId, initialSummary]);

    const summary = internalSummary;
    const isLoading = externalLoading || loading;

    const [selectedCategory, setSelectedCategory] = useState<'todos' | 'combustivel' | 'caminho_critico' | 'regulatorio'>('todos');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFuel = summary.fuelAnomalies.filter(a => 
        a.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.suspectedCause.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRisks = summary.criticalPathRisks.filter(r =>
        r.wbsItemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredWatches = summary.regulatoryWatches.filter(w =>
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'crítica':
            case 'crítico':
            case 'expirado':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
            case 'alta':
            case 'alerta':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
            default:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Alertas Ativos de Risco</CardTitle>
                        <AlertTriangle className={cn("h-4 w-4", summary.criticalAlertsCount > 0 ? "text-rose-500 animate-pulse" : "text-primary")} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{summary.totalActiveAlerts}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <strong className="text-rose-600 dark:text-rose-400">{summary.criticalAlertsCount} com severidade crítica</strong>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Desvio Financeiro Estimado</CardTitle>
                        <Fuel className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {summary.estimatedFinancialLossAOA.toLocaleString('pt-AO')} <span className="text-sm font-normal text-muted-foreground">Kz</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Consumo excessivo de combustível na frota
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Atraso em Caminho Crítico</CardTitle>
                        <GitCommitVertical className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                            +{summary.criticalPathDelayDaysMax} <span className="text-sm font-normal text-muted-foreground">dias</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Impacto estimado na entrega final da obra
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Vencimentos &lt; 30 Dias</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {summary.expiringRegulationsWithin30Days}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Licenças, seguros ou cauções bancárias
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-lg border">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Button 
                        size="sm" 
                        variant={selectedCategory === 'todos' ? 'default' : 'ghost'}
                        className="text-xs h-8"
                        onClick={() => setSelectedCategory('todos')}
                    >
                        Todos ({summary.totalActiveAlerts})
                    </Button>
                    <Button 
                        size="sm" 
                        variant={selectedCategory === 'combustivel' ? 'default' : 'ghost'}
                        className="text-xs h-8 gap-1.5"
                        onClick={() => setSelectedCategory('combustivel')}
                    >
                        <Fuel className="h-3.5 w-3.5" />
                        Combustível ({summary.fuelAnomalies.length})
                    </Button>
                    <Button 
                        size="sm" 
                        variant={selectedCategory === 'caminho_critico' ? 'default' : 'ghost'}
                        className="text-xs h-8 gap-1.5"
                        onClick={() => setSelectedCategory('caminho_critico')}
                    >
                        <GitCommitVertical className="h-3.5 w-3.5" />
                        Caminho Crítico ({summary.criticalPathRisks.length})
                    </Button>
                    <Button 
                        size="sm" 
                        variant={selectedCategory === 'regulatorio' ? 'default' : 'ghost'}
                        className="text-xs h-8 gap-1.5"
                        onClick={() => setSelectedCategory('regulatorio')}
                    >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Vigilância Legal ({summary.regulatoryWatches.length})
                    </Button>
                </div>

                {onRefresh && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={onRefresh} 
                        disabled={isLoading}
                        className="text-xs h-8 gap-1.5 self-end sm:self-auto"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isLoading && "animate-spin")} />
                        Recalcular Anomalias
                    </Button>
                )}
            </div>

            {/* Anomalias de Combustível */}
            {(selectedCategory === 'todos' || selectedCategory === 'combustivel') && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-amber-500" />
                            Deteção de Desvios de Consumo de Combustível (&gt; 25% da Frota)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Cruzamento em tempo real de horímetros, litragem abastecida e desvio padrão estatístico.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredFuel.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground rounded-lg border border-dashed">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                                Nenhuma anomalia de combustível detetada. Frota operando dentro do desvio padrão seguro.
                            </div>
                        ) : (
                            filteredFuel.map(alert => (
                                <div key={alert.id} className="p-3.5 rounded-lg border bg-card hover:bg-muted/10 transition-colors space-y-2 text-xs">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("font-bold text-[10px]", getSeverityBadge(alert.severity))}>
                                                {alert.severity.toUpperCase()}
                                            </Badge>
                                            <span className="font-bold text-sm text-foreground">{alert.equipmentName}</span>
                                            <Badge variant="secondary" className="font-semibold text-amber-600 dark:text-amber-400">
                                                +{alert.deviationPct}% acima da média
                                            </Badge>
                                        </div>
                                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                            Prejuízo: {alert.excessCostAOA.toLocaleString('pt-AO')} Kz ({alert.excessLiters} L em excesso)
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-muted-foreground">
                                        <div>
                                            <span>Média Esperada: </span>
                                            <strong className="text-foreground">{alert.expectedConsumptionPerHour} L/h</strong>
                                        </div>
                                        <div>
                                            <span>Consumo Registado: </span>
                                            <strong className="text-foreground">{alert.actualConsumptionPerHour} L/h</strong>
                                        </div>
                                        <div className="col-span-2">
                                            <span>Diagnóstico Preditivo: </span>
                                            <strong className="text-foreground">{alert.suspectedCause}</strong>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Riscos de Caminho Crítico */}
            {(selectedCategory === 'todos' || selectedCategory === 'caminho_critico') && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <GitCommitVertical className="h-4 w-4 text-rose-500" />
                            Alertas de Risco de Caminho Crítico (EAP / Cronograma)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Recálculo proativo do impacto de tarefas predecessoras atrasadas nas atividades sucessoras.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredRisks.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground rounded-lg border border-dashed">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                                Todas as tarefas do caminho crítico estão evoluindo no ritmo planeado.
                            </div>
                        ) : (
                            filteredRisks.map(risk => (
                                <div key={risk.id} className="p-3.5 rounded-lg border bg-card hover:bg-muted/10 transition-colors space-y-2 text-xs">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("font-bold text-[10px]", getSeverityBadge(risk.severity))}>
                                                {risk.severity.toUpperCase()}
                                            </Badge>
                                            <span className="font-bold text-sm text-foreground">{risk.wbsItemName}</span>
                                        </div>
                                        <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                                            +{risk.impactOnFinalDeliveryDays} dias de atraso na entrega final
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-muted-foreground">
                                            <span>Avanço Real: {risk.actualProgress}%</span>
                                            <span>Planeado para a data: {risk.plannedProgress}%</span>
                                        </div>
                                        <Progress value={risk.actualProgress} className="h-2" />
                                    </div>

                                    <div className="p-2.5 rounded bg-muted/40 border text-muted-foreground">
                                        <strong className="text-foreground">Medida de Mitigação Sugerida: </strong>
                                        {risk.recommendedMitigation}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Vigilância de Prazos e Obrigações */}
            {(selectedCategory === 'todos' || selectedCategory === 'regulatorio') && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-indigo-500" />
                            Vigilância Contínua de Prazos e Obrigações Regulatórias
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Monitorização de caducidade de licenças ambientais, concessões, seguros e cauções bancárias.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {filteredWatches.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground rounded-lg border border-dashed">
                                <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                                Todos os títulos e garantias estão vigentes e regularizados.
                            </div>
                        ) : (
                            filteredWatches.map(watch => (
                                <div key={watch.id} className="p-3.5 rounded-lg border bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("text-[10px] font-bold", getSeverityBadge(watch.urgency))}>
                                                {watch.urgency.toUpperCase()}
                                            </Badge>
                                            <span className="font-bold text-sm text-foreground">{watch.title}</span>
                                            <span className="text-muted-foreground font-mono">({watch.referenceNumber})</span>
                                        </div>
                                        <p className="text-muted-foreground">
                                            Entidade Emissora: <strong className="text-foreground">{watch.entity}</strong> | Tipo: {watch.type}
                                            {watch.associatedAssetOrContract && ` | ${watch.associatedAssetOrContract}`}
                                        </p>
                                    </div>

                                    <div className="text-right sm:shrink-0">
                                        <div className={cn("font-bold text-sm", watch.daysRemaining <= 15 ? "text-rose-600 dark:text-rose-400 font-mono" : "text-foreground font-mono")}>
                                            {watch.daysRemaining <= 0 ? 'EXPIRADO' : `${watch.daysRemaining} dias restantes`}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
                                            Vencimento: {format(new Date(watch.expiryDate), 'dd/MM/yyyy')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default EarlyWarningTab;
