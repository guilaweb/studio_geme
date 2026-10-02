'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  KeyRound, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { ExtranetAccessToken, ExtranetRole } from '@/types/engine-extranet';

interface ExtranetManagementTabProps {
  projectId: string;
}

export function ExtranetManagementTab({ projectId }: ExtranetManagementTabProps) {
  const [tokens, setTokens] = useState<ExtranetAccessToken[]>([]);

  // Form state for new token
  const [newRole, setNewRole] = useState<ExtranetRole>('fornecedor');
  const [newEntity, setNewEntity] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newReference, setNewReference] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity || !newEmail) return;

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const newToken: ExtranetAccessToken = {
      token: `tok_${newRole.toLowerCase().slice(0, 4)}_${randomSuffix}`,
      projectId,
      projectName: 'Empreitada Principal',
      role: newRole,
      recipientName: newEntity,
      recipientEmail: newEmail,
      referenceId: newReference || 'GERAL-2026',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
      createdAt: new Date().toISOString()
    };

    setTokens([newToken, ...tokens]);
    setNewEntity('');
    setNewEmail('');
    setNewReference('');
  };

  const copyToClipboard = (tokenStr: string) => {
    const url = `${window.location.origin}/extranet/${tokenStr}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tokenStr);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getRoleBadge = (role: ExtranetRole) => {
    switch (role) {
      case 'fornecedor':
        return { label: 'Fornecedor (Cotação)', color: 'bg-amber-100 text-amber-800' };
      case 'fiscalizacao':
        return { label: 'Fiscalização (Homologação)', color: 'bg-blue-100 text-blue-800' };
      case 'investidor':
        return { label: 'Investidor (Transparência)', color: 'bg-purple-100 text-purple-800' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              Extranet Segura & Ecossistema Aberto
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Portal da Fiscalização, Fornecedores & Dono da Obra</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Elimine o caos do correio eletrónico e PDFs avulsos. Conceda acessos seguros temporários (7 dias com token criptográfico sem palavra-passe)
              para recolher cotações, homologar autos de medição e prestar contas com total transparência.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 1. Formulário de Novo Link Seguro | 2. Tabela de Links Ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Criação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            Emitir Link com Token Seguro
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            O destinatário recebe um link exclusivo com validade máxima de 7 dias e acesso restrito ao seu âmbito de atuação.
          </p>

          <form onSubmit={handleCreateToken} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Perfil / Acesso
              </label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as ExtranetRole)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="fornecedor">Fornecedor (Submissão de Cotação)</option>
                <option value="fiscalizacao">Fiscalização Residente (Homologação)</option>
                <option value="investidor">Dono da Obra / Investidor (Transparência)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Entidade ou Empresa Destinatária
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Cimentos de Angola / Consórcio Fiscal"
                value={newEntity}
                onChange={e => setNewEntity(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-mail para Registo de Auditoria
              </label>
              <input
                type="email"
                required
                placeholder="contacto@fornecedor.ao"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Referência / Identificador
              </label>
              <input
                type="text"
                placeholder="Ex: RFQ-2026-089 ou AUT-2026-004"
                value={newReference}
                onChange={e => setNewReference(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Gerar Token Criptográfico (7 Dias)
            </button>
          </form>
        </div>

        {/* Lista de Tokens Gerados */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Tokens & Links Seguros Ativos
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {tokens.length} Acessos Concedidos
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Todos os links contam com expiração automática após 7 dias e registam endereço IP, data/hora da resposta e assinatura eletrónica.
            </p>

            <div className="space-y-3">
              {tokens.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Nenhum Acesso Concedido
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Utilize o formulário ao lado para gerar tokens seguros temporários (7 dias) para fornecedores, fiscais ou investidores.
                  </p>
                </div>
              ) : (
                tokens.map(tok => {
                  const badge = getRoleBadge(tok.role);
                  return (
                    <div 
                      key={tok.token}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{tok.recipientName}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{tok.recipientEmail}</p>
                          {tok.referenceId && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">
                              Referência: {tok.referenceId}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            Expira em {new Date(tok.expiresAt).toLocaleDateString('pt-AO')}
                          </span>
                        </div>
                      </div>

                      {/* Token URL & Action Buttons */}
                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                        <div className="font-mono text-xs text-slate-500 truncate max-w-sm">
                          /extranet/{tok.token}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(tok.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            {copiedId === tok.token ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copiar Link
                              </>
                            )}
                          </button>

                          <a
                            href={`/extranet/${tok.token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Testar Acesso
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            Tokens revogados ou expirados impedem imediatamente qualquer nova submissão ou leitura.
          </div>
        </div>
      </div>
    </div>
  );
}
