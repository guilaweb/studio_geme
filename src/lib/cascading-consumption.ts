/**
 * Motor de Cálculos em Cascata (Automação Inteligente de Consumos de Obra).
 * Converte produções físicas declaradas em consumos teóricos de insumos com base em coeficientes de CPU.
 */

export type ProductionItemType = 'betao_estrutural' | 'alvenaria_bloco_15' | 'reboco_argamassa' | 'terraplanagem_escavacao' | 'aco_armaduras' | 'tubagem_pead';

export interface CalculatedInputMaterial {
  materialName: string;
  category: 'Cimento' | 'Inertes / Areia' | 'Brita' | 'Aço' | 'Combustível' | 'Outro';
  calculatedQty: number;
  unit: string;
  estimatedCostAOA: number;
  explanation: string;
}

export interface CascadingConsumptionResult {
  itemType: ProductionItemType;
  declaredQuantity: number;
  unit: string;
  calculatedMaterials: CalculatedInputMaterial[];
  totalEstimatedInputCostAOA: number;
}

export function calculateCascadingConsumption(
  itemType: ProductionItemType,
  quantity: number
): CascadingConsumptionResult {
  const qty = Math.max(0, quantity);
  const materials: CalculatedInputMaterial[] = [];

  switch (itemType) {
    case 'alvenaria_bloco_15': {
      // 100 blocos de 15cm consomem em média:
      // ~1.8 sacos de cimento (90 kg) para argamassa de assentamento 1:4
      // ~0.15 m³ de areia de rio lavada
      const sacosCimento = Math.round((qty * 0.018) * 10) / 10;
      const areiaM3 = Math.round((qty * 0.0015) * 100) / 100;

      materials.push({
        materialName: 'Cimento Portland CP-IV 32.5 (Sacos 50kg)',
        category: 'Cimento',
        calculatedQty: sacosCimento,
        unit: 'sacos (50kg)',
        estimatedCostAOA: sacosCimento * 6500,
        explanation: '0.018 sacos por bloco de 15cm (argamassa de junta 1.5cm traço 1:4)'
      });

      materials.push({
        materialName: 'Areia Lavada de Rio para Argamassa',
        category: 'Inertes / Areia',
        calculatedQty: areiaM3,
        unit: 'm³',
        estimatedCostAOA: areiaM3 * 16000,
        explanation: '0.0015 m³ por bloco assentado'
      });
      break;
    }

    case 'betao_estrutural': {
      // 1 m³ de Betão Estrutural C25/30 consome em média:
      // ~350 kg de Cimento (7 sacos)
      // ~0.45 m³ de Areia de rio lavada
      // ~0.80 m³ de Brita 1 e 2
      // ~180 L de Água
      // ~80 kg de Aço A500 NR (taxa de armadura média para vigas e pilares)
      const sacosCimento = Math.round(qty * 7);
      const areiaM3 = Math.round((qty * 0.45) * 10) / 10;
      const britaM3 = Math.round((qty * 0.80) * 10) / 10;
      const acoKg = Math.round(qty * 80);

      materials.push({
        materialName: 'Cimento Portland CP-II 42.5 (Sacos 50kg)',
        category: 'Cimento',
        calculatedQty: sacosCimento,
        unit: 'sacos (50kg)',
        estimatedCostAOA: sacosCimento * 7200,
        explanation: '350 kg de cimento (~7 sacos) por m³ de betão C25/30'
      });

      materials.push({
        materialName: 'Areia de Rio Lavada',
        category: 'Inertes / Areia',
        calculatedQty: areiaM3,
        unit: 'm³',
        estimatedCostAOA: areiaM3 * 16000,
        explanation: '0.45 m³ de areia fina/média por m³'
      });

      materials.push({
        materialName: 'Brita 1 e 2 (Inerte Grosso)',
        category: 'Brita',
        calculatedQty: britaM3,
        unit: 'm³',
        estimatedCostAOA: britaM3 * 22000,
        explanation: '0.80 m³ de brita graduada por m³'
      });

      materials.push({
        materialName: 'Aço Nervurado A500 NR (Estimativa Média)',
        category: 'Aço',
        calculatedQty: acoKg,
        unit: 'kg',
        estimatedCostAOA: acoKg * 1350,
        explanation: '80 kg de armadura por m³ de betão estrutural'
      });
      break;
    }

    case 'terraplanagem_escavacao': {
      // 100 m³ de escavação mecânica em terra/rocha branda:
      // ~3.5 horas de escavadora 22t
      // ~55 L de Gasóleo (consumo médio ~16 L/h)
      const dieselLiters = Math.round(qty * 0.55);
      const machineHours = Math.round((qty * 0.035) * 10) / 10;

      materials.push({
        materialName: 'Gasóleo / Diesel Rodoviário',
        category: 'Combustível',
        calculatedQty: dieselLiters,
        unit: 'litros',
        estimatedCostAOA: dieselLiters * 300,
        explanation: '0.55 L de gasóleo por m³ escavado (média escavadora 20-24t)'
      });

      materials.push({
        materialName: 'Horas de Operação da Escavadora (Horímetro)',
        category: 'Outro',
        calculatedQty: machineHours,
        unit: 'horas',
        estimatedCostAOA: machineHours * 35000,
        explanation: 'Rendimento operacional de ~28 m³/hora de escavação e carga'
      });
      break;
    }

    case 'reboco_argamassa': {
      // 10 m² de reboco esp. 2cm (traço 1:3):
      // ~1.2 sacos de cimento
      // ~0.08 m³ de areia fina
      const sacosCimento = Math.round((qty * 0.12) * 10) / 10;
      const areiaM3 = Math.round((qty * 0.008) * 100) / 100;

      materials.push({
        materialName: 'Cimento Portland CP-IV 32.5',
        category: 'Cimento',
        calculatedQty: sacosCimento,
        unit: 'sacos (50kg)',
        estimatedCostAOA: sacosCimento * 6500,
        explanation: '0.12 sacos por m² de reboco de 20mm'
      });

      materials.push({
        materialName: 'Areia Fina de Reboco',
        category: 'Inertes / Areia',
        calculatedQty: areiaM3,
        unit: 'm³',
        estimatedCostAOA: areiaM3 * 18000,
        explanation: '0.008 m³ por m² rebocado'
      });
      break;
    }

    case 'aco_armaduras': {
      // Armadura corte e dobra
      materials.push({
        materialName: 'Aço A500 NR Cortado e Quinada',
        category: 'Aço',
        calculatedQty: qty,
        unit: 'kg',
        estimatedCostAOA: qty * 1350,
        explanation: 'Quantidade bruta de aço estrutural'
      });
      materials.push({
        materialName: 'Arame Recozido de Amarração (1.5%)',
        category: 'Outro',
        calculatedQty: Math.round((qty * 0.015) * 10) / 10,
        unit: 'kg',
        estimatedCostAOA: Math.round(qty * 0.015) * 2200,
        explanation: '1.5% do peso da armadura em arame'
      });
      break;
    }

    case 'tubagem_pead': {
      materials.push({
        materialName: 'Tubagem PEAD 100 PN16',
        category: 'Outro',
        calculatedQty: qty,
        unit: 'ml',
        estimatedCostAOA: qty * 16500,
        explanation: 'Metros lineares de tubagem assentada'
      });
      break;
    }
  }

  const totalCost = materials.reduce((acc, m) => acc + m.estimatedCostAOA, 0);

  return {
    itemType,
    declaredQuantity: qty,
    unit: itemType === 'betao_estrutural' || itemType === 'terraplanagem_escavacao' ? 'm³' : itemType === 'alvenaria_bloco_15' || itemType === 'reboco_argamassa' ? 'm²' : itemType === 'aco_armaduras' ? 'kg' : 'ml',
    calculatedMaterials: materials,
    totalEstimatedInputCostAOA: totalCost
  };
}
