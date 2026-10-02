'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Building2, 
  Route, 
  Paintbrush,
  Home,
  Waypoints,
  Pickaxe,
  Ruler,
  Zap, 
  Layers, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  MapPin, 
  Sparkles, 
  Loader2,
  FileCheck,
  Coins,
  Calendar,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/contexts/tenant-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { NATIVE_PROJECT_TEMPLATES, applyProjectTemplate } from '@/lib/project-templates';
import { getBrowserLocation } from '@/lib/geo-utils';
import type { Project, ProjectType } from '@/types/project';

interface ProjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Setores principais de projeto conforme manifesto
const PROJECT_SECTORS = [
  {
    id: 'pintura',
    name: 'Obra de Pintura',
    icon: Paintbrush,
    color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
    templateId: 'template-pintura-acabamentos',
    defaultBudget: '18500000',
    projectType: 'Residencial' as ProjectType,
    summary: 'Interior, exterior, caixilharias e medição direta em m²'
  },
  {
    id: 'edificio',
    name: 'Construção Civil',
    icon: Building2,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    templateId: 'template-moradia-edificio',
    defaultBudget: '85000000',
    projectType: 'Residencial' as ProjectType,
    summary: 'Fundações, estrutura de betão, alvenarias e acabamentos'
  },
  {
    id: 'estrada',
    name: 'Estradas & Terraplanagem',
    icon: Route,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    templateId: 'template-estrada-terraplanagem',
    defaultBudget: '340000000',
    projectType: 'Estrada' as ProjectType,
    summary: 'Corte, aterro, sub-base, tout-venant e pavimento asfáltico'
  },
  {
    id: 'reabilitacao',
    name: 'Reabilitação Urbana',
    icon: Home,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    templateId: 'template-reabilitacao',
    defaultBudget: '45000000',
    projectType: 'Residencial' as ProjectType,
    summary: 'Demolição seletiva, reforço estrutural, águas e remodelação'
  },
  {
    id: 'ponte',
    name: 'Pontes & Obras de Arte',
    icon: Waypoints,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
    templateId: 'template-ponte-arte',
    defaultBudget: '890000000',
    projectType: 'Infraestrutura' as ProjectType,
    summary: 'Estacas moldadas, encontros, vigas pré-esforçadas e tabuleiro'
  },
  {
    id: 'mineracao',
    name: 'Mineração & Lavra',
    icon: Pickaxe,
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    templateId: 'template-mineracao',
    defaultBudget: '620000000',
    projectType: 'Mineração' as ProjectType,
    summary: 'Decapagem de estéril, perfuração, desmonte e frotas de dumpers'
  },
  {
    id: 'topografia',
    name: 'Topografia & Cadastro',
    icon: Ruler,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
    templateId: 'template-topografia',
    defaultBudget: '12500000',
    projectType: 'Infraestrutura' as ProjectType,
    summary: 'Rede GNSS RTK, levantamento cadastral, MDT e cubagens'
  },
];

