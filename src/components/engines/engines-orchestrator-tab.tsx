'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Sliders, 
  FileText, 
  Globe, 
  Cpu, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { EarlyWarningTab } from './early-warning-tab';
import { WorkflowGovernanceTab } from './workflow-governance-tab';
import { ScenarioSimulationTab } from './scenario-simulation-tab';
import { DocumentAutomationTab } from './document-automation-tab';
import { ExtranetManagementTab } from './extranet-management-tab';

interface EnginesOrchestratorTabProps {
  projectId: string;
  project?: any;
  wbsItems?: any[];
  transactions?: any[];
  userRole?: string;
}

export function EnginesOrchestratorTab({ 
  projectId, 
  project, 
  wbsItems = [], 
  transactions = [], 
  userRole 
}: EnginesOrchestratorTabProps) {
  const [activeEngine, setActiveEngine] = useState<
    'early-warning' | 'workflow-governance' | 'scenario-simulation' | 'document-automation' | 'extranet-management'
  >('early-warning');

  return (
    <div className="space-y-6">
      {/* Top Banner: O Sistema Operacional de Decisão */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Cpu className="w-4 h-4 text-indigo-400" />
              SISTEMA OPERACIONAL DE DECISÃO EM TEMPO REAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Motores Inteligentes PROFUNDIDADE OS
            </h1>
            <p className="text-sm text-indigo-200/80 mt-2 max-w-3xl leading-relaxed">
              A plataforma transcende formulários passivos: correlaciona telemetria de frotas, caminhos críticos de cronograma,
              esteiras de governança contratual por alçadas e simulações de sensibilidade cambial em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono text-indigo-300 bg-black/40 backdrop-blur p-4 rounded-xl border border-indigo-500/30">
            <div className="pr-4 border-r border-indigo-500/30">
              <div className="text-[10px] text-indigo-400 uppercase">Early Warning</div>
              <div className="font-bold text-emerald-400 text-sm">Monitorização Ativa</div>
            </div>
            <div className="px-4 border-r border-indigo-500/30">
              <div className="text-[10px] text-indigo-400 uppercase">Alçadas</div>
              <div className="font-bold text-white text-sm">3 Níveis Ativos</div>
            </div>
            <div className="pl-4">
              <div className="text-[10px] text-indigo-400 uppercase">Selo Probatório</div>
              <div className="font-bold text-emerald-400 text-sm">SHA-256 OK</div>
            </div>
          </div>
        </div>

        {/* Engine Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-indigo-500/20">
          <button
            onClick={() => setActiveEngine('early-warning')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeEngine === 'early-warning'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            1. Alertas & Anomalias
          </button>

          <button
            onClick={() => setActiveEngine('workflow-governance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeEngine === 'workflow-governance'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            2. Governação & Alçadas
          </button>

          <button
            onClick={() => setActiveEngine('scenario-simulation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeEngine === 'scenario-simulation'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            3. Simulação & What-If
          </button>

          <button
            onClick={() => setActiveEngine('document-automation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeEngine === 'document-automation'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            4. Cadernos & Dossiês
          </button>

          <button
            onClick={() => setActiveEngine('extranet-management')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeEngine === 'extranet-management'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25'
                : 'bg-white/5 hover:bg-white/10 text-indigo-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            5. Extranet Fiscalização & Fornecedores
          </button>
        </div>
      </div>

      {/* Engine Active Content */}
      <div className="transition-all duration-200">
        {activeEngine === 'early-warning' && (
          <EarlyWarningTab projectId={projectId} />
        )}

        {activeEngine === 'workflow-governance' && (
          <WorkflowGovernanceTab projectId={projectId} />
        )}

        {activeEngine === 'scenario-simulation' && (
          <ScenarioSimulationTab projectId={projectId} project={project} transactions={transactions} />
        )}

        {activeEngine === 'document-automation' && (
          <DocumentAutomationTab projectId={projectId} project={project} wbsItems={wbsItems} transactions={transactions} />
        )}

        {activeEngine === 'extranet-management' && (
          <ExtranetManagementTab projectId={projectId} />
        )}
      </div>
    </div>
  );
}
