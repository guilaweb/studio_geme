'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Package, 
  UserCheck, 
  RefreshCw,
  Camera, 
  FileSpreadsheet 
} from 'lucide-react';
import { 
  RequisitionWorkflow, 
  DailyLogProbativeLock, 
  MeasurementEvidenceCheck, 
  SmartStockReplenishmentTrigger,
  ApprovalTier 
} from '@/types/engine-workflow';
import { workflowGovernanceEngine } from '@/lib/engines/workflow-governance-engine';

interface WorkflowGovernanceTabProps {
  projectId: string;
}

export function WorkflowGovernanceTab({ projectId }: WorkflowGovernanceTabProps) {
  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState<RequisitionWorkflow[]>([]);
  const [dailyLogLock, setDailyLogLock] = useState<DailyLogProbativeLock | null>(null);
  const [measurementCheck, setMeasurementCheck] = useState<MeasurementEvidenceCheck | null>(null);
  const [stockTriggers, setStockTriggers] = useState<SmartStockReplenishmentTrigger[]>([]);
  
  // State for interactive lock action
  const [lockingLog, setLockingLog] = useState(false);
  const [lockAuthor, setLockAuthor] = useState('Eng. Diretor de Obra');
  const [lockSummary, setLockSummary] = useState('Sem anomalias registadas no turno. Betão de sapatas no bloco B concluído com 32m3.');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/engines/workflows`);
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data.requisitions || []);
        setDailyLogLock(data.dailyLogLock || null);
        setMeasurementCheck(data.measurementCheck || null);
        setStockTriggers(data.stockTriggers || []);
      } else {
        setRequisitions([]);
        setDailyLogLock(null);
        setMeasurementCheck(null);
        setStockTriggers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar governança:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleApproveRequisition = (reqId: string) => {
    setRequisitions(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'aprovado' as const,
          steps: r.steps.map(s => ({
            ...s,
            status: 'aprovado' as const,
            approvedAt: new Date().toISOString(),
            assignedUserName: lockAuthor
          }))
        };
      }
      return r;
    }));
  };

  const handleLockDailyLog = async () => {
    setLockingLog(true);
    try {
      const lock = await workflowGovernanceEngine.generateProbativeDailyLogLock(
        projectId,
        new Date().toISOString().split('T')[0],
        lockAuthor,
        lockSummary
      );
      setDailyLogLock(lock);
    } finally {
      setLockingLog(false);
    }
  };

  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(val).replace('AOA', 'Kz');
  };

  const getTierBadge = (tier: ApprovalTier) => {
    switch (tier) {
      case 'encarregado':
        return { label: 'Alçada N1 (Até 1.5M Kz)', color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };
      case 'diretor_obra':
        return { label: 'Alçada N2 (Até 15M Kz)', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' };
      case 'cfo_diretoria':
        return { label: 'Alçada N3 (Acima 15M Kz - CA)', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">A sincronizar esteiras de aprovação e integridade probatória...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Governance Principles */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Governação & Alçadas Ativas
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Motor de Automação de Fluxos & Blindagem</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Elimina desvios contratuais com esteiras de aprovação parametrizadas por alçada (1.5M Kz, 15M Kz e CA),
              trancamento probatório de Diário de Obra com criptografia SHA-256 e validação mandatória de evidências em medições.
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar Fluxos
          </button>
        </div>

        {/* Alçadas Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nível 1 • Até 1.500.000 Kz</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Diretor de Obra</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aprovação direta no estaleiro para compras de emergência e materiais correntes.</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/40">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Nível 2 • 1.5M a 15.000.000 Kz</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Dir. Operações + Finanças</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Validação de conformidade orçamental e fluxo de tesouraria antes da encomenda.</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800/40">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Nível 3 • Acima de 15.000.000 Kz</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Conselho de Administração (CA)</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aprovação colegial obrigatória com mapa comparativo de 3 cotações de fornecedores.</p>
          </div>
        </div>
      </div>

      {/* Grid: 1. Esteiras de Compras | 2. Diário Probatório SHA-256 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Esteiras de Requisição & Compras */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Esteira de Aprovação de Compras</h3>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs rounded-full font-semibold">
                {requisitions.filter(r => r.status === 'em_aprovacao' || r.status === 'pendente').length} Pendentes
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Requisições em trânsito com aplicação estrita do princípio dos quatro olhos e verificação de dotação orçamental.
            </p>

            <div className="space-y-4">
              {requisitions.map((req) => {
                const tierInfo = getTierBadge(req.requiredTier);
                return (
                  <div 
                    key={req.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{req.requisitionNumber || req.id}</span>
                          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${tierInfo.color}`}>
                            {tierInfo.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{req.description}</p>
                        <p className="text-xs text-slate-500">
                          Requerente: {req.requestedBy.name} • {new Date(req.requestedAt).toLocaleDateString('pt-AO')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{formatKz(req.totalAmountAOA)}</span>
                        <p className="text-xs text-slate-500">{req.steps.length} etapas definidas</p>
                      </div>
                    </div>

                    {/* Steps timeline */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cadeia de Assinaturas:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {req.steps.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                            {s.status === 'aprovado' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : s.status === 'rejeitado' ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{s.roleName}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {s.status === 'aprovado' ? `Aprovado: ${s.assignedUserName || 'OK'}` : 'Pendente de validação'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action button if pending */}
                    {(req.status === 'em_aprovacao' || req.status === 'pendente') && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleApproveRequisition(req.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Aprovar como Gestor com Alçada
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Diário de Obra com Hash Probatório SHA-256 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trancamento Probatório (SHA-256)</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs rounded-full font-semibold">
                Inalterabilidade Legal
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Proteção jurídica contra alterações retroativas. Às 23h59 o Diário de Obra gera um selo temporal com hash criptográfico irreversível.
            </p>

            {dailyLogLock && (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Selo de Integridade Probatória Ativo
                  </span>
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                    {dailyLogLock.date}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded border border-emerald-200 dark:border-emerald-900 font-mono text-xs break-all">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>SHA-256 CHECKSUM</span>
                    <span>256 BITS</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{dailyLogLock.digitalSignatureHash}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Assinante Autorizado:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{dailyLogLock.signedBy.displayName} ({dailyLogLock.signedBy.role})</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Timestamp Imutável:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(dailyLogLock.timestamp).toLocaleString('pt-AO')}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 italic pt-1 border-t border-emerald-100 dark:border-emerald-900/50">
                  Condição: {dailyLogLock.weatherCondition} • {dailyLogLock.workforceCount} trabalhadores • {dailyLogLock.executedTasksCount} tarefas executadas
                </p>
              </div>
            )}

            {/* Test new seal generation */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Testar Fecho / Trancamento de Turno:</span>
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={lockAuthor} 
                  onChange={e => setLockAuthor(e.target.value)}
                  placeholder="Nome do Responsável Técnico"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <textarea
                  rows={2}
                  value={lockSummary}
                  onChange={e => setLockSummary(e.target.value)}
                  placeholder="Resumo operacional do turno"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLockDailyLog}
              disabled={lockingLog}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              {lockingLog ? 'A Criptografar Bloco...' : 'Trancar Diário de Obra e Gerar Hash SHA-256'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 3. Validação de Medições | 4. Ponto de Encomenda Inteligente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Validação de Evidências em Medições */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Blindagem do Auto de Medição</h3>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
              measurementCheck?.isEligibleForSubmission ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {measurementCheck?.isEligibleForSubmission ? 'Apto para Faturação' : 'Submissão Bloqueada'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Nenhum auto de medição pode ser submetido à Fiscalização sem o pacote mínimo de evidências documentais (fotografias georreferenciadas e ensaios de qualidade).
          </p>

          {measurementCheck && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-mono text-slate-500">Certificado: {measurementCheck.certificateNumber}</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">ID: {measurementCheck.measurementId}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Fotos Anexas:</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {measurementCheck.photoCount} fotos georreferenciadas
                  </p>
                </div>
              </div>

              {measurementCheck.missingEvidenceWarnings && measurementCheck.missingEvidenceWarnings.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Bloqueios de Governação Detetados:
                  </div>
                  <ul className="text-xs text-rose-700 dark:text-rose-300 space-y-1 pl-6 list-disc">
                    {measurementCheck.missingEvidenceWarnings.map((warning: string, i: number) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                  measurementCheck.hasLabTestsOrStakeLogs ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Ensaios / Estacas</p>
                    <p className="text-[11px] opacity-80">{measurementCheck.hasLabTestsOrStakeLogs ? `${measurementCheck.testReportCount} relatórios anexados` : 'Em falta'}</p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                  measurementCheck.hasGeotaggedPhotos ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <Camera className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Fotos Georreferenciadas</p>
                    <p className="text-[11px] opacity-80">{measurementCheck.hasGeotaggedPhotos ? 'Evidências anexadas' : 'Aguardando envio'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gatilho de Ponto de Encomenda Inteligente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ponto de Encomenda Preditivo</h3>
            </div>
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs rounded-full font-semibold">
              Logística Sem Paragens
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Cálculo dinâmico baseado na taxa de consumo diário e no tempo de entrega (Lead Time dos fornecedores em Angola).
          </p>

          <div className="space-y-3">
            {stockTriggers.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.materialName}</span>
                    <span className={`px-2 py-0.2 text-[10px] font-bold uppercase rounded ${
                      item.isTriggered ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.isTriggered ? 'Reposição Urgente' : 'Stock Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Stock: <span className="font-semibold text-slate-800 dark:text-slate-200">{item.currentStock} {item.unit}</span> • Consumo: {item.dailyConsumptionRate} {item.unit}/dia • Lead Time: {item.leadTimeDays}d
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-400">Ponto Encomenda:</div>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    +{item.suggestedOrderQty} {item.unit}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Limite: {item.reorderPoint} {item.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
