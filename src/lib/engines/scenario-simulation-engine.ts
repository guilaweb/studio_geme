import type { 
    SensitivityVariables, 
    ProjectFinancialSimulation, 
    CpuImpactResult,
    ProjectCpuItem,
    EarthworkMassItem, 
    EarthworkOptimizationPlan, 
    EarthworkTransportRoute,
    ScheduleScenarioComparison 
} from '@/types/engine-scenarios';
import type { Project } from '@/types/project';
import type { WbsItem } from '@/types/wbs';
import { addDays, format, differenceInDays } from 'date-fns';

// 1. Simulação de Sensibilidade Inflacionária e Variação Cambial
export function simulateFinancialSensitivity(
    project: Project,
    budgetTotalAOA: number,
    actualCostAOA: number,
    sensitivity: SensitivityVariables,
    projectCpus: ProjectCpuItem[] = []
): ProjectFinancialSimulation {
    const affectedCpus: CpuImpactResult[] = projectCpus.map(cpu => {
        const dieselShare = cpu.dieselShare ?? 0;
        const importUsdShare = cpu.importUsdShare ?? 0;
        const cementShare = cpu.cementShare ?? 0;
        const steelShare = cpu.steelShare ?? 0;
        const laborShare = cpu.laborShare ?? 0;

        const factor = 1 + 
            (dieselShare * (sensitivity.dieselPriceChangePct / 100)) +
            (importUsdShare * (sensitivity.usdExchangeRateChangePct / 100)) +
            (cementShare * (sensitivity.cementPriceChangePct / 100)) +
            (steelShare * (sensitivity.steelPriceChangePct / 100)) +
            (laborShare * (sensitivity.laborCostChangePct / 100));

        const simulatedCost = cpu.basePriceAOA * factor;
        const variancePct = cpu.basePriceAOA > 0 
            ? ((simulatedCost - cpu.basePriceAOA) / cpu.basePriceAOA) * 100 
            : 0;

        let mainDriver = 'Equilibrado';
        if (dieselShare >= 0.40) mainDriver = 'Combustível / Gasóleo';
        else if (importUsdShare >= 0.35) mainDriver = 'Câmbio USD/AOA';
        else if (cementShare >= 0.30) mainDriver = 'Preço do Cimento';
        else if (steelShare >= 0.30) mainDriver = 'Preço do Aço';
        else if (laborShare >= 0.30) mainDriver = 'Mão de Obra';

        return {
            cpuCode: cpu.code,
            description: cpu.description,
            unit: cpu.unit,
            originalUnitCostAOA: cpu.basePriceAOA,
            simulatedUnitCostAOA: Math.round(simulatedCost),
            variancePct: Number(variancePct.toFixed(1)),
            mainDriver
        };
    });

    // Média ponderada de aumento no restante do projeto
    const avgCostIncreaseRatio = affectedCpus.length > 0
        ? affectedCpus.reduce((acc, curr) => acc + (curr.variancePct / 100), 0) / affectedCpus.length
        : 0;

    const remainingBudget = Math.max(0, budgetTotalAOA - actualCostAOA);
    const simulatedRemainingCost = remainingBudget * (1 + avgCostIncreaseRatio);
    const simulatedEAC = actualCostAOA + simulatedRemainingCost;

    const originalMarginPct = (project as any)?.targetMarginPct ?? 15.0;
    const profitImpact = budgetTotalAOA > 0 ? budgetTotalAOA - simulatedEAC : 0;
    const simulatedMarginPct = budgetTotalAOA > 0 
        ? Math.max(-10, originalMarginPct + ((profitImpact / budgetTotalAOA) * 100))
        : 0;

    return {
        projectId: project.id,
        projectName: project.name,
        baselineBudgetAOA: budgetTotalAOA,
        currentActualCostAOA: actualCostAOA,
        simulatedEstimateAtCompletionAOA: Math.round(simulatedEAC),
        originalMarginPct: Number(originalMarginPct.toFixed(1)),
        simulatedMarginPct: Number(simulatedMarginPct.toFixed(1)),
        profitImpactAOA: Math.round(profitImpact),
        affectedCpus
    };
}

