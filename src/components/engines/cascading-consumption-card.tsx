'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  CheckCircle2, 
  Package, 
  Fuel, 
  ArrowRight, 
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { calculateCascadingConsumption, type ProductionItemType, type CascadingConsumptionResult } from '@/lib/cascading-consumption';

interface CascadingConsumptionCardProps {
  itemType: ProductionItemType;
  quantity: number;
  onConfirm?: (result: CascadingConsumptionResult, wastePct: number) => void;
}

export function CascadingConsumptionCard({ itemType, quantity, onConfirm }: CascadingConsumptionCardProps) {
  const [wastePct, setWastePct] = useState(5); // 5% de sobra/perda padrão em obra
  const [confirmed, setConfirmed] = useState(false);

  const baseResult = calculateCascadingConsumption(itemType, quantity);

  // Aplica percentual de perda/sobra nos insumos
  const adjustedMaterials = baseResult.calculatedMaterials.map(mat => {
    const factor = 1 + (wastePct / 100);
    const adjustedQty = Math.round((mat.calculatedQty * factor) * 10) / 10;
    return {
      ...mat,
      calculatedQty: adjustedQty,
      estimatedCostAOA: Math.round(mat.estimatedCostAOA * factor)
    };
  });

  const totalCost = adjustedMaterials.reduce((acc, m) => acc + m.estimatedCostAOA, 0);

  const fmtKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    if (onConfirm) {
      onConfirm({
        ...baseResult,
        calculatedMaterials: adjustedMaterials,
        totalEstimatedInputCostAOA: totalCost
      }, wastePct);
    }
  };

  if (quantity <= 0) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Consumo Teórico Calculado Automaticamente
          </CardTitle>
          <Badge variant="outline" className="bg-white dark:bg-slate-900 text-[10px] border-blue-300">
            Automação em Cascata
          </Badge>
        </div>
        <CardDescription className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
          Com base na CPU, para <strong>{quantity} {baseResult.unit}</strong> de produção, o consumo estimado de materiais é:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {adjustedMaterials.map((mat, idx) => (
            <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground text-xs">{mat.materialName}</div>
                <div className="text-[10px] text-muted-foreground">{mat.explanation}</div>
              </div>
              <div className="text-right ml-2 shrink-0">
                <div className="font-mono font-bold text-xs text-primary">{mat.calculatedQty} {mat.unit}</div>
                <div className="text-[10px] text-muted-foreground">{fmtKz(mat.estimatedCostAOA)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">Sobra/Perda Teórica:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setWastePct(pct)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    wastePct === pct ? 'bg-primary text-primary-foreground font-bold' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-foreground">
              Total Insumos: {fmtKz(totalCost)}
            </span>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={confirmed}
              className={`h-7 text-xs ${confirmed ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-primary hover:bg-primary/90'}`}
            >
              {confirmed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Consumo Confirmado
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Confirmar Consumo
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
