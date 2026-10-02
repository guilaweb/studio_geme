'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, ProjectLifecycleStage } from '@/types/project';
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FolderKanban,
  Coins,
  HardHat,
  Activity,
  Archive,
  Loader2,
} from 'lucide-react';

interface ProjectLifecycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  projectId: string;
  onStageUpdated?: (stage: ProjectLifecycleStage) => void;
}

interface StageConfig {
  id: ProjectLifecycleStage;
  label: string;
  icon: typeof FolderKanban;
  color: string;
  description: string;
  checklist: string[];
}

export const LIFECYCLE_STAGES: StageConfig[] = [
  {
    id: 'conception',
    label: '1. Conceção',
    icon: FolderKanban,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    description: 'Definição do escopo preliminar, dados do cliente, localização geográfica e nomeação dos responsáveis-chave.',
    checklist: [
      'Identificação e código do projeto atribuídos',
      'Cliente e fiscalização cadastrados com contactos válidos',
      'Localização do estaleiro definida (Província, Município, GPS)',
      'Diretor de Projeto e Gestor nomeados formalmente',
    ],
  },
  {
    id: 'planning',
    label: '2. Planeamento',
    icon: FolderKanban,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    description: 'Estruturação da EAP/WBS em 4 níveis, cronograma de rede, dependências, folgas e caminho crítico (CPM).',
    checklist: [
      'EAP decomposta em Fases, Subfases e Atividades com códigos',
      'Cronograma com datas de início e fim para cada pacote',
      'Dependências predecessoras e sucessoras configuradas',
      'Caminho crítico (CPM) identificado e linha de base fixada',
    ],
  },
  {
    id: 'budgeting',
    label: '3. Orçamento',
    icon: Coins,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    description: 'Desdobramento em serviços, composições CPU de insumos, fixação da Linha de Base Financeira (BAC) e BDI.',
    checklist: [
      'Quantitativos e preços unitários atribuídos a cada serviço',
      'Composições CPU de materiais, mão de obra e máquinas detalhadas',
      'Orçamento Aprovado (BAC) validado com a direção',
      'Plano de compras e requisições iniciais parametrizados',
    ],
  },
  {
    id: 'execution',
    label: '4. Execução',
    icon: HardHat,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    description: 'Mobilização de frentes de trabalho, apontamentos no Diário de Obra (RDO offline), alocação de equipes e frotas.',
    checklist: [
      'Mobilização de pessoal e equipamentos no terreno iniciada',
      'Diário de Obra Digital (RDO) ativo com registo diário de efetivo',
      'Controlo de consumo real de combustível e insumos ativado',
      'Acompanhamento de avanço físico nos locais de trabalho',
    ],
  },
  {
    id: 'control',
    label: '5. Controlo',
    icon: Activity,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    description: 'Emissão e validação de autos de medição, monitorização da Curva S, indicadores EVA (SPI/CPI) e gestão de riscos.',
    checklist: [
      'Autos de medição contratuais emitidos e conferidos pela fiscalização',
      'Análise de Valor Ganho (EVA: SPI, CPI, EAC) calculada em tempo real',
      'Matriz de Riscos 5x5 atualizada com planos de resposta ativos',
      'Gestão de pendências e não-conformidades de campo sob controlo',
    ],
  },
  {
    id: 'closing',
    label: '6. Encerramento',
    icon: Archive,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
    description: 'Conclusão de 100% dos serviços, acertos financeiros finais, receção provisória/definitiva e arquivo histórico.',
    checklist: [
      '100% das atividades físicas concluídas e aprovadas',
      'Medição final homologada e custos contratuais liquidados',
      'Dossiê As-Built e manuais técnicos entregues ao cliente',
      'Auto de Receção Provisória / Definitiva assinado',
      'Preservação do histórico e lições aprendidas no repositório de benchmarks',
    ],
  },
];

export function ProjectLifecycleModal({
  open,
  onOpenChange,
  project,
  projectId,
  onStageUpdated,
}: ProjectLifecycleModalProps) {
  const { toast } = useToast();
  const currentStageId = (project.lifecycleStage as ProjectLifecycleStage) || 'planning';
  
  const [selectedStage, setSelectedStage] = useState<ProjectLifecycleStage>(currentStageId);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const activeStageConfig = LIFECYCLE_STAGES.find((s) => s.id === selectedStage) || LIFECYCLE_STAGES[0];

  const handleToggleCheck = (index: number) => {
    const key = `${selectedStage}-${index}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveStage = async () => {
    setIsUpdating(true);
    try {
      const projectRef = doc(db, 'projects', projectId);
      
      // Mapeamento de status legado correspondente
      let legacyStatus: Project['status'] = 'Planeamento';
      if (selectedStage === 'conception' || selectedStage === 'planning') {
        legacyStatus = 'Planeamento';
      } else if (selectedStage === 'budgeting' || selectedStage === 'execution') {
        legacyStatus = 'Em Execução';
      } else if (selectedStage === 'control') {
        legacyStatus = 'Em Execução';
      } else if (selectedStage === 'closing') {
        legacyStatus = 'Concluída';
      }

      await updateDoc(projectRef, {
        lifecycleStage: selectedStage,
        status: legacyStatus,
        updatedAt: new Date(),
      });

      toast({
        title: 'Ciclo de Vida Atualizado!',
        description: `O projeto agora encontra-se na fase de "${activeStageConfig.label}".`,
      });

      if (onStageUpdated) onStageUpdated(selectedStage);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao atualizar ciclo de vida:', err);
      toast({
        title: 'Erro na transição',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl font-bold font-headline">
              Gestão do Ciclo de Vida do Projeto
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Acompanhe o projeto desde a conceção até ao encerramento formal e arquivo histórico.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor Visual dos 6 Estágios */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
          {LIFECYCLE_STAGES.map((stg) => {
            const Icon = stg.icon;
            const isSelected = selectedStage === stg.id;
            const isCurrent = currentStageId === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border/60 hover:border-primary/40 bg-card/60'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${stg.color.split(' ')[0]}`} />
                  <span className="text-xs font-bold text-foreground">{stg.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1">{stg.description}</span>
              </button>
            );
          })}
        </div>

        {/* Detalhe e Checklist da Fase Selecionada */}
        <div className="p-4 rounded-xl bg-muted/40 border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{activeStageConfig.label}</span>
                <Badge variant="outline" className={`text-[10px] ${activeStageConfig.color}`}>
                  Etapa Selecionada
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{activeStageConfig.description}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Critérios de Governança & Checklist da Fase:
            </Label>
            <div className="space-y-2">
              {activeStageConfig.checklist.map((item, idx) => {
                const key = `${selectedStage}-${idx}`;
                const checked = checkedItems[key] || false;
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-background/80 border text-xs">
                    <Checkbox
                      id={`check-${key}`}
                      checked={checked}
                      onCheckedChange={() => handleToggleCheck(idx)}
                    />
                    <label htmlFor={`check-${key}`} className="cursor-pointer select-none text-foreground">
                      {item}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Fase Atual: <strong className="text-foreground">{LIFECYCLE_STAGES.find(s => s.id === currentStageId)?.label}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveStage}
              disabled={isUpdating || selectedStage === currentStageId}
              className="font-semibold gap-1.5"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A atualizar...
                </>
              ) : (
                <>
                  Confirmar Transição de Fase <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
