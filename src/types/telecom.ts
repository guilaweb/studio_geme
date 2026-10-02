import type { Timestamp } from 'firebase/firestore';

export type SiteType = 
    | 'Torre Greenfield' 
    | 'Rooftop' 
    | 'Poste / Monopolo' 
    | 'Indoor / Small Cell';

export type SiteStatus = 
    | 'Planeado' 
    | 'Site Acquisition' 
    | 'Obra Civil' 
    | 'Instalação Telecom' 
    | 'Comissionamento' 
    | 'Ativo' 
    | 'Em Manutenção' 
    | 'Desativado';

export type SitePowerType = 
    | 'Rede Pública (ENDE)' 
    | 'Gerador Diesel' 
    | 'Híbrido Solar-Diesel' 
    | 'Solar Fotovoltaico' 
    | 'Baterias / BESS';

export type EquipmentCategory = 
    | 'Antena RF' 
    | 'RRU' 
    | 'BBU' 
    | 'Micro-ondas (MW)' 
    | 'Roteador / Switch' 
    | 'Gerador' 
    | 'Retificador' 
    | 'Bateria' 
    | 'Climatização' 
    | 'Outro';

export interface SiteEquipment {
    id: string;
    name: string;
    category: EquipmentCategory;
    model?: string;
    serialNumber?: string;
    frequencyBand?: string; // ex: '900 MHz', '1800 MHz', '3.5 GHz (5G)'
    heightMeters?: number; // Altura no mastro/torre
    azimuth?: number; // Azimute em graus (0-360)
    tilt?: number; // Tilt elétrico ou mecânico
    installedAt?: Date | Timestamp;
    status: 'Operacional' | 'Em Teste' | 'Defeituoso' | 'Desmontado';
}

export interface TelecomSite {
    id: string;
    siteId: string; // ex: 'LUA-001', 'BEN-045'
    name: string;
    type: SiteType;
    status: SiteStatus;
    progressPercent?: number; // 0 a 100% de avanço do rollout
    towerHeightMeters?: number;
    operator?: string; // ex: 'Unitel', 'Africell', 'Partilhado (TowerCo)'
    province: string;
    municipality?: string;
    address?: string;
    latitude: number;
    longitude: number;
    altitudeMeters?: number;
    powerType?: SitePowerType;
    targetOnAirDate?: Date | Timestamp;
    actualOnAirDate?: Date | Timestamp;
    equipments?: SiteEquipment[];
    notes?: string;
    wbsItemId?: string | null;
    wbsItemName?: string | null;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
