import type { Equipment, EquipmentUsageLog } from '@/types/equipment';
import type { WbsItem } from '@/types/wbs';
import type { LicensePermit, InsurancePolicy } from '@/types/legal';
import type { Concession } from '@/types/mining';
import type { 
    FuelAnomalyAlert, 
    CriticalPathRiskAlert, 
    RegulatoryWatchItem, 
    EarlyWarningSummary 
} from '@/types/engine-early-warning';
import { differenceInDays, addDays, isBefore } from 'date-fns';

// 1. Motor de Deteção de Desvios de Consumo de Combustível
export function analyzeFuelAnomalies(
    equipmentList: Equipment[],
    usageLogs: EquipmentUsageLog[],
    dieselPricePerLiterAOA: number = 300
): FuelAnomalyAlert[] {
    const alerts: FuelAnomalyAlert[] = [];

    // Agrupar consumos por equipamento
    const equipmentMetrics = new Map<string, {
        equipment: Equipment;
        totalHours: number;
        totalLiters: number;
        logsCount: number;
    }>();

    usageLogs.forEach(log => {
        if (!log.equipmentId || !log.hoursUsed || log.hoursUsed <= 0) return;
        const current = equipmentMetrics.get(log.equipmentId) || {
            equipment: equipmentList.find(e => e.id === log.equipmentId) || {
                id: log.equipmentId,
                name: `Equipamento ${log.equipmentId}`,
                category: 'Veículo Pesado',
                status: 'Em Uso',
                isOwned: true,
                createdAt: new Date() as any,
                author: { uid: '', displayName: '' }
            },
            totalHours: 0,
            totalLiters: 0,
            logsCount: 0,
        };

        current.totalHours += log.hoursUsed;
        current.totalLiters += log.fuelConsumed || 0;
        current.logsCount += 1;
        equipmentMetrics.set(log.equipmentId, current);
    });

    // Calcular médias de referência por categoria
    const categoryAverages: Record<string, { avgLitersPerHour: number; standardDeviation: number }> = {
        'Veículo Pesado': { avgLitersPerHour: 28.0, standardDeviation: 5.0 }, // Ex: Escavadoras e Dumpers
        'Veículo Leve': { avgLitersPerHour: 9.5, standardDeviation: 2.0 },    // Ex: Pick-ups 4x4
        'Energia': { avgLitersPerHour: 22.0, standardDeviation: 4.0 },         // Ex: Geradores 150 kVA
        'Outros': { avgLitersPerHour: 15.0, standardDeviation: 3.0 },
    };

    equipmentMetrics.forEach((metric, eqId) => {
        if (metric.totalHours < 2) return; // Mínimo de 2 horas para amostragem estatística

        const actualRate = metric.totalLiters / metric.totalHours;
        const benchmark = categoryAverages[metric.equipment.category] || categoryAverages['Veículo Pesado'];
        const deviationPct = ((actualRate - benchmark.avgLitersPerHour) / benchmark.avgLitersPerHour) * 100;

        // Se o consumo exceder em 25% ou mais a média esperada da frota
        if (deviationPct >= 25) {
            const excessLiters = (actualRate - benchmark.avgLitersPerHour) * metric.totalHours;
            const excessCost = excessLiters * dieselPricePerLiterAOA;

            let cause: FuelAnomalyAlert['suspectedCause'] = 'Ralenti Excessivo';
            if (deviationPct > 60) {
                cause = 'Suspeita de Furto / Desvio';
            } else if (deviationPct > 40) {
                cause = 'Possível Fuga / Rompimento';
            } else {
                cause = 'Injeção Descalibrada / Motor Sobrecarga';
            }

            alerts.push({
                id: `fuel-anomaly-${eqId}-${Date.now()}`,
                equipmentId: eqId,
                equipmentName: metric.equipment.name,
                date: new Date(),
                expectedConsumptionPerHour: Number(benchmark.avgLitersPerHour.toFixed(1)),
                actualConsumptionPerHour: Number(actualRate.toFixed(1)),
                deviationPct: Number(deviationPct.toFixed(1)),
                excessLiters: Math.round(excessLiters),
                excessCostAOA: Math.round(excessCost),
                severity: deviationPct >= 50 ? 'crítica' : deviationPct >= 35 ? 'alta' : 'média',
                suspectedCause: cause,
                status: 'novo'
            });
        }
    });

    return alerts.sort((a, b) => b.deviationPct - a.deviationPct);
}

// 2. Motor de Alertas de Risco de Caminho Crítico (EAP)
export function analyzeCriticalPathRisks(
    wbsItems: WbsItem[],
    currentDate: Date = new Date()
): CriticalPathRiskAlert[] {
    const alerts: CriticalPathRiskAlert[] = [];

    // Mapear itens que possuem dependências ou estão em atraso
    wbsItems.forEach(item => {
        if (!item.startDate || !item.endDate) return;

        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const totalDurationDays = Math.max(1, differenceInDays(end, start));
        const daysElapsed = differenceInDays(currentDate, start);

        if (daysElapsed <= 0) return; // Ainda não iniciou

        // Progresso esperado linear
        const plannedProgress = Math.min(100, Math.max(0, (daysElapsed / totalDurationDays) * 100));
        const actualProgress = item.progress || 0;
        const progressGap = plannedProgress - actualProgress;

        // Se o progresso real estiver 10% ou mais abaixo do ritmo planeado
        if (progressGap >= 10 && actualProgress < 100) {
            const delayRatio = progressGap / 100;
            const delayDays = Math.round(totalDurationDays * delayRatio);

            // Contar tarefas dependentes que serão empurradas
            const successors = wbsItems.filter(other => 
                other.dependencies && other.dependencies.includes(item.id)
            );

            const impactOnFinal = successors.length > 0 ? delayDays : Math.round(delayDays * 0.5);
            const projectedEnd = addDays(end, delayDays);

            alerts.push({
                id: `critical-risk-${item.id}`,
                wbsItemId: item.id,
                wbsItemName: item.name,
                plannedProgress: Math.round(plannedProgress),
                actualProgress: Math.round(actualProgress),
                delayDays,
                affectedSuccessorCount: successors.length,
                impactOnFinalDeliveryDays: impactOnFinal,
                originalEndDate: end,
                projectedEndDate: projectedEnd,
                severity: impactOnFinal >= 14 ? 'crítica' : impactOnFinal >= 7 ? 'alta' : 'média',
                recommendedMitigation: successors.length > 0 
                    ? `Alocar turno extra imediato ou reforçar frentes de trabalho para evitar propagação de ${delayDays} dias para ${successors.length} tarefa(s) sucessora(s).`
                    : 'Replanejar alocação de recursos da frente para recuperar avanço físico.'
            });
        }
    });

    return alerts.sort((a, b) => b.impactOnFinalDeliveryDays - a.impactOnFinalDeliveryDays);
}