export function ProjectCreationWizard({ open, onOpenChange }: ProjectCreationWizardProps) {
  const { user } = useAuth();
  const { activeOrganization } = useTenant();
  const { toast } = useToast();
  const router = useRouter();

  // Etapas: 1: Tipo | 2: Perguntas Adaptativas | 3: Informações & Prazo | 4: Orçamento & Equipa | 5: Resumo
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Etapa 1: Setor
  const [selectedSectorId, setSelectedSectorId] = useState('pintura');
  const [useTemplate, setUseTemplate] = useState(true);

  // Etapa 2: Respostas às perguntas adaptativas
  // Perguntas para Pintura
  const [paintScope, setPaintScope] = useState<'Interior' | 'Exterior' | 'Interior e exterior'>('Interior e exterior');
  const [measurementType, setMeasurementType] = useState<'m²' | 'Valor global' | 'Homem-dia'>('m²');
  // Perguntas para Construção / Outros
  const [buildingType, setBuildingType] = useState('Habitacional Multifamiliar');
  const [divisionMethod, setDivisionMethod] = useState('Preparação | Estrutura | Acabamentos | Instalações');

  // Etapa 3: Informações Básicas
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState('45');

  // Etapa 4: Orçamento e Equipa
  const [budgetAOA, setBudgetAOA] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [fiscalName, setFiscalName] = useState('');
  const [fiscalEmail, setFiscalEmail] = useState('');
  const [fieldLeaderName, setFieldLeaderName] = useState('');
  
  // Opções avançadas (recolhidas por padrão)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currencySecondary, setCurrencySecondary] = useState('USD');
  const [contingencyPct, setContingencyPct] = useState('5');
  const [workSchedule, setWorkSchedule] = useState('Segunda a Sábado (44h/semana)');

  const currentSector = PROJECT_SECTORS.find(s => s.id === selectedSectorId) || PROJECT_SECTORS[0];
  const activeTemplate = NATIVE_PROJECT_TEMPLATES.find(t => t.id === currentSector.templateId) || NATIVE_PROJECT_TEMPLATES[0];

  // Troca de setor adapta valores padrão
  const handleSelectSector = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    const sector = PROJECT_SECTORS.find(s => s.id === sectorId);
    if (!sector) return;
    const tpl = NATIVE_PROJECT_TEMPLATES.find(t => t.id === sector.templateId);
    if (tpl) {
      setDurationDays(String(tpl.durationDays));
    }
  };

  // Preencher GPS automático
  const handleCaptureGps = async () => {
    setFetchingGps(true);
    const loc = await getBrowserLocation();
    setLocationAddress(loc.formattedCoordinates);
    setFetchingGps(false);
    toast({ title: 'Localização Capturada!', description: loc.formattedCoordinates });
  };

  // Submissão final do projeto
  const handleFinalizeProject = async () => {
    if (!name.trim()) {
      toast({ title: 'Campo Obrigatório', description: 'Por favor, indique o nome do projeto.', variant: 'destructive' });
      setStep(3);
      return;
    }
    if (!user) {
      toast({ title: 'Não Autenticado', description: 'Necessita de sessão iniciada.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const projectsCollection = collection(db, 'projects');
      const newProjectRef = doc(projectsCollection);
      const projectId = newProjectRef.id;

      const numBudget = parseFloat(budgetAOA) || 0;
      const parsedDays = parseInt(durationDays) || 45;
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(startDateTime.getTime() + parsedDays * 86400000);

      const newProjectData: Omit<Project, 'id'> = {
        name: name.trim(),
        code: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
        type: currentSector.projectType,
        category: 'Construção',
        priority: 'Alta',
        lifecycleStage: 'planning',
        budget: numBudget,
        contractValue: numBudget,
        approvedBudget: numBudget,
        committedCost: 0,
        actualCost: 0,
        availableBalance: numBudget,
        progress: 0,
        physicalProgress: 0,
        financialProgress: 0,
        scheduleProgress: 0,
        status: 'Planeamento',
        ownerId: user.uid,
        organizationId: activeOrganization?.id || 'org_default_profundidade',
        createdAt: new Date(),
        startDate: startDateTime,
        endDate: endDateTime,
        location: locationAddress.trim() ? { 
          address: locationAddress.trim(),
        } : undefined,
        clientName: clientName.trim() || undefined,
        clientEmail: fiscalEmail.trim() || undefined,
        director: directorName.trim() || undefined,
        leadEngineer: fieldLeaderName.trim() || undefined,
        inspector: fiscalName.trim() || undefined,
      };

      // 1. Gravar documento principal do projeto
      await setDoc(newProjectRef, newProjectData);

      // 2. Aplicar template selecionado nos bastidores
      if (useTemplate && currentSector.templateId) {
        await applyProjectTemplate(projectId, currentSector.templateId, numBudget);
      }

      // 3. Adicionar membros da equipa apenas se fornecidos
      const teamCollection = collection(db, 'projects', projectId, 'team');
      if (directorName.trim()) {
        await setDoc(doc(teamCollection, 'member-director'), {
          displayName: directorName.trim(),
          email: directorEmail.trim() || '',
          role: 'Gestor',
          joinedAt: new Date()
        });
      }
      if (fiscalName.trim()) {
        await setDoc(doc(teamCollection, 'member-fiscal'), {
          displayName: fiscalName.trim(),
          email: fiscalEmail.trim() || '',
          role: 'Visualizador',
          joinedAt: new Date()
        });
      }
      if (fieldLeaderName.trim()) {
        await setDoc(doc(teamCollection, 'member-field'), {
          displayName: fieldLeaderName.trim(),
          email: '',
          role: 'Mestre de Obra',
          joinedAt: new Date()
        });
      }

      toast({
        title: '🎉 Projeto Criado com Sucesso!',
        description: `EAP, CPUs e atividades geradas automaticamente nos bastidores.`
      });

      onOpenChange(false);
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Erro ao criar projeto via wizard:', err);
      toast({ title: 'Erro ao Criar Projeto', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Criar Projeto Guiado
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              Etapa {step} de 5
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            “Complexidade nos bastidores. Simplicidade na operação.”
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Progresso em 5 Etapas */}
        <div className="py-1">
          <Progress value={(step / 5) * 100} className="h-1.5" />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-medium">
            <span className={step >= 1 ? 'text-primary font-bold' : ''}>1. Tipo</span>
            <span className={step >= 2 ? 'text-primary font-bold' : ''}>2. Perguntas</span>
            <span className={step >= 3 ? 'text-primary font-bold' : ''}>3. Dados</span>
            <span className={step >= 4 ? 'text-primary font-bold' : ''}>4. Orçamento</span>
            <span className={step >= 5 ? 'text-primary font-bold' : ''}>5. Confirmar</span>
          </div>
        </div>

        {/* ─────────────────── ETAPA 1: QUAL É O TIPO DE PROJETO? ─────────────────── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Qual é o tipo de projeto?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha a natureza do trabalho. O sistema adapta os formulários e bastidores automaticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROJECT_SECTORS.map(sec => {
                const Icon = sec.icon;
                const isSel = selectedSectorId === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSector(sec.id)}
                    className={`p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                      isSel 
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${sec.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate">{sec.name}</span>
                        {isSel && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {sec.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs font-medium">Modo de criação:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={useTemplate ? 'default' : 'outline'}
                  onClick={() => setUseTemplate(true)}
                  className="text-xs h-8"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Usar Modelo Inteligente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!useTemplate ? 'default' : 'outline'}
                  onClick={() => setUseTemplate(false)}
                  className="text-xs h-8"
                >
                  Começar do Zero
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── ETAPA 2: O SISTEMA FAZ PERGUNTAS (ADAPTATIVO) ─────────────────── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-xl border">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Assistente Profundidade</span>
              <h3 className="text-sm font-bold text-foreground mt-0.5">
                Vamos configurar sua obra de {currentSector.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Responda às questões rápidas para construirmos a estrutura sem complexidade técnica.
              </p>
            </div>

            {/* Perguntas se for Obra de Pintura */}
            {selectedSectorId === 'pintura' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">O que será pintado?</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {(['Interior', 'Exterior', 'Interior e exterior'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPaintScope(opt)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          paintScope === opt
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Como pretende medir o serviço?</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {(['m²', 'Valor global', 'Homem-dia'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setMeasurementType(opt)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          measurementType === opt
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-muted'
                        }`}
                      >
                        {opt === 'm²' ? '📐 Por metro quadrado (m²)' : opt === 'Valor global' ? '💰 Valor Global' : '⏱️ Homem-dia'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Perguntas se for Construção Civil / Edifício */}
            {selectedSectorId === 'edificio' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Qual é a tipologia da construção?</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {['Edifício Multifamiliar', 'Moradia Unifamiliar', 'Armazém / Industrial'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setBuildingType(opt)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          buildingType === opt
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Como pretende dividir esta obra?</Label>
                  <div className="p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="font-semibold text-foreground">Frentes automáticas:</span>
                    <p className="text-muted-foreground mt-1">
                      Preparação ➔ Fundações ➔ Estrutura ➔ Alvenaria ➔ Acabamentos ➔ Instalações
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
                      ✓ A EAP (WBS) e os centros de custo são criados automaticamente por trás.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Outros setores */}
            {selectedSectorId !== 'pintura' && selectedSectorId !== 'edificio' && (
              <div className="p-4 rounded-xl border bg-muted/30 text-xs space-y-2">
                <span className="font-bold text-foreground">Configuração Rápida do Modelo {currentSector.name}:</span>
                <p className="text-muted-foreground leading-relaxed">
                  O Profundidade preparou {activeTemplate.wbsItems.length} atividades essenciais, {activeTemplate.cpus.length} composições de preços unitários e duração recomendada de {activeTemplate.durationDays} dias.
                </p>
                <div className="flex gap-2 pt-1 text-[11px] font-medium text-primary">
                  <span>• Indicadores Prontos</span>
                  <span>• Unidades Padronizadas</span>
                  <span>• Sem Necessidade de Treinamento</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── ETAPA 3: INFORMAÇÕES BÁSICAS & PRAZO ─────────────────── */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Nome da Obra / Empreitada *</Label>
              <Input
                placeholder={`Ex: ${activeTemplate?.name || 'Construção Edifício Residencial'}`}
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 text-sm font-medium"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Cliente / Dono da Obra</Label>
              <Input
                placeholder="Ex: Direção Provincial de Obras Públicas / Cliente Privado"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Data de Início Prevista</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Prazo de Execução (Dias)</Label>
                <Input
                  type="number"
                  value={durationDays}
                  onChange={e => setDurationDays(e.target.value)}
                  className="mt-1 text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold">Localização / Estaleiro</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCaptureGps}
                  disabled={fetchingGps}
                  className="h-6 text-[11px] text-primary gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  {fetchingGps ? 'A capturar...' : 'Capturar GPS'}
                </Button>
              </div>
              <Input
                placeholder="Ex: Talatona, Luanda (ou clique em Capturar GPS)"
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        )}

        {/* ─────────────────── ETAPA 4: ORÇAMENTO & EQUIPA (COM OPÇÕES AVANÇADAS OCULTAS) ─────────────────── */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Orçamento Total Estimado (Kz) *</Label>
              <div className="relative mt-1">
                <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Ex: 50000000"
                  value={budgetAOA}
                  onChange={e => setBudgetAOA(e.target.value)}
                  className="pl-9 font-mono font-bold text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Distribuído automaticamente pelas frentes de trabalho.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Responsáveis Imediatos
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Diretor / Engenheiro de Obra</Label>
                  <Input
                    placeholder="Ex: Eng. Manuel dos Santos"
                    value={directorName}
                    onChange={e => setDirectorName(e.target.value)}
                    className="mt-1 text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Fiscal / Representante</Label>
                  <Input
                    placeholder="Ex: Consórcio de Fiscalização"
                    value={fiscalName}
                    onChange={e => setFiscalName(e.target.value)}
                    className="mt-1 text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px]">Mestre de Obra / Apontador (Campo)</Label>
                <Input
                  placeholder="Ex: Mestre João Batista"
                  value={fieldLeaderName}
                  onChange={e => setFieldLeaderName(e.target.value)}
                  className="mt-1 text-xs h-8"
                />
              </div>
            </div>

            {/* ⚙ OPÇÕES AVANÇADAS (RECOLHIDAS PARA NÃO INTIMIDAR O UTILIZADOR) */}
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions} className="border rounded-xl p-3 bg-card">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    ⚙ Opções Avançadas (Opcional)
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px]">Moeda de Referência</Label>
                    <Input
                      value={currencySecondary}
                      onChange={e => setCurrencySecondary(e.target.value)}
                      className="mt-1 text-xs h-8 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Margem de Contingência (%)</Label>
                    <Input
                      type="number"
                      value={contingencyPct}
                      onChange={e => setContingencyPct(e.target.value)}
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Jornada de Trabalho</Label>
                    <Input
                      value={workSchedule}
                      onChange={e => setWorkSchedule(e.target.value)}
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* ─────────────────── ETAPA 5: CONFIRMAÇÃO & RESUMO ─────────────────── */}
        {step === 5 && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground">{name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clientName} • {locationAddress}
                  </p>
                </div>
                <Badge className="bg-primary text-primary-foreground">{currentSector.name}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-primary/10 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Orçamento</span>
                  <div className="text-xs font-mono font-bold text-foreground mt-0.5">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(parseFloat(budgetAOA) || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Prazo Estimado</span>
                  <div className="text-xs font-semibold text-foreground mt-0.5">
                    {durationDays} dias
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Medição</span>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedSectorId === 'pintura' ? measurementType : 'EAP & Medições'}
                  </div>
                </div>
              </div>
            </div>

            {/* O que o sistema vai fazer por trás */}
            <div className="p-3.5 rounded-xl border bg-muted/30 text-xs space-y-2">
              <span className="font-bold text-foreground">O que o Profundidade preparou nos bastidores:</span>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Criação de {activeTemplate.wbsItems.length} atividades estruturadas e prazos calculados.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Caderno de medição pronto para apontamentos de campo em 15 segundos.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Painel de "Próximas Ações" para guiar a equipa diariamente.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-3 border-t">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((step - 1) as any)}
              disabled={isSubmitting}
              className="text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (step === 3 && !name.trim()) {
                  toast({ title: 'Atenção', description: 'Por favor, indique o nome do projeto.', variant: 'destructive' });
                  return;
                }
                setStep((step + 1) as any);
              }}
              className="text-xs"
            >
              Próxima Etapa
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleFinalizeProject}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  A Configurar Bastidores...
                </>
              ) : (
                <>
                  <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                  Criar Projeto e Iniciar Execução →
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
