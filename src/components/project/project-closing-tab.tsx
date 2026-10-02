'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types/project';
import {
  Archive,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Coins,
  ShieldCheck,
  FileSignature,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ProjectClosingTabProps {
  projectId: string;
  project: Project;
  onNavigateTab?: (tab: string) => void;
}

interface ClosingStep {
  id: string;
  num: string;
  title: string;
  description: string;
  requiredRole: string;
}

const CLOSING_STEPS: ClosingStep[] = [
  {
    id: 'exec_completed',
    num: '01',
    title: 'Execução 100% Concluída',
    description: 'Todas as atividades da EAP e pacotes de trabalho marcados como concluídos no estaleiro.',
    requiredRole: 'Diretor de Obra',
  },
  {
    id: 'final_measurements',
    num: '02',
    title: 'Autos de Medição Finais Homologados',
    description: 'Auto final de medição emitido, conferido pela fiscalização e sem divergências de quantidades.',
    requiredRole: 'Fiscal da Obra',
  },
  {
    id: 'final_costs',
    num: '03',
    title: 'Custos Finais e Fecho de Faturas',
    description: 'Confronto final Orçado vs. Real (AC), liquidação de retenções de garantia e fornecedores.',
    requiredRole: 'Responsável Financeiro',
  },
  {
    id: 'punchlist_resolved',
    num: '04',
    title: 'Pendências & Punch List Resolvidas',
    description: 'Vistoria minuciosa de defeitos realizada com 100% das não conformidades sanadas.',
    requiredRole: 'Engenheiro de Qualidade',
  },
  {
    id: 'as_built_docs',
    num: '05',
    title: 'Dossiê Técnico As-Built Entregue',
    description: 'Plantas atualizadas conforme construído, telas finais e manuais de operação depositados.',
    requiredRole: 'Gestor Documental',
  },
  {
    id: 'acceptance_certificate',
    num: '06',
    title: 'Auto de Receção Provisória / Definitiva',
    description: 'Termo de aceitação formal assinado entre o Dono da Obra, Fiscalização e Empreiteiro.',
    requiredRole: 'Dono da Obra / Fiscal',
  },
  {
    id: 'formal_close',
    num: '07',
    title: 'Encerramento Formal do Contrato',
    description: 'Desmobilização total do estaleiro, encerramento de apólices de seguro e cauções.',
    requiredRole: 'Diretoria Executiva',
  },
  {
    id: 'historical_archive',
    num: '08',
    title: 'Arquivo Histórico & Banco de Benchmarks',
    description: 'O projeto permanece intacto para consulta e comparação de custos e produtividades futuras.',
    requiredRole: 'Sistema Profundidade',
  },
];

export function ProjectClosingTab({ projectId, project, onNavigateTab }: ProjectClosingTabProps) {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(
    project.closingChecklist || {}
  );
  const [archiveNotes, setArchiveNotes] = useState(project.archiveNotes || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const isArchived = Boolean(project.isArchived);

  const completedCount = CLOSING_STEPS.filter((s) => checklist[s.id]).length;
  const isAllReady = completedCount === CLOSING_STEPS.length;

  const handleToggleStep = async (stepId: string) => {
    const updated = { ...checklist, [stepId]: !checklist[stepId] };
    setChecklist(updated);

    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        closingChecklist: updated,
      });
    } catch (err: any) {
      console.error('Erro ao atualizar checklist:', err);
    }
  };

  const handleConfirmArchive = async () => {
    setIsUpdating(true);
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        isArchived: true,
        lifecycleStage: 'closing',
        status: 'Encerrado',
        archiveNotes,
        acceptanceDate: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: 'Projeto Encerrado & Arquivado no Repositório Histórico!',
        description: 'Os dados foram preservados para análise de produtividade e benchmarks futuros.',
      });
    } catch (err: any) {
      console.error('Erro ao arquivar:', err);
      toast({
        title: 'Erro ao Arquivar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header com Estado de Arquivo */}
      <div className="bg-card border p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                isArchived
                  ? 'bg-slate-500/10 text-slate-600 border-slate-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              {isArchived ? 'PROJETO ENCERRADO & NO ARQUIVO HISTÓRICO' : 'FLUXO DE ENCERRAMENTO CONTRATUAL'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {completedCount} de 8 Etapas
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-headline mt-1">Encerramento, Aceitação & Arquivo Histórico</h2>
          <p className="text-xs text-muted-foreground">
            O projeto não desaparece: após a aceitação formal, os dados permanecem acessíveis para benchmarking corporativo e auditorias.
          </p>
        </div>

        {isArchived ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Preservado para Análise Histórica</span>
          </div>
        ) : (
          <Button
            onClick={handleConfirmArchive}
            disabled={!isAllReady || isUpdating}
            className="font-semibold gap-2 shadow-sm"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> A formalizar...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Formalizar Encerramento
              </>
            )}
          </Button>
        )}
      </div>

      {/* Lista das 8 Etapas do Encerramento */}
      <div className="grid md:grid-cols-2 gap-4">
        {CLOSING_STEPS.map((step) => {
          const isDone = Boolean(checklist[step.id]);
          return (
            <Card
              key={step.id}
              className={`border transition-all ${
                isDone ? 'bg-muted/20 border-emerald-500/40 shadow-sm' : 'bg-card'
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3.5">
                <Checkbox
                  id={`step-${step.id}`}
                  checked={isDone}
                  disabled={isArchived}
                  onCheckedChange={() => handleToggleStep(step.id)}
                  className="mt-1"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`step-${step.id}`}
                      className="text-xs font-bold font-headline cursor-pointer select-none text-foreground flex items-center gap-2"
                    >
                      <span className="font-mono text-muted-foreground">{step.num}.</span>
                      <span>{step.title}</span>
                    </label>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                      {step.requiredRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lições Aprendidas & Notas do Arquivo Histórico */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Lições Aprendidas & Benchmarks para Futuros Projetos
          </CardTitle>
          <CardDescription className="text-xs">
            Registe o resumo de produtividade, gargalos enfrentados e desvios de custos para alimentar a inteligência de propostas futuras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={archiveNotes}
            onChange={(e) => setArchiveNotes(e.target.value)}
            disabled={isArchived}
            placeholder="Ex.: A produtividade média de assentamento de blocos foi de 14m²/dia. O custo de combustível teve desvio devido à pendente da rampa. Recomendado prever coeficiente 1.15 nas próximas licitações no Namibe..."
            className="min-h-[100px] text-xs leading-relaxed"
          />
          {!isArchived && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ref = doc(db, 'projects', projectId);
                  await updateDoc(ref, { archiveNotes });
                  toast({ title: 'Notas de Benchmark Gravadas!' });
                }}
                className="text-xs"
              >
                Guardar Notas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
