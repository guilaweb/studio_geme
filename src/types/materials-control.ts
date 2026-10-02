// Types for Materials Quality Control Module (Controlo de Materiais)

export type MaterialCategory = 'concrete' | 'steel' | 'cement' | 'aggregate' | 'admixture' | 'waterproofing' | 'other';
export type MaterialTestResult = 'approved' | 'rejected' | 'pending' | 'conditional';
export type DeliveryStatus = 'received' | 'quarantined' | 'approved' | 'rejected' | 'consumed';

export interface MaterialDelivery {
  id: string;
  projectId: string;
  deliveryNumber: string;       // e.g. "DL-2025-018"
  deliveryDate: string;
  category: MaterialCategory;
  materialName: string;         // e.g. "Cimento Portland CEM I 42.5R"
  supplier: string;
  quantity: number;
  unit: string;                 // ton, m³, kg, m², un
  batchNumber: string;          // lote
  deliveryNoteNumber: string;   // guia de remessa
  // Technical specs
  specReference: string;        // e.g. "NP EN 197-1"
  designValue: string;          // e.g. "42.5 MPa"
  measuredValue?: string;       // actual test result
  // Test info
  testRequired: boolean;
  testSentToLab: boolean;
  labName?: string;
  testDate?: string;
  testResult: MaterialTestResult;
  certificateNumber?: string;   // boletim de ensaio
  // Status
  deliveryStatus: DeliveryStatus;
  quarantineReason?: string;
  receivedBy: string;
  checkedBy?: string;
  notes: string;
  createdAt: string;
}

export interface MaterialTestRecord {
  id: string;
  projectId: string;
  deliveryId: string;
  materialName: string;
  testType: string;             // e.g. "Resistência à compressão 28d", "Ensaio de tracção"
  labName: string;
  sampleDate: string;
  testDate: string;
  reportNumber: string;
  specValue: string;
  measuredValue: string;
  unit: string;
  result: MaterialTestResult;
  notes: string;
  createdAt: string;
}
