import type { Timestamp } from 'firebase/firestore';

// 1. Estaqueamento e Troços de Estrada
export type RoadSurfaceType = 'Terra Batida' | 'Macadame' | 'Sub-Base Granular' | 'Base Betuminosa' | 'Betão Asfáltico (Capa)' | 'Pavimento Rígido';
export type RoadSectionStatus = 'Não Iniciado' | 'Desmatação' | 'Terraplanagem' | 'Sub-Base' | 'Base' | 'Imprimação' | 'Pavimentado' | 'Sinalizado' | 'Concluído';

export interface RoadSection {
  id: string;
  code: string; // Ex: TR-01
  name: string; // Ex: Troço Catete - Benguela Lote A
  startStake: string; // Ex: Km 0+000
  endStake: string; // Ex: Km 12+500
  startKm: number; // 0
  endKm: number; // 12.5
  lengthMeters: number; // 12500
  widthMeters: number; // Ex: 10.5
  surfaceType: RoadSurfaceType;
  status: RoadSectionStatus;
  progressPercentage: number; // 0 - 100
  targetCompletionDate?: Timestamp | Date;
  notes?: string;
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 2. Terraplanagem & Movimento de Terras
export type EarthworkOperation = 'Desmatação / Limpeza' | 'Escavação / Corte' | 'Aterro Compactado' | 'Regularização de Leito' | 'Transporte a Bota-Fora';
export type EarthworkMaterial = 'Solo Comum (1ª Categoria)' | 'Solo Rocha Branda (2ª Categoria)' | 'Rocha Viva / Desmonte (3ª Categoria)' | 'Solo de Empréstimo Selecionado';

export interface EarthworkRecord {
  id: string;
  sectionId?: string;
  date: Timestamp | Date;
  stakeLocation: string; // Ex: Km 3+200 - Km 3+650
  operation: EarthworkOperation;
  materialType: EarthworkMaterial;
  volumeM3: number; // Volume em metros cúbicos
  equipmentUsed: string; // Ex: Motoniveladora CAT 140K, Rolo Compactador Dynapac, Escavadora CAT 336
  loadTrips?: number; // Número de carradas / viagens
  borrowPitName?: string; // Nome do bota-fora ou jazigo de empréstimo
  notes?: string;
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 3. Ensaios Geotécnicos & Controlo de Compactação
export type RoadTestType = 'Proctor Modificado' | 'Densidade In Situ (Frasco de Areia)' | 'Massa Volúmica / Densímetro Nuclear' | 'Ensaio CBR (California Bearing Ratio)' | 'Equivalente de Areia' | 'Granulometria por Peneiração' | 'Limites de Atterberg (LL/LP/IP)' | 'Viga Benkelman (Deflexão)';
export type RoadTestStatus = 'Aprovado' | 'Reprovado' | 'Condicional' | 'Em Análise';

export interface CompactionTest {
  id: string;
  testNumber: string; // Ex: ENS-2026-042
  date: Timestamp | Date;
  stakeLocation: string; // Ex: Km 5+120 (Eixo / Esquerda / Direita)
  layerType: 'Leito do Aterro' | 'Sub-Leito' | 'Sub-Base' | 'Base' | 'Solo Natural';
  testType: RoadTestType;
  requiredCompactionDegree: number; // Ex: 95% ou 98% ou 100% AASHTO T-180
  measuredCompactionDegree: number; // Ex: 98.6%
  optimumMoisturePercentage: number; // Ex: 8.2%
  inSituMoisturePercentage: number; // Ex: 7.9%
  cbrValue?: number; // Ex: CBR 60%
  status: RoadTestStatus;
  laboratoryTech: string; // Nome do técnico laboratorista
  certificateUrl?: string; // Link para folha de ensaio assinada
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 4. Obras de Arte Especiais e Correntes (Pontes, Pontões, Valetas, Passagens Hidráulicas)
export type DrainageStructureType = 'Valeta Triangular Revestida' | 'Valeta Trapezoidal' | 'Aqueduto Tubular (PHC)' | 'Passagem Hidráulica Celular (PHC Box)' | 'Pontão de Betão Armado' | 'Ponte Mista / Viga Pré-esforçada' | 'Descida de Águas / Dissipador';
export type StructureStatus = 'Em Escavação' | 'Armadura / Cofragem' | 'Betonagem' | 'Cura / Aterro Contíguo' | 'Concluído';

export interface DrainageStructure {
  id: string;
  code: string; // Ex: PHC-Km4+350 ou PONTE-RIO-DANDE
  name: string; // Ex: Passagem Hidráulica Ø 1500mm
  type: DrainageStructureType;
  stakeLocation: string; // Ex: Km 4+350
  lengthOrSpanMeters: number; // Extensão em metros ou vão
  concreteClass?: string; // C25/30 ou C30/37
  status: StructureStatus;
  progressPercentage: number; // 0 - 100
  notes?: string;
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 5. Pavimentação & Camadas Betuminosas
export type PavingLayerType = 'Sub-Base Granular' | 'Base Britada (BGS)' | 'Imprimação Betuminosa (CM-30)' | 'Rega de Colagem (Emulsão ECR)' | 'Macadame Betuminoso' | 'Betão Asfáltico (Capa de Rolamento BB 0/14)' | 'Micromacadame a Frio';

export interface PavingRecord {
  id: string;
  date: Timestamp | Date;
  startStake: string; // Km 6+000
  endStake: string; // Km 6+800
  lane: 'Via Esquerda' | 'Via Direita' | 'Plena Faixa' | 'Banqueta / Acostamento';
  layerType: PavingLayerType;
  temperatureMixingC?: number; // Temperatura saída central (ex: 160°C)
  temperatureApplicationC?: number; // Temperatura espalhamento (ex: 145°C)
  thicknessCm: number; // Espessura compactada em cm (ex: 5.0 cm)
  areaM2: number; // Área aplicada em m²
  tonnageTons: number; // Toneladas aplicadas
  asphaltPlantSource?: string; // Central fornecedora
  weatherCondition?: string; // Bom, Encoberto, Vento
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 6. Planeamento Linear & Avanço por Estacas (Diagrama Tempo-Caminho / March-Chart)
export type RoadActivityType = 'Desmatação' | 'Escavação / Corte' | 'Aterro' | 'Sub-Base' | 'Base Britada' | 'Imprimação' | 'Capa Asfáltica' | 'Drenagem / Valetas' | 'Sinalização';

export interface LinearScheduleItem {
  id: string;
  activityName: string;
  activityType: RoadActivityType;
  startStake: string; // Ex: Km 0+000
  endStake: string; // Ex: Km 4+500
  startKm: number;
  endKm: number;
  plannedStartDate: Timestamp | Date;
  plannedEndDate: Timestamp | Date;
  actualStartDate?: Timestamp | Date;
  actualEndDate?: Timestamp | Date;
  currentStakeKm?: number; // Estaca atual alcançada
  currentStakeLabel?: string; // Ex: Km 2+850
  plannedDailyRateKm?: number; // Ritmo planeado (km/dia ou m/dia)
  progressPercentage: number;
  teamLeader?: string;
  status: 'Planeado' | 'Em Andamento' | 'Concluído' | 'Atrasado';
  createdAt: Timestamp;
  author: {
    uid: string;
    displayName: string;
  };
}

// 7. Eixos Topográficos & Alinhamentos de Estrada
export interface RoadAlignmentAxis {
  id: string;
  name: string; // Ex: Eixo Principal EN-100
  code: string; // Ex: AX-01
  totalLengthMeters: number;
  designSpeedKmh?: number; // Velocidade de base (ex: 80 km/h)
  startCoords: { north: number; east: number; elevation: number };
  endCoords: { north: number; east: number; elevation: number };
  pviCount?: number; // Pontos de Vértice Vertical
  pvhCount?: number; // Pontos de Vértice Horizontal (Curvas)
  createdAt: Timestamp;
}