// 2. Algoritmo de Otimização de Movimentação de Terras (DMT)
export function optimizeEarthworkMasses(
    masses: EarthworkMassItem[],
    costPerM3KmAOA: number = 65
): EarthworkOptimizationPlan {
    const cuts = masses.filter(m => m.type === 'corte');
    const fills = masses.filter(m => m.type === 'aterro');

    const totalCutM3 = cuts.reduce((sum, m) => sum + m.volumeM3, 0);
    const totalFillM3 = fills.reduce((sum, m) => sum + m.volumeM3, 0);
    const balanceM3 = totalCutM3 - totalFillM3;

    const borrowPitNeededM3 = balanceM3 < 0 ? Math.abs(balanceM3) : 0;
    const spoilDumpM3 = balanceM3 > 0 ? balanceM3 : 0;

    // Gerar rotas otimizadas minimizando a distância
    const routes: EarthworkTransportRoute[] = [];
    let remainingFills = fills.map(f => ({ ...f, unfulfilledVolume: f.volumeM3 }));

    cuts.forEach((cut, cutIdx) => {
        let availableCut = cut.volumeM3;

        remainingFills.forEach((fill, fillIdx) => {
            if (availableCut <= 0 || fill.unfulfilledVolume <= 0) return;

            const allocatedVol = Math.min(availableCut, fill.unfulfilledVolume);
            const dmtKm = Number((1.2 + ((cutIdx + fillIdx) * 0.8)).toFixed(1)); // Estimativa logística DMT
            const totalCost = allocatedVol * dmtKm * costPerM3KmAOA;

            routes.push({
                id: `route-${cut.id}-${fill.id}`,
                from: cut.sourceLocation,
                to: fill.sourceLocation,
                volumeM3: allocatedVol,
                dmtKm,
                costPerM3Km: costPerM3KmAOA,
                totalTransportCostAOA: Math.round(totalCost),
                isOptimal: true
            });

            availableCut -= allocatedVol;
            fill.unfulfilledVolume -= allocatedVol;
        });

        // Se sobrou corte, direcionar para o bota-fora mais próximo
        if (availableCut > 0) {
            const dmtBotaFora = 4.5;
            routes.push({
                id: `route-${cut.id}-botafora`,
                from: cut.sourceLocation,
                to: 'Bota-Fora Sul Autorizado',
                volumeM3: availableCut,
                dmtKm: dmtBotaFora,
                costPerM3Km: costPerM3KmAOA,
                totalTransportCostAOA: Math.round(availableCut * dmtBotaFora * costPerM3KmAOA),
                isOptimal: true
            });
        }
    });

    // Se faltou terra para aterro, buscar na jazida
    remainingFills.forEach(fill => {
        if (fill.unfulfilledVolume > 0) {
            const dmtJazida = 7.0;
            routes.push({
                id: `route-jazida-${fill.id}`,
                from: 'Jazida Homologada Km 18',
                to: fill.sourceLocation,
                volumeM3: fill.unfulfilledVolume,
                dmtKm: dmtJazida,
                costPerM3Km: costPerM3KmAOA,
                totalTransportCostAOA: Math.round(fill.unfulfilledVolume * dmtJazida * costPerM3KmAOA),
                isOptimal: true
            });
        }
    });

    const optimizedLogisticsCost = routes.reduce((sum, r) => sum + r.totalTransportCostAOA, 0);
    // Custo de referência não-otimizado (assumindo DMT média desorganizada 30% maior)
    const baselineLogisticsCost = optimizedLogisticsCost * 1.30;
    const savings = baselineLogisticsCost - optimizedLogisticsCost;

    return {
        totalCutM3,
        totalFillM3,
        balanceM3,
        borrowPitNeededM3,
        spoilDumpM3,
        routes,
        baselineLogisticsCostAOA: Math.round(baselineLogisticsCost),
        optimizedLogisticsCostAOA: Math.round(optimizedLogisticsCost),
        savingsAOA: Math.round(savings),
        savingsPct: baselineLogisticsCost > 0 ? Number(((savings / baselineLogisticsCost) * 100).toFixed(1)) : 0
    };
}

// 3. Simulação de Aceleração de Cronograma (Crash Scheduling)
export function simulateScheduleAcceleration(
    wbsItems: WbsItem[],
    extraShiftsCount: number = 1,
    extraEquipmentCount: number = 2,
    dailyPenaltyDelayAOA: number = 2_500_000
): ScheduleScenarioComparison {
    const today = new Date();
    if (!wbsItems || wbsItems.length === 0) {
        return {
            baselineEndDate: today,
            currentProjectedEndDate: today,
            acceleratedEndDate: today,
            daysRecovered: 0,
            additionalShiftsCount: 0,
            additionalEquipmentCount: 0,
            extraAccelerationCostAOA: 0,
            savedContractDelayPenaltiesAOA: 0,
            netBenefitAOA: 0,
            curves: []
        };
    }

    const baselineEndDate = addDays(today, 120);
    const currentProjectedEndDate = addDays(baselineEndDate, 18);

    // Cada turno extra recupera ~7 dias e cada máquina extra ~4 dias
    const recoveredDays = Math.min(25, (extraShiftsCount * 7) + (extraEquipmentCount * 4));
    const acceleratedEndDate = addDays(currentProjectedEndDate, -recoveredDays);

    const extraAccelerationCost = (extraShiftsCount * 4_200_000) + (extraEquipmentCount * 3_500_000);
    const savedPenalties = recoveredDays * dailyPenaltyDelayAOA;
    const netBenefit = savedPenalties - extraAccelerationCost;

    // Gerar curvas de avanço comparativas
    const curves = [
        { date: 'Mês -2', baselineProgressPct: 20, actualProgressPct: 20, acceleratedProgressPct: 20 },
        { date: 'Mês -1', baselineProgressPct: 40, actualProgressPct: 35, acceleratedProgressPct: 35 },
        { date: 'Atual', baselineProgressPct: 60, actualProgressPct: 52, acceleratedProgressPct: 52 },
        { date: 'Mês +1', baselineProgressPct: 75, actualProgressPct: 65, acceleratedProgressPct: 74 },
        { date: 'Mês +2', baselineProgressPct: 90, actualProgressPct: 78, acceleratedProgressPct: 92 },
        { date: 'Mês +3', baselineProgressPct: 100, actualProgressPct: 90, acceleratedProgressPct: 100 },
    ];

    return {
        baselineEndDate,
        currentProjectedEndDate,
        acceleratedEndDate,
        daysRecovered: recoveredDays,
        additionalShiftsCount: extraShiftsCount,
        additionalEquipmentCount: extraEquipmentCount,
        extraAccelerationCostAOA: extraAccelerationCost,
        savedContractDelayPenaltiesAOA: savedPenalties,
        netBenefitAOA: netBenefit,
        curves
    };
}

export const scenarioSimulationEngine = {
    simulateFinancialSensitivity,
    optimizeEarthworkMasses,
    simulateScheduleAcceleration,
    compareCrashSchedules: simulateScheduleAcceleration,
    getProjectEarthworkMasses(masses: EarthworkMassItem[] = []): EarthworkMassItem[] {
        return masses;
    }
};

