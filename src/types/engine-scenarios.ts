export interface SensitivityVariables {
    dieselPriceChangePct: number; // ex: +15%
    usdExchangeRateChangePct: number; // ex: +8% (depreciação cambial do AOA)
    cementPriceChangePct: number; // ex: +10%
    steelPriceChangePct: number; // ex: +12%
    laborCostChangePct: number; // ex: +5%
}

export interface ProjectCpuItem {
    id?: string;
    code: string;
    description: string;
    unit: string;
    basePriceAOA: number;
    dieselShare?: number;
    importUsdShare?: number;
    cementShare?: number;
    steelShare?: number;
    laborShare?: number;
}

export interface CpuImpactResult {
    cpuCode: string;
    description: string;
    unit: string;
    originalUnitCostAOA: number;
    simulatedUnitCostAOA: number;
    variancePct: number;
    mainDriver: string;
}

export interface ProjectFinancialSimulation {
    projectId: string;
    projectName: string;
    baselineBudgetAOA: number;
    currentActualCostAOA: number;
    simulatedEstimateAtCompletionAOA: number;
    originalMarginPct: number;
    simulatedMarginPct: number;
    profitImpactAOA: number; // negativo para perda de margem
    affectedCpus: CpuImpactResult[];
}

export interface EarthworkMassItem {
    id: string;
    sourceLocation: string; // ex: 'Estaca 120+00 a 145+00 (Corte)'
    type: 'corte' | 'aterro' | 'jazida' | 'bota_fora';
    volumeM3: number;
    materialType: string;
    coordinates?: { lat: number; lng: number };
}

export interface EarthworkTransportRoute {
    id: string;
    from: string;
    to: string;
    volumeM3: number;
    dmtKm: number; // Distância Média de Transporte
    costPerM3Km: number; // Custo unitário de transporte AOA/(m³·km)
    totalTransportCostAOA: number;
    isOptimal: boolean;
}

export interface EarthworkOptimizationPlan {
    totalCutM3: number;
    totalFillM3: number;
    balanceM3: number; // excesso de corte ou défice de aterro
    borrowPitNeededM3: number; // necessidade de jazida
    spoilDumpM3: number; // volume a depositar em bota-fora
    routes: EarthworkTransportRoute[];
    baselineLogisticsCostAOA: number;
    optimizedLogisticsCostAOA: number;
    savingsAOA: number;
    savingsPct: number;
}

export interface ScheduleScenarioComparison {
    baselineEndDate: string | Date;
    currentProjectedEndDate: string | Date;
    acceleratedEndDate: string | Date;
    daysRecovered: number;
    additionalShiftsCount: number;
    additionalEquipmentCount: number;
    extraAccelerationCostAOA: number;
    savedContractDelayPenaltiesAOA: number;
    netBenefitAOA: number;
    curves: {
        date: string;
        baselineProgressPct: number;
        actualProgressPct: number;
        acceleratedProgressPct: number;
    }[];
}
