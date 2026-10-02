'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ClipboardCheck, 
  Fuel, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CloudSun, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  HardHat, 
  Truck, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Ruler,
  Check
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getBrowserLocation, type GeoLocationResult } from '@/lib/geo-utils';
import { calculateCascadingConsumption, type ProductionItemType } from '@/lib/cascading-consumption';

interface FieldOperationViewProps {
  projectId: string;
  projectName: string;
  onSwitchToFullView?: () => void;
}

interface OfflineAction {
  id: string;
  type: 'daily_report' | 'fuel_log' | 'photo_incident' | 'quick_measurement';
  timestamp: string;
  payload: any;
}

export function FieldOperationView({ projectId, projectName, onSwitchToFullView }: FieldOperationViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Estado de conectividade e offline
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modais de Ação Rápida de Campo (Mobile First)
  const [openMeasureModal, setOpenMeasureModal] = useState(false);
  const [openDailyModal, setOpenDailyModal] = useState(false);
  const [openFuelModal, setOpenFuelModal] = useState(false);
  const [openPhotoModal, setOpenPhotoModal] = useState(false);

  // Atividades reais da EAP carregadas para medição em 15 segundos
  const [wbsActivities, setWbsActivities] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [measureQty, setMeasureQty] = useState('');
  const [measurePhotoPreview, setMeasurePhotoPreview] = useState<string | null>(null);
  const measurePhotoInputRef = React.useRef<HTMLInputElement>(null);

  // Localização e Clima Automáticos
  const [geoState, setGeoState] = useState<GeoLocationResult | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // 1. Dados do Diário / Presenças (Modal 1)
  const [directWorkers, setDirectWorkers] = useState('');
  const [subWorkers, setSubWorkers] = useState('');
  const [workFront, setWorkFront] = useState('');
  const [servicesDone, setServicesDone] = useState('');
  const [productionItem, setProductionItem] = useState<ProductionItemType>('betao_estrutural');
  const [productionQty, setProductionQty] = useState('');
  const [confirmCascading, setConfirmCascading] = useState(true);

  // 2. Dados do Combustível / Horímetro (Modal 2)
  const [equipmentList, setEquipmentList] = useState<{ id: string; name: string; currentHours?: number }[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [startHourMeter, setStartHourMeter] = useState('');
  const [endHourMeter, setEndHourMeter] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelNotes, setFuelNotes] = useState('');

  // 3. Dados da Foto / Ocorrência (Modal 3)
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentCategory, setIncidentCategory] = useState<'Avanço Físico' | 'Qualidade' | 'Segurança HSEQ'>('Avanço Físico');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMeasurePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMeasurePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Carregar atividades da EAP para a medição rápida em 15 segundos
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(query(collection(db, 'projects', projectId, 'wbs')), (snapshot) => {
      if (!snapshot.empty) {
        const acts = snapshot.docs.map(d => {
          const data = d.data();
          let unit = 'un';
          const name = data.name || '';
          const lower = name.toLowerCase();
          if (lower.includes('betão') || lower.includes('escava') || lower.includes('aterro') || lower.includes('areia') || lower.includes('brita')) {
            unit = 'm³';
          } else if (lower.includes('alvenaria') || lower.includes('pintura') || lower.includes('pavimento') || lower.includes('reboco') || lower.includes('revestimento') || lower.includes('isolamento')) {
            unit = 'm²';
          } else if (lower.includes('tubagem') || lower.includes('vala') || lower.includes('cabo') || lower.includes('guia') || lower.includes('vedação')) {
            unit = 'm';
          } else if (lower.includes('aço') || lower.includes('ferro') || lower.includes('armadura')) {
            unit = 'kg';
          }
          return {
            id: d.id,
            name: name || 'Atividade da Obra',
            unit,
          };
        });
        setWbsActivities(acts);
        if (acts.length > 0 && !selectedActivityId) {
          setSelectedActivityId(acts[0].id);
        }
      } else {
        setWbsActivities([]);
      }
    }, (err) => {
      console.warn('Erro ao carregar atividades EAP para campo:', err);
      setWbsActivities([]);
    });

    const unsubEquip = onSnapshot(query(collection(db, 'projects', projectId, 'equipment')), (snapshot) => {
      if (!snapshot.empty) {
        const eqs = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Equipamento',
            currentHours: typeof data.currentHours === 'number' ? data.currentHours : 0
          };
        });
        setEquipmentList(eqs);
        if (eqs.length > 0) {
          setSelectedEquipmentId(eqs[0].id);
          setEquipmentName(eqs[0].name);
          setStartHourMeter(String(eqs[0].currentHours || 0));
          setEndHourMeter(String((eqs[0].currentHours || 0) + 8));
        }
      } else {
        setEquipmentList([]);
      }
    }, (err) => {
      console.warn('Erro ao carregar equipamentos de campo:', err);
      setEquipmentList([]);
    });

    const unsubWorkforce = onSnapshot(query(collection(db, 'projects', projectId, 'workforce')), (snapshot) => {
      if (!snapshot.empty) {
        const members = snapshot.docs.map(d => d.data());
        const own = members.filter(m => (m as any).type === 'Própria' || !(m as any).subcontractorId).length;
        const sub = members.filter(m => (m as any).type === 'Subempreiteiro' || !!(m as any).subcontractorId).length;
        if (own > 0) setDirectWorkers(String(own));
        if (sub > 0) setSubWorkers(String(sub));
      }
    }, (err) => {
      console.warn('Erro ao carregar efetivos de campo:', err);
    });

    return () => {
      unsub();
      unsubEquip();
      unsubWorkforce();
    };
  }, [projectId]);

  // Monitorização de conectividade e carregamento de fila local
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const saved = localStorage.getItem(`field_offline_queue_${projectId}`);
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {
        console.warn('Erro ao carregar fila offline:', e);
      }
    }

    // Ouvir comandos rápidos da busca universal ou atalhos
    const handleAction = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail === 'open_measurement' || custom.detail === 'open_measure' || custom.detail === 'open_field_measurement') setOpenMeasureModal(true);
      if (custom.detail === 'open_daily_report') setOpenDailyModal(true);
      if (custom.detail === 'open_fuel_log') setOpenFuelModal(true);
      if (custom.detail === 'open_photo_incident') setOpenPhotoModal(true);
    };
    window.addEventListener('profundidade_run_action', handleAction);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('profundidade_run_action', handleAction);
    };
  }, [projectId]);

  // Atualiza GPS automaticamente
  const refreshLocation = async () => {
    setLoadingGeo(true);
    const res = await getBrowserLocation();
    setGeoState(res);
    setLoadingGeo(false);
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  // Cálculo em cascata automático com base na produção digitada
  const cascadingResults = useMemo(() => {
    const num = parseFloat(productionQty) || 0;
    if (num <= 0) return null;
    return calculateCascadingConsumption(productionItem, num);
  }, [productionItem, productionQty]);

  // Salvamento Offline / Online Universal
  const saveAction = async (type: OfflineAction['type'], payload: any) => {
    const actionItem: OfflineAction = {
      id: `offline_${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      payload
    };

    if (!isOnline) {
      const nextQueue = [actionItem, ...offlineQueue];
      setOfflineQueue(nextQueue);
      localStorage.setItem(`field_offline_queue_${projectId}`, JSON.stringify(nextQueue));
      toast({
        title: 'Guardado Localmente (Offline)',
        description: 'Sem sinal de internet no estaleiro. O registo será sincronizado assim que houver rede.',
      });
      return;
    }

    // Se estiver online, grava diretamente no Firestore
    try {
      if (type === 'quick_measurement') {
        await addDoc(collection(db, 'projects', projectId, 'measurements'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'Medição Registada (15s)!', description: `${payload.quantity} ${payload.unit} de "${payload.activityName}" gravados com sucesso.` });
      } else if (type === 'daily_report') {
        await addDoc(collection(db, 'projects', projectId, 'daily-reports'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'Diário de Obra Registado!', description: 'Presenças e tarefas guardadas com sucesso.' });
      } else if (type === 'fuel_log') {
        await addDoc(collection(db, 'projects', projectId, 'equipmentUsageLogs'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'Horímetro & Gasóleo Apontados!', description: 'Registo de abastecimento efetuado.' });
      } else if (type === 'photo_incident') {
        await addDoc(collection(db, 'projects', projectId, 'incidents'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'Registo com Foto Criado!', description: 'Ocorrência e geolocalização guardadas.' });
      }
    } catch (err: any) {
      console.warn('Falha no upload imediato. Guardando na fila offline:', err);
      const nextQueue = [actionItem, ...offlineQueue];
      setOfflineQueue(nextQueue);
      localStorage.setItem(`field_offline_queue_${projectId}`, JSON.stringify(nextQueue));
      toast({
        title: 'Guardado no Dispositivo',
        description: 'Falha temporária de rede. Fila offline atualizada.',
      });
    }
  };

  // Sincronizar Fila Offline
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !isOnline) return;
    setIsSyncing(true);
    try {
      for (const item of offlineQueue) {
        if (item.type === 'quick_measurement') {
          await addDoc(collection(db, 'projects', projectId, 'measurements'), {
            ...item.payload,
            createdAt: Timestamp.now(),
          });
        } else if (item.type === 'daily_report') {
          await addDoc(collection(db, 'projects', projectId, 'daily-reports'), {
            ...item.payload,
            createdAt: Timestamp.now(),
          });
        } else if (item.type === 'fuel_log') {
          await addDoc(collection(db, 'projects', projectId, 'equipmentUsageLogs'), {
            ...item.payload,
            createdAt: Timestamp.now(),
          });
        } else if (item.type === 'photo_incident') {
          await addDoc(collection(db, 'projects', projectId, 'incidents'), {
            ...item.payload,
            createdAt: Timestamp.now(),
          });
        }
      }
      setOfflineQueue([]);
      localStorage.removeItem(`field_offline_queue_${projectId}`);
      toast({ title: 'Sincronização Concluída!', description: `${offlineQueue.length} registos enviados para o servidor.` });
    } catch (e: any) {
      toast({ title: 'Erro de Sincronização', description: e.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Submissão do Modal 0: Medição Rápida (15s)
  const handleSaveQuickMeasurement = async () => {
    const act = wbsActivities.find(a => a.id === selectedActivityId);
    const qty = parseFloat(measureQty) || 0;
    if (qty <= 0) {
      toast({
        title: 'Quantidade Obrigatória',
        description: 'Por favor, indique a quantidade executada na atividade.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      activityId: act ? act.id : 'manual',
      activityName: act?.name || selectedActivityId || 'Atividade de Campo',
      quantity: qty,
      unit: act?.unit || 'un',
      photoUrl: measurePhotoPreview || null,
      gps: geoState?.formattedCoordinates || 'Coordenadas não disponíveis',
      date: new Date().toISOString(),
      author: user?.displayName || 'Apontador de Campo',
      authorId: user?.uid || 'field-user',
      projectId,
    };

    await saveAction('quick_measurement', payload);
    setOpenMeasureModal(false);
    setMeasureQty('');
    setMeasurePhotoPreview(null);
  };

  // Submissão do Modal 1: Diário / Presenças
  const handleSaveDaily = async () => {
    const payload = {
      date: new Date().toISOString().split('T')[0],
      directLaborCount: parseInt(directWorkers) || 0,
      subcontractorLaborCount: parseInt(subWorkers) || 0,
      workFronts: [workFront],
      workSummary: servicesDone || 'Trabalhos executados de acordo com o planeamento diário.',
      production: productionQty ? {
        itemType: productionItem,
        quantity: parseFloat(productionQty),
        estimatedMaterials: confirmCascading && cascadingResults ? cascadingResults.calculatedMaterials : []
      } : null,
      gps: geoState?.formattedCoordinates || 'Coordenadas não disponíveis',
      weather: geoState?.weatherSuggestion || { period: 'Manhã', condition: 'Céu Limpo', temperatureApprox: 28 },
      authorName: user?.displayName || 'Encarregado de Campo',
      authorId: user?.uid || 'field-user',
    };

    await saveAction('daily_report', payload);
    setOpenDailyModal(false);
    setServicesDone('');
    setProductionQty('');
  };

  // Submissão do Modal 2: Combustível / Horímetro
  const handleSaveFuel = async () => {
    const hours = Math.max(0, (parseFloat(endHourMeter) || 0) - (parseFloat(startHourMeter) || 0));
    const activeEqName = equipmentName || (equipmentList.find(e => e.id === selectedEquipmentId)?.name) || 'Equipamento de Obra';
    const payload = {
      equipmentName: activeEqName,
      equipmentId: selectedEquipmentId || 'manual',
      date: new Date(),
      startHourMeter: parseFloat(startHourMeter) || 0,
      hourMeterReading: parseFloat(endHourMeter) || 0,
      hoursUsed: hours,
      fuelConsumed: parseFloat(fuelLiters) || 0,
      notes: fuelNotes,
      gps: geoState?.formattedCoordinates,
      author: {
        uid: user?.uid || 'field-user',
        displayName: user?.displayName || 'Apontador de Campo'
      },
      projectId
    };

    await saveAction('fuel_log', payload);
    setOpenFuelModal(false);
  };

  // Submissão do Modal 3: Foto / Ocorrência
  const handleSavePhoto = async () => {
    const payload = {
      title: incidentTitle || `Evidência Fotográfica - ${incidentCategory}`,
      description: incidentTitle || 'Registo fotográfico de inspeção em campo.',
      category: incidentCategory,
      severity: incidentCategory === 'Segurança HSEQ' ? 'Média' : 'Baixa',
      status: 'Aberto',
      date: new Date(),
      gps: geoState?.formattedCoordinates,
      photoUrl: photoPreview || '/placeholder-photo.jpg',
      author: user?.displayName || 'Apontador de Campo',
      projectId
    };

    await saveAction('photo_incident', payload);
    setOpenPhotoModal(false);
    setIncidentTitle('');
    setPhotoPreview(null);
  };

  return (
    <div className="min-h-[85vh] flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-6 select-none">
      {/* Barra de Status do Estaleiro: Conexão, GPS e Fila Offline */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 mb-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>{projectName}</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                Modo Operação / Campo
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span>{loadingGeo ? 'A obter GPS...' : geoState?.formattedCoordinates}</span>
              <span>•</span>
              <CloudSun className="h-3 w-3 text-amber-500" />
              <span>{geoState?.weatherSuggestion.condition} ({geoState?.weatherSuggestion.temperatureApprox}°C)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {offlineQueue.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={syncOfflineQueue}
              disabled={isSyncing || !isOnline}
              className="h-8 text-xs bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {offlineQueue.length} {offlineQueue.length === 1 ? 'Pendente' : 'Pendentes'} (Sincronizar)
            </Button>
          )}

          {onSwitchToFullView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToFullView}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              Visão Completa
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* OS 4 BOTÕES DE OPERAÇÃO DE CAMPO (Mobile First / PWA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 max-w-6xl mx-auto w-full mb-6">
        {/* BOTÃO 1: NOVA MEDIÇÃO RÁPIDA (15 SEGUNDOS) */}
        <button
          onClick={() => setOpenMeasureModal(true)}
          className="group relative flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-emerald-500/30 text-left min-h-[220px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
              <Ruler className="h-8 w-8 text-white" />
            </div>
            <Badge className="bg-white/20 text-white border-none text-[11px] font-semibold tracking-wide">
              ⚡ 15 Segundos
            </Badge>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
              Nova Medição Rápida
            </h3>
            <p className="text-xs text-emerald-100/90 font-normal leading-relaxed">
              Atividade → Quantidade → Foto → Guardar. 15 segundos para atualizar o avanço.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 group-hover:text-white mt-4 transition-colors">
            <span>Medir Agora</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* BOTÃO 2: REGISTAR DIÁRIO / PRESENÇAS */}
        <button
          onClick={() => setOpenDailyModal(true)}
          className="group relative flex flex-col justify-between p-5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-blue-500/30 text-left min-h-[220px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
              <ClipboardCheck className="h-8 w-8 text-white" />
            </div>
            <Badge className="bg-white/20 text-white border-none text-[11px] font-medium tracking-wide">
              60 Segundos
            </Badge>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
              Registar Diário & Presenças
            </h3>
            <p className="text-xs text-blue-100/90 font-normal leading-relaxed">
              Apontamento de efetivo em campo, frentes de serviço e produção executada no turno.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-200 group-hover:text-white mt-4 transition-colors">
            <span>Abrir Apontamento Guiado</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* BOTÃO 3: APONTAR COMBUSTÍVEL / HORÍMETRO */}
        <button
          onClick={() => setOpenFuelModal(true)}
          className="group relative flex flex-col justify-between p-5 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-amber-400/30 text-left min-h-[220px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
              <Fuel className="h-8 w-8 text-white" />
            </div>
            <Badge className="bg-white/20 text-white border-none text-[11px] font-medium tracking-wide">
              Horímetro + L
            </Badge>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
              Consumo de Gasóleo & Horas
            </h3>
            <p className="text-xs text-amber-100/90 font-normal leading-relaxed">
              Registo de abastecimento de escavadoras, camiões ou geradores e horas operadas.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 group-hover:text-white mt-4 transition-colors">
            <span>Lançar Abastecimento</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* BOTÃO 4: TIRAR FOTO / RELATAR OCORRÊNCIA */}
        <button
          onClick={() => setOpenPhotoModal(true)}
          className="group relative flex flex-col justify-between p-5 bg-gradient-to-br from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-purple-500/30 text-left min-h-[220px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <Badge className="bg-white/20 text-white border-none text-[11px] font-medium tracking-wide">
              GPS Automático
            </Badge>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight text-white mb-1">
              Tirar Foto & Ocorrência
            </h3>
            <p className="text-xs text-purple-100/90 font-normal leading-relaxed">
              Evidência de progresso, conferência de qualidade ou relato de segurança em 1 clique.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-200 group-hover:text-white mt-4 transition-colors">
            <span>Capturar Evidência</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Dica Operacional Rápida de Campo */}
      <div className="max-w-6xl mx-auto w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Operação Inteligente:</strong> Ao lançar produção física, os consumos de cimento e gasóleo são calculados automaticamente para confirmação sem necessidade de digitação duplicada.
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap ml-4">
          WAT / UTC+1
        </span>
      </div>

      {/* ─────────────────── MODAL 0: MEDIÇÃO RÁPIDA (15 SEGUNDOS) ─────────────────── */}
      <Dialog open={openMeasureModal} onOpenChange={setOpenMeasureModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Ruler className="h-5 w-5 text-emerald-600" />
              Medição Rápida de Campo (15s)
            </DialogTitle>
            <DialogDescription>
              Aponte o que foi executado hoje e valide com foto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Atividade */}
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                1. Qual é a atividade?
              </Label>
              {wbsActivities.length > 0 ? (
                <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                  <SelectTrigger className="mt-1 font-medium">
                    <SelectValue placeholder="Selecione a atividade da EAP" />
                  </SelectTrigger>
                  <SelectContent>
                    {wbsActivities.map((act) => (
                      <SelectItem key={act.id} value={act.id}>
                        {act.name} ({act.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-1 mt-1">
                  <Input
                    placeholder="Ex: Escavação manual, Assentamento de blocos..."
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sem atividades na EAP deste projeto. Indique a descrição da frente executada.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Quantidade */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  2. Quanto foi executado hoje?
                </Label>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Unidade: {wbsActivities.find(a => a.id === selectedActivityId)?.unit || 'un'}
                </span>
              </div>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: 25.5"
                  value={measureQty}
                  onChange={(e) => setMeasureQty(e.target.value)}
                  className="text-lg font-bold pl-4 pr-16 h-12"
                  autoFocus
                />
                <span className="absolute right-4 top-3 text-sm font-semibold text-muted-foreground">
                  {wbsActivities.find(a => a.id === selectedActivityId)?.unit || 'un'}
                </span>
              </div>
            </div>

            {/* 3. Foto de Comprovação */}
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                3. Foto de Comprovação (Opcional)
              </Label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={measurePhotoInputRef}
                onChange={handleMeasurePhotoCapture}
                className="hidden"
              />

              {!measurePhotoPreview ? (
                <button
                  type="button"
                  onClick={() => measurePhotoInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-600 dark:text-slate-400 text-xs font-medium transition-all"
                >
                  <Camera className="h-4 w-4 text-emerald-600" />
                  <span>Tirar Foto da Execução</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 h-28 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={measurePhotoPreview} alt="Comprovação" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between p-2">
                    <span className="text-[10px] text-white font-mono">
                      GPS: {geoState?.formattedCoordinates || 'Registado'}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setMeasurePhotoPreview(null)}
                      className="h-6 text-[10px] text-destructive hover:bg-white/20 p-1"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* GPS e Carimbo */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-900 rounded-lg p-2 font-mono">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-500" />
                {geoState?.formattedCoordinates || 'Coordenadas do dispositivo'}
              </span>
              <span>{isOnline ? '🟢 Online' : '🟠 Offline'}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenMeasureModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveQuickMeasurement}
              disabled={!measureQty || parseFloat(measureQty) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Guardar Medição ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 1: REGISTAR DIÁRIO / PRESENÇAS ─────────────────── */}
      <Dialog open={openDailyModal} onOpenChange={setOpenDailyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Registo Rápido de Diário & Efetivo (60s)
            </DialogTitle>
            <DialogDescription>
              Preenchimento guiado com georreferenciação automática.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Presenças */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mão de Obra Própria (Homens)</Label>
                <div className="relative mt-1">
                  <HardHat className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={directWorkers}
                    onChange={e => setDirectWorkers(e.target.value)}
                    className="pl-9 text-base font-semibold"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Subempreiteiros (Homens)</Label>
                <div className="relative mt-1">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={subWorkers}
                    onChange={e => setSubWorkers(e.target.value)}
                    className="pl-9 text-base font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Frente de Trabalho */}
            <div>
              <Label className="text-xs">Frente de Obra Ativa</Label>
              <Input
                value={workFront}
                onChange={e => setWorkFront(e.target.value)}
                className="mt-1"
                placeholder="Ex: Bloco 2, Lajes do Piso 1"
              />
            </div>

            {/* Produção Executada com Cálculo em Cascata */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Produção Declarada & Consumo Automático
                </span>
                <Badge variant="outline" className="text-[10px]">Automação</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Artigo Executado</Label>
                  <Select value={productionItem} onValueChange={(v: any) => setProductionItem(v)}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="betao_estrutural">Betão Estrutural (m³)</SelectItem>
                      <SelectItem value="alvenaria_bloco_15">Alvenaria Bloco 15 (m²)</SelectItem>
                      <SelectItem value="reboco_argamassa">Reboco de Parede (m²)</SelectItem>
                      <SelectItem value="terraplanagem_escavacao">Escavação / Aterro (m³)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Quantidade Feita</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 15"
                    value={productionQty}
                    onChange={e => setProductionQty(e.target.value)}
                    className="h-8 text-xs mt-1 font-semibold"
                  />
                </div>
              </div>

              {cascadingResults && cascadingResults.calculatedMaterials.length > 0 && (
                <div className="mt-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Consumo Teórico Calculado em Cascata:
                  </div>
                  <ul className="text-[11px] text-blue-800 dark:text-blue-300 space-y-0.5">
                    {cascadingResults.calculatedMaterials.map((mat, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>• {mat.materialName}:</span>
                        <strong className="font-mono">{mat.calculatedQty} {mat.unit}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-2 pt-1 border-t border-blue-200/60 dark:border-blue-800/60">
                    <input
                      type="checkbox"
                      id="confirmCascadingCheck"
                      checked={confirmCascading}
                      onChange={e => setConfirmCascading(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <label htmlFor="confirmCascadingCheck" className="text-[10px] text-blue-950 dark:text-blue-100 cursor-pointer">
                      Confirmar e debitar consumos teóricos no armazém da obra
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo dos Serviços */}
            <div>
              <Label className="text-xs">Observações do Turno</Label>
              <Textarea
                rows={2}
                value={servicesDone}
                onChange={e => setServicesDone(e.target.value)}
                placeholder="Ex: Betonagem concluída às 15:30 com 2 camiões betoneira. Sem desvios."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDailyModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveDaily} className="bg-blue-600 hover:bg-blue-700">
              Gravar Registo (Salvar)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 2: APONTAR COMBUSTÍVEL / HORÍMETRO ─────────────────── */}
      <Dialog open={openFuelModal} onOpenChange={setOpenFuelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Fuel className="h-5 w-5 text-amber-500" />
              Apontamento de Gasóleo & Horímetro
            </DialogTitle>
            <DialogDescription>
              Telemetria de campo rápida com cálculo automático de horas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Equipamento / Máquina da Obra</Label>
              {equipmentList.length > 0 ? (
                <Select 
                  value={selectedEquipmentId} 
                  onValueChange={(eqId) => {
                    setSelectedEquipmentId(eqId);
                    const found = equipmentList.find(e => e.id === eqId);
                    if (found) {
                      setEquipmentName(found.name);
                      const baseHrs = found.currentHours || 0;
                      setStartHourMeter(String(baseHrs));
                      setEndHourMeter(String(baseHrs + 8));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o equipamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentList.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} {eq.currentHours !== undefined ? `(${eq.currentHours}h)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-1 mt-1">
                  <Input
                    placeholder="Ex: Gerador 250 kVA, Camião Basculante..."
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sem máquinas cadastradas na frota deste projeto. Indique o equipamento diretamente.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground block">Duração Rápida do Turno:</Label>
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {[4, 8, 10].map(hrs => (
                  <Button
                    key={hrs}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 rounded-full bg-muted/40 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                    onClick={() => {
                      const start = parseFloat(startHourMeter) || 0;
                      setEndHourMeter((start + hrs).toFixed(1));
                    }}
                  >
                    +{hrs}h {hrs === 8 ? '(Turno Completo)' : hrs === 4 ? '(Meio Turno)' : ''}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horímetro Inicial (h)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={startHourMeter}
                  onChange={e => setStartHourMeter(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Horímetro Final (h)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={endHourMeter}
                  onChange={e => setEndHourMeter(e.target.value)}
                  className="mt-1 font-mono text-sm font-semibold text-primary"
                />
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex justify-between items-center text-xs">
              <span className="text-amber-900 dark:text-amber-200">Horas Trabalhadas no Turno:</span>
              <strong className="font-mono text-sm text-amber-950 dark:text-amber-100">
                {Math.max(0, (parseFloat(endHourMeter) || 0) - (parseFloat(startHourMeter) || 0)).toFixed(1)} h
              </strong>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Gasóleo Abastecido (Litros)</Label>
                <div className="flex gap-1">
                  {[20, 50, 100, 200].map(vol => (
                    <button
                      key={vol}
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/20 hover:bg-amber-50 hover:text-amber-800"
                      onClick={() => setFuelLiters(String(vol))}
                    >
                      +{vol}L
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Fuel className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={fuelLiters}
                  onChange={e => setFuelLiters(e.target.value)}
                  className="pl-9 font-semibold text-base"
                  placeholder="Ex: 120"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Notas / Operador</Label>
              <Input
                value={fuelNotes}
                onChange={e => setFuelNotes(e.target.value)}
                className="mt-1 text-xs"
                placeholder="Ex: Turno Diurno - Abastecimento cisterna móvel"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFuelModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveFuel} className="bg-amber-600 hover:bg-amber-700 text-white">
              Guardar Abastecimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── MODAL 3: FOTO & OCORRÊNCIA ─────────────────── */}
      <Dialog open={openPhotoModal} onOpenChange={setOpenPhotoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-emerald-600" />
              Capturar Foto & Ocorrência de Campo
            </DialogTitle>
            <DialogDescription>
              Foto com carimbo de coordenadas e hora WAT extraídos automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Tipo de Registo</Label>
              <Select value={incidentCategory} onValueChange={(v: any) => setIncidentCategory(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Avanço Físico">Avanço Físico / Medição</SelectItem>
                  <SelectItem value="Qualidade">Inspeção de Qualidade / Armaduras</SelectItem>
                  <SelectItem value="Segurança HSEQ">Segurança & Meio Ambiente (HSEQ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Título / Descrição da Evidência</Label>
              <Input
                value={incidentTitle}
                onChange={e => setIncidentTitle(e.target.value)}
                placeholder="Ex: Conclusão da armadura da sapata S-04"
                className="mt-1"
              />
            </div>

            {/* Captura de Imagem Real com Câmara do Dispositivo / Upload */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={photoInputRef}
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {!photoPreview ? (
              <div 
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl p-6 text-center hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-2 text-emerald-600 group-hover:scale-105 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-foreground">
                  Tirar Foto com a Câmara do Telemóvel
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ou clique para carregar imagem do ficheiro
                </p>
                <div className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono">
                  <MapPin className="h-3 w-3" />
                  GPS Oficial: {geoState?.formattedCoordinates || 'WAT UTC+1'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 max-h-56 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={photoPreview} 
                    alt="Evidência fotográfica" 
                    className="w-full h-48 object-cover" 
                  />
                  {/* Tarja Técnica de Estaleiro (Carimbo OEA / Georreferenciação) */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm p-2 text-white text-[10px] font-mono flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-400 uppercase">{incidentCategory}</span>
                      <span>{new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} WAT</span>
                    </div>
                    <div className="text-slate-300 truncate mt-0.5">
                      GPS: {geoState?.formattedCoordinates || 'Extraído'} • {projectName}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Trocar Foto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPhotoPreview(null)}
                    className="text-xs h-7 text-destructive hover:bg-destructive/10"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPhotoModal(false)}>Cancelar</Button>
            <Button onClick={handleSavePhoto} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Registar Evidência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