// 3. Sentinela de Vigilância de Prazos e Obrigações Regulatórias
export function analyzeRegulatoryWatches(
    licenses: LicensePermit[] = [],
    insurances: InsurancePolicy[] = [],
    concessions: Concession[] = [],
    currentDate: Date = new Date()
): RegulatoryWatchItem[] {
    const items: RegulatoryWatchItem[] = [];

    // 1. Licenças e Alvarás
    licenses.forEach(lic => {
        if (!lic.expiryDate) return;
        const exp = new Date(lic.expiryDate);
        const days = differenceInDays(exp, currentDate);

        if (days <= 90) {
            items.push({
                id: `lic-${lic.id}`,
                title: lic.name,
                type: lic.type as any || 'Licença Ambiental',
                entity: lic.issuingBody || 'Administração Pública',
                referenceNumber: lic.referenceNumber || 'S/N',
                expiryDate: exp,
                daysRemaining: days,
                urgency: days <= 0 ? 'expirado' : days <= 15 ? 'crítico' : days <= 45 ? 'alerta' : 'regular',
            });
        }
    });

    // 2. Apólices de Seguros
    insurances.forEach(ins => {
        if (!ins.endDate) return;
        const exp = new Date(ins.endDate);
        const days = differenceInDays(exp, currentDate);

        if (days <= 90) {
            items.push({
                id: `ins-${ins.id}`,
                title: `Apólice ${ins.type}`,
                type: 'Seguro All Risks',
                entity: ins.insurer || 'Seguradora',
                referenceNumber: ins.policyNumber || 'S/N',
                expiryDate: exp,
                daysRemaining: days,
                urgency: days <= 0 ? 'expirado' : days <= 15 ? 'crítico' : days <= 45 ? 'alerta' : 'regular',
                associatedAssetOrContract: ins.coverageAmount ? `Cobertura: ${ins.coverageAmount.toLocaleString('pt-AO')} Kz` : undefined
            });
        }
    });

    // 3. Concessões Mineiras
    concessions.forEach(c => {
        if (!c.validityEnd) return;
        const exp = new Date(c.validityEnd);
        const days = differenceInDays(exp, currentDate);

        if (days <= 90) {
            items.push({
                id: `conc-${c.id}`,
                title: `Concessão ${c.name}`,
                type: 'Título de Concessão',
                entity: c.issuingAuthority || 'MIREMPET / ANRM',
                referenceNumber: c.licenseNumber || 'Alvará Mineiro',
                expiryDate: exp,
                daysRemaining: days,
                urgency: days <= 0 ? 'expirado' : days <= 30 ? 'crítico' : 'alerta',
                associatedAssetOrContract: `Área: ${c.area} km² | Titular: ${c.holder}`
            });
        }
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// Consolidador Geral do Early Warning Engine
export function buildEarlyWarningSummary(
    equipmentList: Equipment[],
    usageLogs: EquipmentUsageLog[],
    wbsItems: WbsItem[],
    licenses: LicensePermit[] = [],
    insurances: InsurancePolicy[] = [],
    concessions: Concession[] = []
): EarlyWarningSummary {
    const fuelAnomalies = analyzeFuelAnomalies(equipmentList, usageLogs);
    const criticalPathRisks = analyzeCriticalPathRisks(wbsItems);
    const regulatoryWatches = analyzeRegulatoryWatches(licenses, insurances, concessions);

    const totalActiveAlerts = fuelAnomalies.length + criticalPathRisks.length + regulatoryWatches.length;
    const criticalAlertsCount = 
        fuelAnomalies.filter(a => a.severity === 'crítica').length +
        criticalPathRisks.filter(a => a.severity === 'crítica').length +
        regulatoryWatches.filter(a => a.urgency === 'crítico' || a.urgency === 'expirado').length;

    const estimatedFinancialLossAOA = fuelAnomalies.reduce((sum, a) => sum + a.excessCostAOA, 0);
    const criticalPathDelayDaysMax = criticalPathRisks.length > 0 
        ? Math.max(...criticalPathRisks.map(r => r.impactOnFinalDeliveryDays)) 
        : 0;

    const expiringRegulationsWithin30Days = regulatoryWatches.filter(r => r.daysRemaining <= 30).length;

    return {
        totalActiveAlerts,
        criticalAlertsCount,
        estimatedFinancialLossAOA,
        criticalPathDelayDaysMax,
        expiringRegulationsWithin30Days,
        fuelAnomalies,
        criticalPathRisks,
        regulatoryWatches,
    };
}
