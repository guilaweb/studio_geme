
import type { Timestamp } from 'firebase/firestore';

export type MiningMaterialType = 'Minério' | 'Estéril' | 'Sub-económico';

export interface ProductionLog {
    id: string;
    date: Date;
    shift: 'Dia' | 'Noite';
    material: string; // e.g., 'Minério de Ferro', 'Estéril Kimberlítico'
    materialType?: MiningMaterialType;
    tonnage: number;
    wasteTonnage?: number; // Estéril associado
    oreTonnage?: number; // Minério líquido associado
    grade?: number; // e.g., teor de Fe em % ou ct/100t
    density?: number; // densidade em t/m³
    volume?: number; // volume em m³
    pitBench?: string; // ex: 'Bancada +450m', 'Frente Norte Cava 1'
    operationHours?: number;
    sourceLocation: string; // e.g., 'Frente de Lavra A-02'
    destination: string; // e.g., 'Stockpile Alta Lei', 'Britador Primário', 'Bota-Fora Sul'
    notes?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
    // Relations
    team?: { id: string, name: string }[];
    equipment?: { id: string, name: string, equipmentId: string }[];
    wbsItemId?: string | null;
    wbsItemName?: string | null;
}

export type ConcessionStatus = 'Ativa' | 'Expirada' | 'Em Renovação' | 'Pendente';
export type MiningMethod = 'Céu Aberto' | 'Subterrânea' | 'Aluvionar' | 'Quimberlito';

export interface Concession {
    id: string;
    name: string;
    licenseNumber?: string; // ex: 'ALV-MIREMPET-2025/089'
    issuingAuthority?: string; // ex: 'MIREMPET / ANRM'
    mineralType: string;
    province: string;
    area: number; // in km²
    holder: string; // Titular da concessão
    miningMethod?: MiningMethod;
    coordinates?: string; // Delimitação geográfica
    legalStatus: ConcessionStatus;
    validityStart: Date;
    validityEnd: Date;
    fileUrl?: string;
    fileName?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

// TYPES FOR TRACEABILITY & KIMBERLEY PROCESS
export interface LotMovement {
    date: Timestamp;
    location: string;
    notes?: string;
    author: { uid: string; displayName: string };
}

export type LotStatus = 'Em Processamento' | 'Classificado' | 'Pronto para Venda' | 'Vendido' | 'Exportado';

export interface Lot {
    id: string;
    lotNumber: string;
    material: string;
    materialType?: MiningMaterialType;
    initialQuantity: number;
    currentQuantity: number;
    unit: 't' | 'kg' | 'ct';
    status: LotStatus;
    origin: string;
    history: LotMovement[];
    // Kimberley Process & Critical Minerals Compliance
    kimberleyProcessId?: string; // Certificado Kimberley (ex: 'AO-KP-2026-00412')
    sealNumber?: string; // Selo de segurança inviolável do contentor
    carats?: number; // Quilates para diamantes e gemas
    estimatedValueUSD?: number; // Valor estimado em USD
    estimatedValueAOA?: number; // Valor estimado em AOA
    gemClassification?: string; // ex: 'Gemas Especiais (+10.8 ct)', 'Run of Mine', 'Industrial'
    exportDestinationCountry?: string; // ex: 'Bélgica (Antuérpia)', 'EAU (Dubai)'
    issuerEntity?: string; // ex: 'Conselho Nacional de Diamantes de Angola / SODIAM'
    createdAt: Timestamp;
    author: { uid: string; displayName: string };
}
