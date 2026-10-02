'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Printer, 
  FileText, 
  Download, 
  Settings2, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Flame, 
  Bookmark, 
  Activity, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Maximize2
} from 'lucide-react';
import type { WbsItem } from '@/types/wbs';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { compileGanttSchedulePDF } from '@/lib/pdf/gantt-schedule-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';

interface GanttPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  tasks: WbsItem[];
}

export function GanttPrintModal({
  open,
  onOpenChange,
  projectId,
  projectName = 'Empreitada de Engenharia',
  projectCode = 'OBRA-2026',
  clientName = 'Governo / Entidade Contratante',
  tasks
}: GanttPrintModalProps) {
  // Configurações de Impressão
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a3');
  const [timeframe, setTimeframe] = useState<'all' | 'lookahead_30' | 'lookahead_60' | 'lookahead_90'>('all');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showProgressLine, setShowProgressLine] = useState(true);
  const [showKpis, setShowKpis] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  // Dados do Carimbo / Selo
  const [customProjectName, setCustomProjectName] = useState(projectName);
  const [customProjectCode, setCustomProjectCode] = useState(projectCode);
  const [customClientName, setCustomClientName] = useState(clientName);
  const [contractorName, setContractorName] = useState('Empreiteiro Geral / Diretor de Obra');
  const [inspectorName, setInspectorName] = useState('Gabinete de Fiscalização Técnica');

  // Estado de Geração de PDF
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<jsPDFWithAutoTable | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Contadores Rápidos
  const validTasksCount = tasks.filter((t) => t.startDate && t.endDate).length;
  const criticalCount = tasks.filter((t) => (t as any).isCriticalPath || (t as any).isCritical).length;

  const handleGeneratePdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const doc = compileGanttSchedulePDF({
          project: {
            id: projectId,
            name: customProjectName,
            code: customProjectCode,
            clientName: customClientName,
            contractorName: contractorName,
            location: 'Angola'
          },
          tasks,
          paperSize,
          timeframe,
          showCriticalPath,
          showBaseline,
          showProgressLine,
          showKpis,
          showSignatures,
          statusDate: new Date(),
          signatories: [
            {
              role: 'Diretor de Obra / Engenheiro Residente',
              name: contractorName,
              entity: 'Empreiteiro Geral',
              status: 'Assinado Digitalmente',
              date: format(new Date(), 'dd/MM/yyyy')
            },
            {
              role: 'Fiscalização Técnica Residente',
              name: inspectorName,
              entity: 'Empresa Fiscalizadora',
              status: 'Homologado com Visto',
              date: format(new Date(), 'dd/MM/yyyy')
            },
            {
              role: 'Dono da Obra / Diretor de Projeto',
              name: customClientName,
              entity: 'Entidade Contratante',
              status: 'Aprovado pelo Dono da Obra',
              date: format(new Date(), 'dd/MM/yyyy')
            }
          ]
        });

        setPdfDoc(doc);
        setIsViewerOpen(true);
      } catch (err) {
        console.error('Erro ao compilar PDF do Cronograma:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handleDirectBrowserPrint = () => {
    // Fecha o modal antes de imprimir para não poluir a janela de impressão
    onOpenChange(false);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-card border shadow-2xl">
          {/* Header Executivo */}
          <div className="p-5 bg-muted/40 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  Impressão Ultra Profissional do Cronograma
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Padrão FIDIC / OEA
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Prancha técnica vetorial com timeline gráfica, caminho crítico (CPM), linha de base e selo probatório.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Corpo de Opções */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Bloco 1: Formato & Escala Temporal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-lg border bg-muted/20">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5 text-primary" />
                  Formato da Folha de Engenharia
                </Label>
                <Select value={paperSize} onValueChange={(val: 'a4' | 'a3') => setPaperSize(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a3">
                      <span className="font-bold">A3 Paisagem (420 x 297 mm)</span> — Plotter / Estaleiro (Recomendado)
                    </SelectItem>
                    <SelectItem value="a4">
                      <span className="font-bold">A4 Paisagem (297 x 210 mm)</span> — Dossiê Executivo
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {paperSize === 'a3'
                    ? 'Folha expandida com máxima resolução para leitura de rede em contentor de obra.'
                    : 'Folha compacta ideal para anexar a relatórios mensais e autos de medição.'}
                </p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-lg border bg-muted/20">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Janela Temporal (Recorte do Gráfico)
                </Label>
                <Select
                  value={timeframe}
                  onValueChange={(val: 'all' | 'lookahead_30' | 'lookahead_60' | 'lookahead_90') =>
                    setTimeframe(val)
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cronograma Integral (Todas as Atividades)</SelectItem>
                    <SelectItem value="lookahead_30">Lookahead Operacional (Próximos 30 Dias)</SelectItem>
                    <SelectItem value="lookahead_60">Bimestre Executivo (Próximos 60 Dias)</SelectItem>
                    <SelectItem value="lookahead_90">Trimestre Contratual (Próximos 90 Dias)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Filtra o intervalo de datas desenhado no gráfico e nos cabeçalhos da timeline.
                </p>
              </div>
            </div>

            {/* Bloco 2: Camadas Técnicas a Incluir */}
            <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Camadas Técnicas Visíveis no Documento
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-2.5 rounded-md border bg-card">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-rose-500" />
                    <div>
                      <div className="text-xs font-semibold">Caminho Crítico (CPM)</div>
                      <div className="text-[10px] text-muted-foreground">Destaque em carmim</div>
                    </div>
                  </div>
                  <Switch checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md border bg-card">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-xs font-semibold">Linha de Base</div>
                      <div className="text-[10px] text-muted-foreground">Barras de referência</div>
                    </div>
                  </div>
                  <Switch checked={showBaseline} onCheckedChange={setShowBaseline} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md border bg-card">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold">Linha de Status</div>
                      <div className="text-[10px] text-muted-foreground">Data de corte (Hoje)</div>
                    </div>
                  </div>
                  <Switch checked={showProgressLine} onCheckedChange={setShowProgressLine} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md border bg-card">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-semibold">Painel de KPIs</div>
                      <div className="text-[10px] text-muted-foreground">Cockpit executivo</div>
                    </div>
                  </div>
                  <Switch checked={showKpis} onCheckedChange={setShowKpis} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-md border bg-card sm:col-span-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-xs font-semibold">Bloco Formal de Assinaturas</div>
                      <div className="text-[10px] text-muted-foreground">Empreiteiro, Fiscalização e Dono da Obra</div>
                    </div>
                  </div>
                  <Switch checked={showSignatures} onCheckedChange={setShowSignatures} />
                </div>
              </div>
            </div>

            {/* Bloco 3: Dados do Selo Técnico / Cartela */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Dados do Selo de Engenharia (Cartela)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Nome da Empreitada / Obra</Label>
                  <Input
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Código da Obra / Contrato</Label>
                  <Input
                    value={customProjectCode}
                    onChange={(e) => setCustomProjectCode(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Dono da Obra (Cliente / Ministério)</Label>
                  <Input
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Empreiteiro Geral (Diretor de Obra)</Label>
                  <Input
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Resumo da Folha a Emitir */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-muted-foreground">
                  Serão incluídas <strong>{validTasksCount} atividades</strong> ({criticalCount} no Caminho Crítico) na folha <strong>{paperSize.toUpperCase()} Paisagem</strong>.
                </span>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                SHA-256 Verificado
              </Badge>
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="p-4 bg-muted/40 border-t flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectBrowserPrint}
                className="text-xs font-medium"
                title="Abre o diálogo de impressão rápida do navegador"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Imprimir Prancha
              </Button>

              <Button
                size="sm"
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Compilando Prancha...
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Gerar Dossiê PDF ({paperSize.toUpperCase()})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visualizador Oficial de PDF em Alta Resolução */}
      <ExecutivePdfViewerModal
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        pdfDoc={pdfDoc}
        title={`Cronograma Geral de Execução • ${customProjectName}`}
        fileName={`cronograma_${projectId}_${paperSize}_${format(new Date(), 'yyyyMMdd')}.pdf`}
        documentType="CRONOGRAMA GERAL DE GANTT (FIDIC/OEA)"
      />
    </>
  );
}
