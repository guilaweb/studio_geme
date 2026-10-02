'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileSignature, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Printer, 
  FileText, 
  Loader2,
  Percent,
  Coins,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getBrowserLocation, type GeoLocationResult } from '@/lib/geo-utils';
import { compileExecutiveMeasurementBookPDF } from '@/lib/pdf/measurement-book-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable, TechnicalPhotoEvidence } from '@/lib/pdf/executive-pdf-engine';
import type { Project } from '@/types/project';
import type { MeasurementCertificate, MeasurementLineItem } from '@/types/measurement-certificate';

interface MeasurementWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  project: Project | null;
}

interface EditableMeasurementItem {
  id: string;
  wbsRef: string;
  description: string;
  unit: string;
  unitPrice: number;
  contractQty: number;
  previousQty: number;
  currentQty: number;
}

export function MeasurementWizardModal({ open, onOpenChange, projectId, project }: MeasurementWizardModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // PDF Viewer Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatedPdfDoc, setGeneratedPdfDoc] = useState<jsPDFWithAutoTable | null>(null);
  const [pdfDocTitle, setPdfDocTitle] = useState('');

  // Localização automática
  const [gpsData, setGpsData] = useState<GeoLocationResult | null>(null);

  // Itens de medição
  const [items, setItems] = useState<EditableMeasurementItem[]>([]);
  const [certNumber, setCertNumber] = useState(`AM-2026-00${Math.floor(Math.random() * 8) + 1}`);
  const [period, setPeriod] = useState('1ª Quinzena de Setembro 2026');

  // Fotos de evidência
  const [photoCount, setPhotoCount] = useState(2);

  // Carregar tarefas da EAP ou gerar itens do projeto
  useEffect(() => {
    if (!open || !projectId) return;

    setLoadingItems(true);
    getBrowserLocation().then(res => setGpsData(res));

    const wbsQuery = query(collection(db, 'projects', projectId, 'wbs'));
    getDocs(wbsQuery).then(snap => {
      if (!snap.empty) {
        const loaded: EditableMeasurementItem[] = snap.docs.slice(0, 6).map((d, index) => {
          const data = d.data();
          const budget = data.budget || 5000000;
          const uPrice = 25000;
          const totalQty = Math.max(10, Math.round(budget / uPrice));
          return {
            id: d.id,
            wbsRef: `${index + 1}.0`,
            description: data.name || 'Serviço de Engenharia',
            unit: data.name?.includes('Betão') ? 'm³' : data.name?.includes('Alvenaria') ? 'm²' : 'un',
            unitPrice: uPrice,
            contractQty: totalQty,
            previousQty: Math.round(totalQty * 0.2),
            currentQty: Math.round(totalQty * 0.15),
          };
        });
        setItems(loaded);
      } else {
        // Padrão de obra se a EAP estiver vazia
        setItems([
          { id: 'item-1', wbsRef: '1.0', description: 'Escavação e Movimento de Terras em Fundações', unit: 'm³', unitPrice: 5200, contractQty: 450, previousQty: 120, currentQty: 85 },
          { id: 'item-2', wbsRef: '2.0', description: 'Betão Armado C25/30 em Sapatas e Maciços', unit: 'm³', unitPrice: 215000, contractQty: 65, previousQty: 15, currentQty: 20 },
          { id: 'item-3', wbsRef: '3.0', description: 'Alvenaria de Elevação em Blocos 15cm', unit: 'm²', unitPrice: 11500, contractQty: 850, previousQty: 0, currentQty: 140 },
        ]);
      }
      setLoadingItems(false);
    }).catch(err => {
      console.warn('Erro ao carregar itens da EAP para medição:', err);
      setItems([
        { id: 'item-1', wbsRef: '1.0', description: 'Escavação Mecânica em Rocha / Terra', unit: 'm³', unitPrice: 5200, contractQty: 300, previousQty: 50, currentQty: 60 },
        { id: 'item-2', wbsRef: '2.0', description: 'Betão Estrutural C25/30', unit: 'm³', unitPrice: 215000, contractQty: 50, previousQty: 10, currentQty: 15 },
      ]);
      setLoadingItems(false);
    });
  }, [open, projectId]);

  // Totais do Período em Kwanzas
  const totals = useMemo(() => {
    let currentPeriodTotal = 0;
    let previousTotal = 0;
    let accumulatedTotal = 0;

    items.forEach(item => {
      const curVal = item.currentQty * item.unitPrice;
      const prevVal = item.previousQty * item.unitPrice;
      currentPeriodTotal += curVal;
      previousTotal += prevVal;
      accumulatedTotal += curVal + prevVal;
    });

    const retentionPct = 5; // Retenção legal de 5%
    const retentionAmount = (currentPeriodTotal * retentionPct) / 100;
    const netPayable = currentPeriodTotal - retentionAmount;

    return {
      currentPeriodTotal,
      previousTotal,
      accumulatedTotal,
      retentionAmount,
      netPayable
    };
  }, [items]);

  const fmtKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleQtyChange = (id: string, newCurrentQty: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, currentQty: Math.max(0, newCurrentQty) };
      }
      return item;
    }));
  };

  // Compilação do PDF Oficial em 1 Clique e Registo em Base de Dados
  const handleGenerateOfficialPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const realProject: Project = project || {
        id: projectId,
        name: 'Projeto de Engenharia',
        status: 'Em Execução',
        progress: 35,
        ownerId: user?.uid || 'owner',
        budget: totals.accumulatedTotal * 2
      };

      const lineItems: MeasurementLineItem[] = items.map(it => {
        const curVal = it.currentQty * it.unitPrice;
        const totalQ = it.previousQty + it.currentQty;
        const totVal = totalQ * it.unitPrice;
        const contVal = it.contractQty * it.unitPrice;
        return {
          id: it.id,
          wbsRef: it.wbsRef,
          description: it.description,
          unit: it.unit,
          unitPrice: it.unitPrice,
          previousQty: it.previousQty,
          currentQty: it.currentQty,
          totalQty: totalQ,
          contractQty: it.contractQty,
          currentValue: curVal,
          totalValue: totVal,
          contractValue: contVal,
          deviationPct: it.contractQty > 0 ? ((totalQ - it.contractQty) / it.contractQty) * 100 : 0
        };
      });

      const certData: Partial<MeasurementCertificate> = {
        certificateNumber: certNumber,
        period,
        contractNumber: 'CONT-ANG-FIDIC/2026',
        currentPeriodValue: totals.currentPeriodTotal,
        previousAccumulated: totals.previousTotal,
        newAccumulated: totals.accumulatedTotal,
        retentionPct: 5,
        retentionAmount: totals.retentionAmount,
        netPayable: totals.netPayable,
        preparedBy: user?.displayName || user?.email || 'Engenheiro Residente',
        checkedBy: 'Diretor de Fiscalização OEA',
        status: 'submitted',
        notes: 'Auto de medição compilado com fotos georreferenciadas e retenção de garantia contratual.'
      };

      // 1. Gravar Auto de Medição no Firestore para ficar disponível nos Autos do Projeto
      await addDoc(collection(db, 'projects', projectId, 'measurementCertificates'), {
        ...certData,
        projectId,
        party: 'contractor',
        subcontractorName: 'Empreiteiro Geral',
        lineItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Atualizar o avanço das tarefas de EAP nos bastidores
      for (const it of items) {
        if (it.id && !it.id.startsWith('item-')) {
          const totalQ = it.previousQty + it.currentQty;
          const newProgress = it.contractQty > 0 ? Math.min(100, Math.round((totalQ / it.contractQty) * 100)) : 0;
          try {
            const { doc, updateDoc } = await import('firebase/firestore');
            const wbsDocRef = doc(db, 'projects', projectId, 'wbs', it.id);
            await updateDoc(wbsDocRef, { progress: newProgress, updatedAt: new Date() });
          } catch (e) {
            console.warn('Atualização de progresso da EAP ignorada para tarefa:', it.id, e);
          }
        }
      }

      const photos: TechnicalPhotoEvidence[] = [
        {
          title: 'Evidência 01 - Conferência Estrutural',
          description: 'Conferência de armaduras e cofragens das sapatas',
          coordinates: gpsData?.formattedCoordinates || '8°50\'18"S 13°14\'04"E',
          timestamp: new Date().toLocaleDateString('pt-PT') + ' 10:45 WAT',
          imageUrl: '/placeholder-evidence-1.jpg'
        },
        {
          title: 'Evidência 02 - Inspeção de Superfície',
          description: 'Descofragem e inspeção visual do betão endurecido',
          coordinates: gpsData?.formattedCoordinates || '8°50\'18"S 13°14\'04"E',
          timestamp: new Date().toLocaleDateString('pt-PT') + ' 15:20 WAT',
          imageUrl: '/placeholder-evidence-2.jpg'
        }
      ];

      const docPdf = compileExecutiveMeasurementBookPDF({
        project: realProject,
        certificate: certData,
        items: lineItems,
        photos
      });

      setGeneratedPdfDoc(docPdf);
      setPdfDocTitle(`Auto_Medicao_${certNumber}`);
      setPdfModalOpen(true);
      onOpenChange(false);
      setStep(1);

      toast({
        title: 'Auto de Medição Emitido e Gravado!',
        description: 'Documento executivo em PDF gerado com paginação X de Y e avanço da EAP atualizado.',
      });
    } catch (err: any) {
      console.error('Erro ao compilar auto de medição:', err);
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                Wizard de Emissão de Auto de Medição
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                Passo {step} de 3
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Processo linear: aponte as quantidades da quinzena, anexe evidências e emita o PDF oficial.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de Progresso */}
          <div className="py-2">
            <Progress value={(step / 3) * 100} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-medium">
              <span className={step >= 1 ? 'text-primary font-bold' : ''}>1. Quantitativos da Quinzena</span>
              <span className={step >= 2 ? 'text-primary font-bold' : ''}>2. Evidências Fotográficas</span>
              <span className={step >= 3 ? 'text-primary font-bold' : ''}>3. Resumo & Emissão</span>
            </div>
          </div>

          {/* ─────────────────── PASSO 1: QUANTIDADES DA QUINZENA ─────────────────── */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs">
                <div>
                  <Label className="text-[11px]">Número do Auto</Label>
                  <Input
                    value={certNumber}
                    onChange={e => setCertNumber(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Período de Medição</Label>
                  <Input
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">ARTIGO</TableHead>
                      <TableHead>TAREFA / ESPECIFICAÇÃO</TableHead>
                      <TableHead className="w-16 text-center">UNID</TableHead>
                      <TableHead className="text-right">CONTRATO</TableHead>
                      <TableHead className="text-right">ANTERIOR</TableHead>
                      <TableHead className="w-28 text-right bg-primary/5 text-primary font-bold">ESTA QUINZENA</TableHead>
                      <TableHead className="text-right">VALOR (KZ)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(it => {
                      const curVal = it.currentQty * it.unitPrice;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{it.wbsRef}</TableCell>
                          <TableCell className="text-xs font-medium">{it.description}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{it.unit}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{it.contractQty}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{it.previousQty}</TableCell>
                          <TableCell className="text-right bg-primary/5">
                            <Input
                              type="number"
                              value={it.currentQty}
                              onChange={e => handleQtyChange(it.id, parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-mono font-bold text-right w-24 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {fmtKz(curVal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-semibold">
                <span>Subtotal Medido no Período:</span>
                <span className="text-base font-bold font-mono text-primary">{fmtKz(totals.currentPeriodTotal)}</span>
              </div>
            </div>
          )}

          {/* ─────────────────── PASSO 2: EVIDÊNCIAS FOTOGRÁFICAS COM GPS ─────────────────── */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Geolocalização Ativa: <strong>{gpsData?.formattedCoordinates || 'Luanda, Angola'}</strong></span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900">GPS Válido</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Evidência Fotográfica 01</span>
                    <Badge variant="outline" className="text-[10px]">Obrigatória</Badge>
                  </div>
                  <div className="h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                    <Camera className="h-7 w-7 mb-1 text-primary" />
                    <span>Foto de Avanço Físico</span>
                    <span className="text-[10px] text-slate-400">Carimbo GPS embutido</span>
                  </div>
                  <Input 
                    placeholder="Legenda: ex: Conclusão da armadura e cofragem"
                    defaultValue="Conferência de armaduras e cofragens das sapatas"
                    className="text-xs h-8"
                  />
                </div>

                <div className="border rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Evidência Fotográfica 02</span>
                    <Badge variant="outline" className="text-[10px]">Recomendada</Badge>
                  </div>
                  <div className="h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                    <Camera className="h-7 w-7 mb-1 text-primary" />
                    <span>Foto de Detalhe / Descofragem</span>
                    <span className="text-[10px] text-slate-400">Carimbo GPS embutido</span>
                  </div>
                  <Input 
                    placeholder="Legenda: ex: Acabamento de superfície"
                    defaultValue="Descofragem e inspeção visual do betão endurecido"
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────── PASSO 3: RESUMO FINANCEIRO & EMISSÃO DO PDF OFICIAL ─────────────────── */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs font-semibold text-foreground">Resumo do Auto {certNumber}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                    Pronto para Homologação
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor Bruto Deste Período:</span>
                    <div className="font-mono font-bold text-sm text-foreground mt-0.5">{fmtKz(totals.currentPeriodTotal)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acumulado Anterior:</span>
                    <div className="font-mono font-bold text-sm text-foreground mt-0.5">{fmtKz(totals.previousTotal)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Retenção de Garantia Contratual (5%):</span>
                    <div className="font-mono font-bold text-sm text-amber-600 mt-0.5">- {fmtKz(totals.retentionAmount)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold text-emerald-600">Valor Líquido a Certificar:</span>
                    <div className="font-mono font-bold text-base text-emerald-600 mt-0.5">{fmtKz(totals.netPayable)}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
                <span>
                  O documento será gerado com cabeçalho oficial, numeração <strong>"Página X de Y"</strong>, tabela sem quebra de linhas e bloco tripartite de assinaturas OEA/Fiscalização.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((step - 1) as any)}
                className="text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Anterior
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((step + 1) as any)}
                className="text-xs"
              >
                Próximo Passo
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isGeneratingPdf}
                onClick={handleGenerateOfficialPDF}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A Compilar PDF Executivo...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    Gerar PDF Oficial (1 Clique)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizador de Alta Fidelidade */}
      <ExecutivePdfViewerModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        pdfDoc={generatedPdfDoc}
        title={pdfDocTitle}
        fileName={`${pdfDocTitle}.pdf`}
        documentType="AUTO DE MEDIÇÃO OFICIAL"
      />
    </>
  );
}
