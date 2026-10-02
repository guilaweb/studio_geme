export type ConcreteStrengthClass = 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45' | 'C40/50';
export type SlumpTestClass = 'S1 (10-40mm)' | 'S2 (50-90mm)' | 'S3 (100-150mm)' | 'S4 (160-210mm)';
export type PourStatus = 'Planeada' | 'Em Betonagem' | 'Concluída' | 'Aprovada' | 'Não Conforme';

export interface ConcretePourRecord {
  id: string;
  elementName: string; // Ex: Laje Piso 3, Pilares P1-P12, Sapatas Eixo B
  pourDate: Date;
  volumeM3: number;
  strengthClass: ConcreteStrengthClass;
  slumpTest: SlumpTestClass;
  measuredSlumpMm: number;
  supplier: string;
  batchPlantTicket: string;
  truckPlate: string;
  temperatureC: number;
  weatherCondition: 'Ensolarado' | 'Nublado' | 'Chuva Leve' | 'Vento Forte';
  status: PourStatus;
  cureMethod: 'Água / Aspersão' | 'Membrana Química' | 'Manta Geotêxtil Úmida';
  specimenCount: number; // Qtd de provetes moldados
  results7DaysMpa?: number;
  results28DaysMpa?: number;
  targetStrengthMpa: number; // ex: 30 MPa para C25/30
  responsibleEngineer: string;
  notes?: string;
}
