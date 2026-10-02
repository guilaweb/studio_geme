'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Printer, 
  Download, 
  Briefcase, 
  BookOpen, 
  CheckCircle, 
  Camera, 
  Layers, 
  TrendingUp,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  MeasurementBookReport, 
  ExecutiveBoardDossier, 
  DigitalAsBuiltBook 
} from '@/lib/engines/document-automation-engine';
import { documentAutomationEngine } from '@/lib/engines/document-automation-engine';
import { compileExecutiveMeasurementBookPDF } from '@/lib/pdf/measurement-book-pdf';
import { compileExecutiveBoardDossierPDF } from '@/lib/pdf/technical-reports-pdf';
import { ExecutivePdfViewerModal } from '@/components/pdf/executive-pdf-viewer-modal';
import type { jsPDFWithAutoTable } from '@/lib/pdf/executive-pdf-engine';

interface DocumentAutomationTabProps {
  projectId: string;
  project?: any;
  wbsItems?: any[];
  transactions?: any[];
  risks?: any[];
}

export function DocumentAutomationTab({ 
  projectId, 
  project, 
  wbsItems = [], 
  transactions = [], 
  risks = [] 
}: DocumentAutomationTabProps) {
  const [activeDoc, setActiveDoc] = useState<'MEASUREMENT' | 'BOARD_DOSSIER' | 'AS_BUILT'>('MEASUREMENT');

  const measurementBook = useMemo<MeasurementBookReport>(() => 
    documentAutomationEngine.generateMeasurementBook(projectId, 1, project, wbsItems),
    [projectId, project, wbsItems]
  );

  const boardDossier = useMemo<ExecutiveBoardDossier>(() => 
    documentAutomationEngine.generateExecutiveBoardDossier(projectId, project, wbsItems, transactions, risks),
    [projectId, project, wbsItems, transactions, risks]
  );

  const asBuiltBook = useMemo<DigitalAsBuiltBook>(() => 
    documentAutomationEngine.generateDigitalAsBuiltBook(projectId, project),
    [projectId, project]
  );

  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val).replace('AOA', 'Kz');
  };

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activePdfDoc, setActivePdfDoc] = useState<jsPDFWithAutoTable | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerFileName, setViewerFileName] = useState('');
  const [viewerDocType, setViewerDocType] = useState('DOCUMENTO TÉCNICO OFICIAL');

  const handlePrint = () => {
    const projData = project || { name: 'Obra Principal', id: projectId };

    if (activeDoc === 'MEASUREMENT') {
      const itemsList = measurementBook.items || [];
      const lineItems = itemsList.map((li: any, idx: number) => ({
        id: li.code || `item-${idx}`,
        wbsRef: li.code || `${idx + 1}`,
        description: li.description || 'Artigo de Medição',
        unit: li.unit || 'un',
        unitPrice: li.unitPriceKz || 0,
        previousQty: 0,
        currentQty: li.periodQuantity || 0,
        totalQty: li.periodQuantity || 0,
        contractQty: (li.periodQuantity || 1) * 1.2,
        currentValue: li.totalPriceKz || ((li.periodQuantity || 0) * (li.unitPriceKz || 0)),
        totalValue: li.totalPriceKz || ((li.periodQuantity || 0) * (li.unitPriceKz || 0)),
        contractValue: ((li.periodQuantity || 1) * 1.2) * (li.unitPriceKz || 0),
        deviationPct: 0
      }));

      const totalVal = measurementBook.totalAmountKz || lineItems.reduce((acc, i) => acc + i.currentValue, 0);
      const certNum = `AM-2026-${String(measurementBook.measurementNumber || 1).padStart(3, '0')}`;

      const doc = compileExecutiveMeasurementBookPDF({
        project: projData,
        certificate: {
          certificateNumber: certNum,
          period: measurementBook.period || 'Período Corrente',
          contractTotalValue: projData.budget || totalVal * 5,
          previousAccumulated: 0,
          currentPeriodValue: totalVal,
          newAccumulated: totalVal,
          retentionPct: 5,
          retentionAmount: totalVal * 0.05,
          netPayable: totalVal * 0.95
        },
        items: lineItems,
        photos: (measurementBook.photos || []).map((p: any) => ({
          title: p.title || 'Evidência Fotográfica',
          coordinates: p.gps,
          timestamp: p.date,
          imageUrl: p.url
        }))
      });

      setActivePdfDoc(doc);
      setViewerTitle(`Auto de Medição Oficial • ${certNum}`);
      setViewerFileName(`Auto_Medicao_${(projData.name || 'Obra').replace(/\s+/g, '_')}_${certNum}`);
      setViewerDocType('AUTO DE MEDIÇÃO HOMOLOGADO');
      setViewerOpen(true);
    } else if (activeDoc === 'BOARD_DOSSIER') {
      const doc = compileExecutiveBoardDossierPDF({
        project: projData,
        wbsItems,
        transactions,
        risks
      });

      setActivePdfDoc(doc);
      setViewerTitle('Dossiê do Conselho de Administração • Curva S & EVA');
      setViewerFileName(`Dossie_Executivo_CA_${(projData.name || 'Obra').replace(/\s+/g, '_')}`);
      setViewerDocType('DOSSIÊ EXECUTIVO DE ALTA DIREÇÃO');
      setViewerOpen(true);
    } else {
      const doc = compileExecutiveBoardDossierPDF({
        project: projData,
        wbsItems,
        transactions,
        risks
      });

      setActivePdfDoc(doc);
      setViewerTitle('Livro Digital da Obra • As-Built Handover');
      setViewerFileName(`Livro_Digital_AsBuilt_${(projData.name || 'Obra').replace(/\s+/g, '_')}`);
      setViewerDocType('LIVRO DIGITAL DA OBRA');
      setViewerOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Compilador Inteligente 1-Clique
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Automação de Cadernos & Dossiês Executivos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Gere instantaneamente cadernos de medição auditáveis com evidências fotográficas, dossiês de alta direção
              com Análise de Valor Ganho (EVA) e o Livro Digital da Obra para entrega e encerramento contratual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Exportar PDF
            </button>
          </div>
        </div>

        {/* Doc Type Selector */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveDoc('MEASUREMENT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeDoc === 'MEASUREMENT'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            1. Caderno de Medição Completo (Auto 04)
          </button>

          <button
            onClick={() => setActiveDoc('BOARD_DOSSIER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeDoc === 'BOARD_DOSSIER'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            2. Dossiê do Conselho de Administração (Curva S / EVA)
          </button>

          <button
            onClick={() => setActiveDoc('AS_BUILT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeDoc === 'AS_BUILT'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            3. Livro Digital da Obra (Handover As-Built)
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (Styled for on-screen inspection and clean print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
        {/* DOCUMENTO 1: CADERNO DE MEDIÇÃO */}
        {activeDoc === 'MEASUREMENT' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header Documento */}
            <div className="border-b-2 border-slate-900 dark:border-white pb-6 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">PROFUNDIDADE OS • ENGENHARIA & OBRAS</span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">CADERNO DE ENCARGOS & MEDIÇÃO Nº {measurementBook.measurementNumber}</h1>
                <p className="text-xs text-slate-500 mt-1">Período de Referência: {measurementBook.period} • Emitido em {new Date(measurementBook.generatedAt).toLocaleDateString('pt-AO')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">ID: {measurementBook.id}</span>
                <div className="text-lg font-bold text-emerald-600 mt-1">{formatKz(measurementBook.totalAmountKz)}</div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Valor Líquido a Faturar</span>
              </div>
            </div>

            {/* Sumário Executivo */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Sumário Executivo da Medição</h3>
              <p className="text-slate-600 dark:text-slate-400">
                O presente auto contempla os trabalhos de terraplanagem, escavação e betonagem estrutural executados no período,
                devidamente vistoriados pela equipa de Fiscalização Residente e suportados pelos ensaios laboratoriais correspondentes.
              </p>
            </div>

            {/* Tabela de Medições Detalhadas */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Mapa Quantitativo de Trabalhos Executados
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Artigo</th>
                      <th className="p-3">Descrição dos Trabalhos</th>
                      <th className="p-3 text-center">Un.</th>
                      <th className="p-3 text-right">Qtd. Período</th>
                      <th className="p-3 text-right">P. Unitário (Kz)</th>
                      <th className="p-3 text-right">Total (Kz)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {measurementBook.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                          Nenhum pacote de trabalho registado na EAP com custos medidos no período.
                        </td>
                      </tr>
                    ) : (
                      measurementBook.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-semibold">{item.code}</td>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-center">{item.unit}</td>
                          <td className="p-3 text-right font-medium">{item.periodQuantity.toLocaleString()}</td>
                          <td className="p-3 text-right">{item.unitPriceKz.toLocaleString()} Kz</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatKz(item.totalPriceKz)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 font-bold">
                    <tr>
                      <td colSpan={5} className="p-3 text-right uppercase">Total do Auto:</td>
                      <td className="p-3 text-right text-sm text-blue-600 dark:text-blue-400">{formatKz(measurementBook.totalAmountKz)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Dossiê Fotográfico Anexo */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                Dossiê Fotográfico & Evidências Georreferenciadas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {measurementBook.photos.length === 0 ? (
                  <div className="col-span-full p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs">
                    Nenhuma evidência fotográfica anexada no período de medição.
                  </div>
                ) : (
                  measurementBook.photos.map((ph, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/40 text-xs">
                      <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-slate-400 font-mono text-[11px] mb-2">
                        [Foto Verificada - {ph.coordinates}]
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{ph.caption}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{ph.date}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bloco de Assinaturas Probatórias */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 text-center">Termo de Aprovação & Visto Técnico</h4>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {measurementBook.signatures.map((sig, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="border-b border-slate-400 dark:border-slate-600 pb-8 text-slate-300 dark:text-slate-600 italic">
                      (Assinatura Digital)
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white pt-2">{sig.name}</p>
                    <p className="text-[11px] text-slate-500">{sig.role}</p>
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-semibold mt-1">
                      {sig.status === 'ASSINADO' ? 'Rubricado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTO 2: DOSSIÊ DO CA */}
        {activeDoc === 'BOARD_DOSSIER' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="border-b-2 border-purple-900 pb-6 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-purple-600">RELATÓRIO DE GOVERNAÇÃO EXECUTIVA</span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">DOSSIÊ DO CONSELHO DE ADMINISTRAÇÃO</h1>
                <p className="text-xs text-slate-500 mt-1">Controlo Integrado de Custos, Prazos & Análise de Valor Ganho (EVA)</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">Trimestre Q1-2026</span>
                <div className="text-lg font-bold text-purple-600 mt-1">CPI: {boardDossier.cpi} | SPI: {boardDossier.spi}</div>
              </div>
            </div>

            {/* Painel EVA (Earned Value Analysis) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Valor Previsto (PV)</span>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">{formatKz(boardDossier.pvKz)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Valor Ganho (EV)</span>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">{formatKz(boardDossier.evKz)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Custo Real (AC)</span>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">{formatKz(boardDossier.acKz)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">EAC Projetado</span>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1">{formatKz(boardDossier.eacKz)}</p>
              </div>
            </div>

            {/* Diagnóstico Executivo */}
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800/40 text-xs space-y-2">
              <h3 className="font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">Diagnóstico de Performance da Diretoria</h3>
              <p className="text-slate-700 dark:text-slate-300">
                {boardDossier.cpi >= 1 && boardDossier.spi >= 1
                  ? 'A empreitada opera dentro do orçamento e adiantada no cronograma.'
                  : `O projeto apresenta um índice de desempenho de custos CPI de ${boardDossier.cpi} e de prazos SPI de ${boardDossier.spi}. A variação de custo no término estimada (VAC) é de ${formatKz(boardDossier.vacKz)}.`
                }
              </p>
            </div>

            {/* Matriz de Riscos Estratégicos */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Matriz de Riscos Críticos do Conselho</h3>
              <div className="space-y-2 text-xs">
                {boardDossier.strategicRisks.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                    Nenhum risco estratégico crítico assinalado no projeto.
                  </div>
                ) : (
                  boardDossier.strategicRisks.map((risk, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{risk.risk}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Mitigação em curso: {risk.mitigation}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        risk.level === 'ALTO' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        Risco {risk.level}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTO 3: AS-BUILT HANDOVER */}
        {activeDoc === 'AS_BUILT' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="border-b-2 border-emerald-900 pb-6 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">ENTREGA & ENCERRAMENTO CONTRATUAL</span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">LIVRO DIGITAL DA OBRA (AS-BUILT)</h1>
                <p className="text-xs text-slate-500 mt-1">Dossiê Completo de Telas Finais, Licenciamento e Manutenção para o Dono da Obra</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Conformidade As-Built 100%
                </span>
              </div>
            </div>

            {/* Estrutura de Capítulos do Livro Digital */}
            <div className="space-y-4">
              {asBuiltBook.chapters.map((ch, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ch.title}</h4>
                    </div>
                    <span className="text-xs text-slate-400">{ch.itemCount} documentos anexos</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 pl-9">{ch.description}</p>
                </div>
              ))}
            </div>

            {/* Selo de Garantia e Entrega */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">Garantia Técnica & Validação Notarial</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Todos os registos contidos neste livro digital foram lacrados criptograficamente, garantindo a rastreabilidade integral para auditorias do Tribunal de Contas e seguradoras.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pré-Visualização e Impressão de Alta Precisão */}
      <ExecutivePdfViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        pdfDoc={activePdfDoc}
        title={viewerTitle}
        fileName={viewerFileName}
        documentType={viewerDocType}
      />
    </div>
  );
}
