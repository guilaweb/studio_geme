'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Building2, 
  DollarSign, 
  Check, 
  Send,
  Layers
} from 'lucide-react';
import { ExtranetAccessToken } from '@/types/engine-extranet';

export default function ExtranetPage() {
  const params = useParams();
  const token = params.token as string;

  const [tokenData, setTokenData] = useState<ExtranetAccessToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Supplier quotation form
  const [unitPrice, setUnitPrice] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [supplierNotes, setSupplierNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supervision validation form
  const [supervisionDecision, setSupervisionDecision] = useState<'APPROVED' | 'REJECTED' | 'APPROVED_WITH_COMMENTS'>('APPROVED');
  const [supervisionInspector, setSupervisionInspector] = useState('');
  const [supervisionNotes, setSupervisionNotes] = useState('');

  useEffect(() => {
    async function fetchTokenInfo() {
      try {
        const res = await fetch(`/api/extranet/${token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Token de acesso inválido ou expirado.');
          return;
        }
        const data = await res.json();
        setTokenData(data.token);
      } catch (err: any) {
        setError('Falha de ligação ao servidor da extranet.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchTokenInfo();
    }
  }, [token]);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/extranet/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_QUOTATION',
          payload: {
            rfqId: tokenData?.referenceId || 'RFQ-2026',
            supplierName: tokenData?.recipientName || 'Fornecedor',
            totalPriceKz: Number(unitPrice),
            leadTimeDays: Number(leadTimeDays),
            notes: supplierNotes
          }
        })
      });

      if (res.ok) {
        setSuccessMessage('Cotação submetida com sucesso! A nossa equipa de compras irá avaliar a proposta na esteira de alçadas.');
      } else {
        const err = await res.json();
        setError(err.error || 'Erro ao submeter a cotação.');
      }
    } catch (err) {
      setError('Erro de rede ao submeter cotação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/extranet/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_SUPERVISION',
          payload: {
            measurementId: tokenData?.referenceId || 'AUT-2026',
            decision: supervisionDecision,
            inspectorName: supervisionInspector || 'Eng. Fiscal Residente',
            comments: supervisionNotes
          }
        })
      });

      if (res.ok) {
        setSuccessMessage('Parecer de fiscalização registado com sucesso! O auto de medição foi atualizado no sistema.');
      } else {
        const err = await res.json();
        setError(err.error || 'Erro ao registar parecer.');
      }
    } catch (err) {
      setError('Erro de rede ao submeter parecer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Clock className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">A validar credencial criptográfica temporária...</p>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center mx-auto mb-4 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Expirado ou Inválido</h2>
          <p className="text-xs text-slate-500 mt-2">{error}</p>
          <p className="text-[11px] text-slate-400 mt-4">
            Por motivos de segurança e conformidade, os tokens da Extranet expiram em 7 dias ou após o cancelamento pelo gestor de obra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-black">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                PROFUNDIDADE OS • EXTRANET SEGURA
              </h1>
              <p className="text-[11px] text-slate-400">Portal Conectado de Fiscalização, Fornecedores & Dono da Obra</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full font-medium">
            <ShieldCheck className="w-4 h-4" />
            Sessão Segura SHA-256
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Ação Concluída com Sucesso</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">Atenção</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Token Metadata Card */}
        {tokenData && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Entidade Credenciada:</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{tokenData.recipientName}</h2>
                <p className="text-xs text-slate-500 mt-0.5">E-mail: {tokenData.recipientEmail || 'Não especificado'}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Validade do Token:</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                  Até {new Date(tokenData.expiresAt).toLocaleDateString('pt-AO')}
                </p>
              </div>
            </div>

            {tokenData.referenceId && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans">Documento de Referência: </span>
                {tokenData.referenceId}
              </div>
            )}
          </div>
        )}

        {/* 1. PORTAL DO FORNECEDOR */}
        {tokenData?.role === 'fornecedor' && !successMessage && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Submissão de Cotação de Materiais / Equipamentos
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Introduza a sua melhor proposta económica em Kwanzas (AOA) e o prazo de entrega no estaleiro da obra.
            </p>

            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Total da Proposta (Kz, sem IVA ou com discriminação):
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 4500000"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prazo de Entrega Estimado no Estaleiro (Dias de Calendário):
                </label>
                <input
                  type="number"
                  required
                  value={leadTimeDays}
                  onChange={e => setLeadTimeDays(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Comerciais, Condições de Pagamento e Validade:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Pagamento 50% na encomenda e 50% contra-entrega. Cotação válida por 15 dias."
                  value={supplierNotes}
                  onChange={e => setSupplierNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'A Enviar Proposta...' : 'Enviar Cotação para a Obra'}
              </button>
            </form>
          </div>
        )}

        {/* 2. PORTAL DA FISCALIZAÇÃO */}
        {tokenData?.role === 'fiscalizacao' && !successMessage && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Homologação Técnica do Auto de Medição
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Emissão de parecer formal da entidade de fiscalização após conferência das medições e relatórios laboratoriais.
            </p>

            <form onSubmit={handleSupervisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Decisão da Fiscalização:
                </label>
                <select
                  value={supervisionDecision}
                  onChange={e => setSupervisionDecision(e.target.value as any)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="APPROVED">Aprovado sem Reservas (Auto Homologado)</option>
                  <option value="APPROVED_WITH_COMMENTS">Aprovado com Condicionantes / Retenções</option>
                  <option value="REJECTED">Rejeitado (Necessita de Retificação em Obra)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome e Carteira Profissional do Engenheiro Fiscal:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eng. Mário de Oliveira - Ordem dos Engenheiros nº 4821"
                  value={supervisionInspector}
                  onChange={e => setSupervisionInspector(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parecer Técnico / Justificação do Visto:
                </label>
                <textarea
                  rows={3}
                  placeholder="Conforme verificado in loco nas estacas 12 a 34 e pelos provetes de compressão aos 28 dias..."
                  value={supervisionNotes}
                  onChange={e => setSupervisionNotes(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow"
              >
                <Check className="w-4 h-4" />
                {submitting ? 'A Registar Visto...' : 'Homologar com Assinatura Eletrónica'}
              </button>
            </form>
          </div>
        )}

        {/* 3. PORTAL DO INVESTIDOR / DONO DA OBRA */}
        {tokenData?.role === 'investidor' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Painel de Transparência do Investidor & Dono da Obra
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento em tempo real do avanço físico, financeiro e fotográfico da empreitada.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Avanço Físico</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {(tokenData as any)?.payload?.physicalProgress !== undefined ? `${(tokenData as any).payload.physicalProgress}%` : 'N/D'}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">Registo de Campo</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Avanço Financeiro</span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {(tokenData as any)?.payload?.financialProgress !== undefined ? `${(tokenData as any).payload.financialProgress}%` : 'N/D'}
                </p>
                <span className="text-[10px] text-slate-400">Autos homologados</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Prazo Decorrido</span>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {(tokenData as any)?.payload?.daysElapsed !== undefined ? `${(tokenData as any).payload.daysElapsed} d` : 'N/D'}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">Cronograma Oficial</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Qualidade & Ensaios</span>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {(tokenData as any)?.payload?.qualityRate !== undefined ? `${(tokenData as any).payload.qualityRate}%` : '100%'}
                </p>
                <span className="text-[10px] text-slate-400">Conformidade técnica</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Garantia de Integridade e Transparência</p>
              <p className="text-slate-500">
                Os dados aqui expostos são atualizados em tempo real pelos módulos de diário de obra, topografia e frotas, com trancamento probatório criptográfico SHA-256.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 pt-6">
          PROFUNDIDADE OS • Plataforma de Engenharia e Gestão de Ativos Angolana • Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
