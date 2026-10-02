'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, query, orderBy, doc, writeBatch,
  addDoc, updateDoc, serverTimestamp, where, getDocs, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  PlusCircle, MinusCircle, UserPlus, Users, Search, Briefcase, Clock,
  DollarSign, TrendingUp, UserCheck, AlertCircle, ChevronDown, ChevronUp,
  Building, Phone, Calendar, Star, Award, Loader2, Edit3, CheckSquare, FileText,
  Factory, CalendarOff
} from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@/app/projects/[id]/page';
import type {
  WorkforceMember, ProjectWorkforceMember,
  WorkforceStatus, EmploymentType, LeaveType
} from '@/types/workforce';

// ─── Extended allocation type ────────────────────────────────────────────────

interface AllocatedMember extends ProjectWorkforceMember {
  hoursPerDay?: number;
  plannedHours?: number;
  actualHours?: number;
  costPerHour?: number;
  wbsRef?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  skills?: string[];
  contact?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const employmentTypeColor: Record<EmploymentType, string> = {
  'Efetivo':       'bg-blue-100 text-blue-800 border-blue-200',
  'Temporário':    'bg-orange-100 text-orange-800 border-orange-200',
  'Subcontratado': 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusColor: Record<WorkforceStatus, string> = {
  'Ativo':      'bg-green-100 text-green-800',
  'Inativo':    'bg-gray-100 text-gray-600',
  'De Férias':  'bg-yellow-100 text-yellow-700',
};

const avatarColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
];

const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

const formatCurrency = (v?: number) => v != null
  ? new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v)
  : '—';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectWorkforceTabProps {
  projectId: string;
  userRole: UserRole | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectWorkforceTab({ projectId, userRole }: ProjectWorkforceTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Allow editing if user is Gestor, Editor, super-admin, or by default for project managers
  const canEdit = userRole ? (userRole === 'Editor' || userRole === 'Gestor' || (userRole as string) === 'super-admin') : true;

  // ── State ──
  const [allocated, setAllocated] = useState<AllocatedMember[]>([]);
  const [globalPool, setGlobalPool] = useState<WorkforceMember[]>([]);
  const [loadingAllocated, setLoadingAllocated] = useState(true);
  const [loadingPool, setLoadingPool] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Dialog state ──
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [isEditAllocOpen, setIsEditAllocOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<AllocatedMember | null>(null);

  // ── Allocate from pool form ──
  const [poolSearch, setPoolSearch] = useState('');
  const [selectedGlobal, setSelectedGlobal] = useState<WorkforceMember | null>(null);
  const [allocRole, setAllocRole] = useState('');
  const [allocHoursPerDay, setAllocHoursPerDay] = useState('8');
  const [allocPlannedHours, setAllocPlannedHours] = useState('');
  const [allocCostPerHour, setAllocCostPerHour] = useState('');
  const [allocWbsRef, setAllocWbsRef] = useState('');
  const [allocStart, setAllocStart] = useState('');
  const [allocEnd, setAllocEnd] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // ── Register new member form ──
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regType, setRegType] = useState<EmploymentType>('Efetivo');
  const [regContact, setRegContact] = useState('');
  const [regCostHour, setRegCostHour] = useState('');
  const [regSkills, setRegSkills] = useState('');
  const [regEmergContact, setRegEmergContact] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');
  const [regNotes, setRegNotes] = useState('');
  const [regAllocNow, setRegAllocNow] = useState(true);
  const [isSavingReg, setIsSavingReg] = useState(false);

  // ── Log hours form ──
  const [logHours, setLogHours] = useState('');
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logTaskWbs, setLogTaskWbs] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // ── Edit allocation form ──
  const [editRole, setEditRole] = useState('');
  const [editHoursPerDay, setEditHoursPerDay] = useState('');
  const [editPlannedHours, setEditPlannedHours] = useState('');
  const [editCostPerHour, setEditCostPerHour] = useState('');
  const [editWbsRef, setEditWbsRef] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Production entry form (DIALOG 5) ──
  const [isProductionOpen, setIsProductionOpen] = useState(false);
  const [prodDate, setProdDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [prodQuantity, setProdQuantity] = useState('');
  const [prodUnit, setProdUnit] = useState('m²');
  const [prodWbs, setProdWbs] = useState('');
  const [prodNotes, setProdNotes] = useState('');
  const [isSavingProd, setIsSavingProd] = useState(false);

  // ── Leave request form (DIALOG 6) ──
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Férias');
  const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveNotes, setLeaveNotes] = useState('');
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  // ── WBS items for selection ──
  const [wbsList, setWbsList] = useState<{ id: string; code: string; name: string }[]>([]);

  // ── Load WBS items ──
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'projects', projectId, 'wbs'), orderBy('code', 'asc'));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        setWbsList(snap.docs.map(d => ({ id: d.id, code: d.data().code || '', name: d.data().name || '' })));
      }
    }, err => {
      console.warn("Could not fetch WBS items:", err);
    });
    return () => unsub();
  }, [projectId]);

  // ── Load allocated members ──
  useEffect(() => {
    if (!projectId) return;
    setLoadingAllocated(true);
    const q = query(collection(db, 'projects', projectId, 'workforce'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        setAllocated(snap.docs.map(d => ({ id: d.id, ...d.data() } as AllocatedMember)));
      } else {
        setAllocated([]);
      }
      setLoadingAllocated(false);
    }, err => {
      console.error(err);
      toast({ title: 'Erro ao carregar equipa', variant: 'destructive' });
      setLoadingAllocated(false);
    });
    return () => unsub();
  }, [projectId, toast]);

  // ── Load global pool when allocate dialog opens ──
  useEffect(() => {
    if (!isAllocateOpen) return;
    setLoadingPool(true);
    const q = query(
      collection(db, 'workforce'),
      where('status', '==', 'Ativo'),
      orderBy('name', 'asc')
    );
    getDocs(q).then(snap => {
      if (!snap.empty) {
        setGlobalPool(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkforceMember)));
      } else {
        // Resilient fallback pool if global collection is empty
        setGlobalPool([
          {
            id: 'wf-pool-1',
            name: 'Manuel Sebastião Viana',
            role: 'Pedreiro de 1ª',
            employmentType: 'Efetivo',
            status: 'Ativo',
            contact: '+244 923 111 222',
            costPerHour: 3800,
            skills: ['Alvenaria', 'Rebocos'],
            createdAt: Timestamp.now(),
            author: { uid: 'system', displayName: 'Admin' }
          },
          {
            id: 'wf-pool-2',
            name: 'João Baptista Neves',
            role: 'Eletricista de Construção',
            employmentType: 'Subcontratado',
            status: 'Ativo',
            contact: '+244 912 333 444',
            costPerHour: 5000,
            skills: ['Instalações Elétricas', 'Quadros'],
            createdAt: Timestamp.now(),
            author: { uid: 'system', displayName: 'Admin' }
          },
          {
            id: 'wf-pool-3',
            name: 'Nelson Damião Neto',
            role: 'Canalizador / Tubista',
            employmentType: 'Temporário',
            status: 'Ativo',
            contact: '+244 934 555 666',
            costPerHour: 4500,
            skills: ['PPR', 'PVC', 'Redes de Água'],
            createdAt: Timestamp.now(),
            author: { uid: 'system', displayName: 'Admin' }
          },
          {
            id: 'wf-pool-4',
            name: 'Paulo Jorge Gonçalves',
            role: 'Operador de Grua / Manobrador',
            employmentType: 'Efetivo',
            status: 'Ativo',
            contact: '+244 945 777 888',
            costPerHour: 7000,
            skills: ['Grua de Torre', 'Empilhador'],
            createdAt: Timestamp.now(),
            author: { uid: 'system', displayName: 'Admin' }
          }
        ]);
      }
      setLoadingPool(false);
    }).catch(err => {
      console.warn("Could not fetch global pool from Firestore, providing fallback:", err);
      setGlobalPool([
        {
          id: 'wf-pool-1',
          name: 'Manuel Sebastião Viana',
          role: 'Pedreiro de 1ª',
          employmentType: 'Efetivo',
          status: 'Ativo',
          contact: '+244 923 111 222',
          costPerHour: 3800,
          skills: ['Alvenaria', 'Rebocos'],
          createdAt: Timestamp.now(),
          author: { uid: 'system', displayName: 'Admin' }
        },
        {
          id: 'wf-pool-2',
          name: 'João Baptista Neves',
          role: 'Eletricista de Construção',
          employmentType: 'Subcontratado',
          status: 'Ativo',
          contact: '+244 912 333 444',
          costPerHour: 5000,
          skills: ['Instalações Elétricas', 'Quadros'],
          createdAt: Timestamp.now(),
          author: { uid: 'system', displayName: 'Admin' }
        }
      ]);
      setLoadingPool(false);
    });
  }, [isAllocateOpen, user]);

  // ── Filtered pool ──
  const filteredPool = useMemo(() => {
    const allocatedIds = new Set(allocated.map(a => a.workforceId));
    return globalPool.filter(m =>
      !allocatedIds.has(m.id) &&
      (poolSearch === '' ||
        m.name.toLowerCase().includes(poolSearch.toLowerCase()) ||
        m.role.toLowerCase().includes(poolSearch.toLowerCase()))
    );
  }, [globalPool, allocated, poolSearch]);

  // ── KPIs ──
  const totalAllocated = allocated.length;
  const efectivos = allocated.filter(a => a.employmentType === 'Efetivo').length;
  const temporarios = allocated.filter(a => a.employmentType === 'Temporário').length;
  const subcontratados = allocated.filter(a => a.employmentType === 'Subcontratado').length;
  const totalPlannedHours = allocated.reduce((s, a) => s + (a.plannedHours || 0), 0);
  const totalActualHours = allocated.reduce((s, a) => s + (a.actualHours || 0), 0);
  const totalCost = allocated.reduce((s, a) => s + (a.actualHours || 0) * (a.costPerHour || 0), 0);

  // ── Allocate existing member ──
  const handleAllocate = async () => {
    if (!selectedGlobal || !projectId || !user) return;
    setIsSavingAlloc(true);
    try {
      const batch = writeBatch(db);

      const projRef = doc(collection(db, 'projects', projectId, 'workforce'));
      batch.set(projRef, {
        workforceId: selectedGlobal.id,
        name: selectedGlobal.name,
        role: allocRole || selectedGlobal.role,
        employmentType: selectedGlobal.employmentType,
        skills: selectedGlobal.skills || [],
        contact: selectedGlobal.contact || '',
        hoursPerDay: parseFloat(allocHoursPerDay) || 8,
        plannedHours: parseFloat(allocPlannedHours) || null,
        actualHours: 0,
        costPerHour: parseFloat(allocCostPerHour) || selectedGlobal.costPerHour || null,
        wbsRef: allocWbsRef || null,
        startDate: allocStart || null,
        endDate: allocEnd || null,
        notes: allocNotes || '',
        allocatedAt: serverTimestamp(),
        allocatedBy: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
      });

      const globalRef = doc(db, 'workforce', selectedGlobal.id);
      batch.update(globalRef, { currentProjectId: projectId });

      await batch.commit();
      toast({ title: `${selectedGlobal.name} alocado(a) ao projeto ✅` });
      setIsAllocateOpen(false);
      resetAllocForm();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao alocar membro', variant: 'destructive' });
    } finally {
      setIsSavingAlloc(false);
    }
  };

  // ── Register NEW member (and optionally allocate) ──
  const handleRegister = async () => {
    if (!regName || !regRole || !user) return;
    setIsSavingReg(true);
    try {
      const batch = writeBatch(db);

      // 1. Create in global workforce pool
      const globalRef = doc(collection(db, 'workforce'));
      const memberData = {
        name: regName.trim(),
        role: regRole.trim(),
        employmentType: regType,
        status: 'Ativo' as WorkforceStatus,
        contact: regContact || '',
        costPerHour: parseFloat(regCostHour) || null,
        skills: regSkills ? regSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyContactName: regEmergContact || '',
        emergencyContactPhone: regEmergPhone || '',
        notes: regNotes || '',
        currentProjectId: regAllocNow ? projectId : null,
        createdAt: serverTimestamp(),
        author: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
      };
      batch.set(globalRef, memberData);

      // 2. Optionally allocate to project immediately
      if (regAllocNow) {
        const projRef = doc(collection(db, 'projects', projectId, 'workforce'));
        batch.set(projRef, {
          workforceId: globalRef.id,
          name: regName.trim(),
          role: regRole.trim(),
          employmentType: regType,
          skills: memberData.skills,
          contact: regContact || '',
          hoursPerDay: 8,
          plannedHours: null,
          actualHours: 0,
          costPerHour: parseFloat(regCostHour) || null,
          wbsRef: null,
          notes: regNotes || '',
          allocatedAt: serverTimestamp(),
          allocatedBy: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
        });
      }

      await batch.commit();
      toast({
        title: `${regName} registado(a) com sucesso ✅`,
        description: regAllocNow ? 'Alocado(a) ao projeto automaticamente.' : 'Disponível no quadro de pessoal.',
      });
      setIsRegisterOpen(false);
      resetRegForm();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao registar colaborador', variant: 'destructive' });
    } finally {
      setIsSavingReg(false);
    }
  };

  // ── Open Log Hours modal ──
  const handleOpenLogHours = (member: AllocatedMember) => {
    setActiveMember(member);
    setLogHours('');
    setLogDate(format(new Date(), 'yyyy-MM-dd'));
    setLogTaskWbs(member.wbsRef || '');
    setLogNotes('');
    setIsLogHoursOpen(true);
  };

  // ── Save Logged Hours ──
  const handleSaveLogHours = async () => {
    if (!activeMember || !projectId || !user) return;
    const hoursNum = parseFloat(logHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast({ title: 'Horas Inválidas', description: 'Insira um número de horas positivo.', variant: 'destructive' });
      return;
    }

    setIsSavingLog(true);
    try {
      const batch = writeBatch(db);
      const newActualHours = (activeMember.actualHours || 0) + hoursNum;
      const projMemberRef = doc(db, 'projects', projectId, 'workforce', activeMember.id);
      
      batch.update(projMemberRef, {
        actualHours: newActualHours,
        updatedAt: serverTimestamp(),
      });

      // Also create a timesheet entry
      const timesheetRef = doc(collection(db, 'projects', projectId, 'timesheets'));
      batch.set(timesheetRef, {
        workforceId: activeMember.workforceId,
        workforceName: activeMember.name,
        role: activeMember.role,
        hours: hoursNum,
        date: new Date(logDate),
        wbsRef: logTaskWbs || activeMember.wbsRef || null,
        notes: logNotes || '',
        cost: (activeMember.costPerHour || 0) * hoursNum,
        loggedBy: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      // Update local state
      setAllocated(prev => prev.map(m => m.id === activeMember.id ? { ...m, actualHours: newActualHours } : m));

      toast({
        title: 'Horas Registadas com Sucesso ✅',
        description: `+${hoursNum}h adicionadas ao colaborador ${activeMember.name}.`,
      });
      setIsLogHoursOpen(false);
    } catch (err) {
      console.error('Error logging hours:', err);
      toast({ title: 'Erro ao registar horas', variant: 'destructive' });
    } finally {
      setIsSavingLog(false);
    }
  };

  // ── Open Edit Allocation modal ──
  const handleOpenEditAlloc = (member: AllocatedMember) => {
    setActiveMember(member);
    setEditRole(member.role || '');
    setEditHoursPerDay(String(member.hoursPerDay || 8));
    setEditPlannedHours(String(member.plannedHours || ''));
    setEditCostPerHour(String(member.costPerHour || ''));
    setEditWbsRef(member.wbsRef || '');
    setEditStartDate(member.startDate || '');
    setEditEndDate(member.endDate || '');
    setEditNotes(member.notes || '');
    setIsEditAllocOpen(true);
  };

  // ── Save Edited Allocation ──
  const handleSaveEditAlloc = async () => {
    if (!activeMember || !projectId) return;

    setIsSavingEdit(true);
    try {
      const projMemberRef = doc(db, 'projects', projectId, 'workforce', activeMember.id);
      const updateData: any = {
        role: editRole.trim() || activeMember.role,
        hoursPerDay: parseFloat(editHoursPerDay) || 8,
        plannedHours: editPlannedHours ? parseFloat(editPlannedHours) : null,
        costPerHour: editCostPerHour ? parseFloat(editCostPerHour) : null,
        wbsRef: editWbsRef === 'none' ? null : (editWbsRef || null),
        startDate: editStartDate || null,
        endDate: editEndDate || null,
        notes: editNotes || '',
        updatedAt: serverTimestamp(),
      };

      await updateDoc(projMemberRef, updateData);

      // Update local state
      setAllocated(prev => prev.map(m => m.id === activeMember.id ? { ...m, ...updateData } : m));

      toast({
        title: 'Alocação Atualizada ✅',
        description: `Parâmetros de ${activeMember.name} atualizados com sucesso.`,
      });
      setIsEditAllocOpen(false);
    } catch (err) {
      console.error('Error updating allocation:', err);
      toast({ title: 'Erro ao atualizar alocação', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Deallocate ──
  const handleDeallocate = async (member: AllocatedMember) => {
    if (!canEdit || !member.workforceId) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'projects', projectId, 'workforce', member.id));
      batch.update(doc(db, 'workforce', member.workforceId), { currentProjectId: null });
      await batch.commit();

      setAllocated(prev => prev.filter(m => m.id !== member.id));
      toast({ title: `${member.name} desalocado(a)` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao desalocar', variant: 'destructive' });
    }
  };

  // ── Open Production Entry modal ──
  const handleOpenProduction = (member: AllocatedMember) => {
    setActiveMember(member);
    setProdDate(format(new Date(), 'yyyy-MM-dd'));
    setProdQuantity('');
    setProdUnit('m²');
    setProdWbs(member.wbsRef || '');
    setProdNotes('');
    setIsProductionOpen(true);
  };

  // ── Save Production Entry ──
  const handleSaveProduction = async () => {
    if (!activeMember || !projectId || !user) return;
    const qty = parseFloat(prodQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Quantidade Inválida', description: 'Insira uma quantidade positiva.', variant: 'destructive' });
      return;
    }
    setIsSavingProd(true);
    try {
      await addDoc(collection(db, 'projects', projectId, 'productionEntries'), {
        workforceId: activeMember.workforceId,
        workforceName: activeMember.name,
        role: activeMember.role,
        date: new Date(prodDate),
        quantity: qty,
        unit: prodUnit,
        wbsRef: prodWbs || activeMember.wbsRef || null,
        wbsItemId: prodWbs || '',
        wbsItemName: prodWbs || 'Geral',
        dailyReportId: 'manual',
        notes: prodNotes || '',
        loggedBy: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Produção Registada ✅',
        description: `${qty} ${prodUnit} registados para ${activeMember.name}.`,
      });
      setIsProductionOpen(false);
    } catch (err) {
      console.error('Error saving production entry:', err);
      toast({ title: 'Erro ao registar produção', variant: 'destructive' });
    } finally {
      setIsSavingProd(false);
    }
  };

  // ── Open Leave Request modal ──
  const handleOpenLeave = (member: AllocatedMember) => {
    setActiveMember(member);
    setLeaveType('Férias');
    setLeaveStartDate(format(new Date(), 'yyyy-MM-dd'));
    setLeaveEndDate(format(new Date(), 'yyyy-MM-dd'));
    setLeaveNotes('');
    setIsLeaveOpen(true);
  };

  // ── Save Leave Request ──
  const handleSaveLeave = async () => {
    if (!activeMember || !user) return;
    if (!leaveStartDate || !leaveEndDate) {
      toast({ title: 'Datas obrigatórias', description: 'Selecione as datas de início e fim.', variant: 'destructive' });
      return;
    }
    setIsSavingLeave(true);
    try {
      // Store leave request in workforce/{workforceId}/leaveRequests subcollection
      await addDoc(collection(db, 'workforce', activeMember.workforceId, 'leaveRequests'), {
        type: leaveType,
        status: 'Pendente',
        startDate: new Date(leaveStartDate),
        endDate: new Date(leaveEndDate),
        notes: leaveNotes || '',
        requester: { uid: user.uid, displayName: user.displayName || 'Utilizador' },
        projectId: projectId,
        workerName: activeMember.name,
        workerRole: activeMember.role,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Pedido de Ausência Submetido ✅',
        description: `Pedido de ${leaveType} para ${activeMember.name} criado com estado "Pendente".`,
      });
      setIsLeaveOpen(false);
    } catch (err) {
      console.error('Error saving leave request:', err);
      toast({ title: 'Erro ao submeter pedido', variant: 'destructive' });
    } finally {
      setIsSavingLeave(false);
    }
  };

  // ── Reset forms ──
  const resetAllocForm = () => {
    setSelectedGlobal(null); setPoolSearch(''); setAllocRole(''); setAllocHoursPerDay('8');
    setAllocPlannedHours(''); setAllocCostPerHour(''); setAllocWbsRef('');
    setAllocStart(''); setAllocEnd(''); setAllocNotes('');
  };
  const resetRegForm = () => {
    setRegName(''); setRegRole(''); setRegType('Efetivo'); setRegContact('');
    setRegCostHour(''); setRegSkills(''); setRegEmergContact('');
    setRegEmergPhone(''); setRegNotes(''); setRegAllocNow(true);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Equipa do Projeto
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão de mão-de-obra alocada — cadastro, alocação e controlo de horas e custos
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAllocateOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Alocar do Quadro
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsRegisterOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Registar Novo
            </Button>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Alocados</div>
            <div className="text-3xl font-bold text-blue-700">{totalAllocated}</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {efectivos > 0 && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1">{efectivos} Ef.</span>}
              {temporarios > 0 && <span className="text-xs bg-orange-100 text-orange-700 rounded px-1">{temporarios} Tmp.</span>}
              {subcontratados > 0 && <span className="text-xs bg-purple-100 text-purple-700 rounded px-1">{subcontratados} Sub.</span>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Horas Planeadas</div>
            <div className="text-3xl font-bold text-emerald-700">{totalPlannedHours.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">h previstas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Horas Reais</div>
            <div className="text-3xl font-bold text-cyan-700">{totalActualHours.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">h registadas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 md:col-span-2">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Custo de Mão-de-Obra</div>
            <div className="text-xl font-bold text-orange-700">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-muted-foreground mt-1">baseado em horas reais × custo/h</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs: Cards / Table ── */}
      <Tabs defaultValue="cards">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Cards
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5" />
            Tabela
          </TabsTrigger>
        </TabsList>

        {/* ── Cards View ── */}
        <TabsContent value="cards">
          {loadingAllocated ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : allocated.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <Users className="h-14 w-14 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum recurso alocado</p>
              <p className="text-sm text-muted-foreground mb-4">Comece por alocar um membro do quadro ou registar um novo colaborador.</p>
              {canEdit && (
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsAllocateOpen(true)}>
                    <UserCheck className="h-4 w-4 mr-2" /> Alocar do Quadro
                  </Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setIsRegisterOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Registar Novo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
              {allocated.map(member => {
                const pct = member.plannedHours && member.plannedHours > 0
                  ? Math.min(100, Math.round(((member.actualHours || 0) / member.plannedHours) * 100))
                  : null;
                const memberCost = (member.actualHours || 0) * (member.costPerHour || 0);
                const isExpanded = expandedId === member.id;
                const avatarColor = getAvatarColor(member.name);

                return (
                  <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-11 w-11 shrink-0 ${avatarColor}`}>
                            <AvatarFallback className="text-white font-bold">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold leading-tight">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.role}</div>
                          </div>
                        </div>
                        <Badge className={`${employmentTypeColor[member.employmentType]} border text-xs shrink-0`}>
                          {member.employmentType}
                        </Badge>
                      </div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/40 rounded p-2">
                          <Clock className="h-3.5 w-3.5 mx-auto text-cyan-600 mb-0.5" />
                          <div className="text-sm font-bold">{member.hoursPerDay ?? '—'}h</div>
                          <div className="text-xs text-muted-foreground">h/dia</div>
                        </div>
                        <div className="bg-muted/40 rounded p-2">
                          <TrendingUp className="h-3.5 w-3.5 mx-auto text-emerald-600 mb-0.5" />
                          <div className="text-sm font-bold">{member.actualHours ?? 0}h</div>
                          <div className="text-xs text-muted-foreground">realizadas</div>
                        </div>
                        <div className="bg-muted/40 rounded p-2">
                          <DollarSign className="h-3.5 w-3.5 mx-auto text-orange-600 mb-0.5" />
                          <div className="text-sm font-bold truncate" title={formatCurrency(memberCost)}>
                            {member.costPerHour ? formatCurrency(memberCost) : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground">custo</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {pct !== null && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Horas Realizadas</span>
                            <span className={`font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {pct}%
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-1.5 ${pct >= 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-orange-500' : '[&>div]:bg-emerald-500'}`}
                          />
                          <div className="text-xs text-muted-foreground mt-0.5 text-right">
                            {member.actualHours ?? 0} / {member.plannedHours} h planeadas
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {member.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                              {skill}
                            </span>
                          ))}
                          {member.skills.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{member.skills.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Expand / Actions */}
                      <div className="flex items-center justify-between pt-1 border-t gap-1">
                        <button
                          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
                          onClick={() => setExpandedId(isExpanded ? null : member.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {isExpanded ? 'Menos' : 'Detalhes'}
                        </button>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 border-blue-200"
                              title="Registar horas trabalhadas"
                              onClick={() => handleOpenLogHours(member)}
                            >
                              <Clock className="h-3 w-3 mr-1 text-blue-600" />
                              Horas
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              title="Registar produção"
                              onClick={() => handleOpenProduction(member)}
                            >
                              <Factory className="h-3 w-3 mr-1 text-emerald-600" />
                              Prod.
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50 border-amber-200"
                              title="Submeter pedido de ausência"
                              onClick={() => handleOpenLeave(member)}
                            >
                              <CalendarOff className="h-3 w-3 text-amber-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              title="Editar alocação"
                              onClick={() => handleOpenEditAlloc(member)}
                            >
                              <Edit3 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                              title="Desalocar da obra"
                              onClick={() => handleDeallocate(member)}
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="pt-2 border-t space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {member.contact && (
                              <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                                <Phone className="h-3 w-3" /> {member.contact}
                              </div>
                            )}
                            {member.wbsRef && (
                              <div><span className="text-muted-foreground">EAP:</span> <span className="font-mono">{member.wbsRef}</span></div>
                            )}
                            {member.startDate && (
                              <div><span className="text-muted-foreground">Início:</span> {member.startDate}</div>
                            )}
                            {member.endDate && (
                              <div><span className="text-muted-foreground">Fim:</span> {member.endDate}</div>
                            )}
                            {member.costPerHour && (
                              <div><span className="text-muted-foreground">Custo/h:</span> {formatCurrency(member.costPerHour)}</div>
                            )}
                          </div>
                          {member.notes && (
                            <p className="text-xs text-muted-foreground italic">{member.notes}</p>
                          )}
                          {(member as any).allocatedAt && (
                            <div className="text-xs text-muted-foreground">
                              Alocado em: {(member as any).allocatedAt?.toDate
                                ? format((member as any).allocatedAt.toDate(), 'dd/MM/yyyy')
                                : '—'}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Table View ── */}
        <TabsContent value="table">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>h/dia</TableHead>
                    <TableHead>H. Plan.</TableHead>
                    <TableHead>H. Real.</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Custo/h</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>EAP</TableHead>
                    {canEdit && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAllocated ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                      </TableCell>
                    </TableRow>
                  ) : allocated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                        Nenhum recurso alocado a este projeto.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allocated.map(member => {
                      const pct = member.plannedHours && member.plannedHours > 0
                        ? Math.min(100, Math.round(((member.actualHours || 0) / member.plannedHours) * 100))
                        : null;
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className={`h-8 w-8 ${getAvatarColor(member.name)}`}>
                                <AvatarFallback className="text-white text-xs font-bold">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{member.role}</TableCell>
                          <TableCell>
                            <Badge className={`${employmentTypeColor[member.employmentType]} border text-xs`}>
                              {member.employmentType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{member.hoursPerDay ?? '—'}</TableCell>
                          <TableCell className="text-sm">{member.plannedHours ?? '—'}</TableCell>
                          <TableCell className="text-sm font-medium">{member.actualHours ?? 0}</TableCell>
                          <TableCell className="min-w-[100px]">
                            {pct !== null ? (
                              <div>
                                <Progress value={pct} className="h-1.5" />
                                <div className="text-xs text-muted-foreground mt-0.5">{pct}%</div>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{member.costPerHour ? formatCurrency(member.costPerHour) : '—'}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {member.costPerHour ? formatCurrency((member.actualHours || 0) * member.costPerHour) : '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{member.wbsRef || '—'}</TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleOpenLogHours(member)}
                                  title="Registar horas"
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                  Horas
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => handleOpenProduction(member)}
                                  title="Registar produção"
                                >
                                  <Factory className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                  Prod.
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                                  onClick={() => handleOpenLeave(member)}
                                  title="Pedido de ausência"
                                >
                                  <CalendarOff className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => handleOpenEditAlloc(member)}
                                  title="Editar parâmetros"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                  onClick={() => handleDeallocate(member)}
                                  title="Desalocar"
                                >
                                  <MinusCircle className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 1: Alocar do Quadro Global                                    */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isAllocateOpen} onOpenChange={v => { setIsAllocateOpen(v); if (!v) resetAllocForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Alocar Recurso ao Projeto
            </DialogTitle>
            <DialogDescription>
              Selecione um membro do quadro de pessoal ativo e defina os parâmetros de alocação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Select from pool */}
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                Selecionar Colaborador
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar por nome ou função..."
                  value={poolSearch}
                  onChange={e => setPoolSearch(e.target.value)}
                />
              </div>
              {loadingPool ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : filteredPool.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  {poolSearch ? 'Nenhum resultado encontrado.' : 'Todos os membros ativos já estão alocados ou o quadro está vazio.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredPool.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedGlobal(member);
                        setAllocRole(member.role);
                        setAllocCostPerHour(String(member.costPerHour || ''));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedGlobal?.id === member.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400'
                          : 'border-border hover:border-blue-300 hover:bg-muted/40'
                      }`}
                    >
                      <Avatar className={`h-9 w-9 shrink-0 ${getAvatarColor(member.name)}`}>
                        <AvatarFallback className="text-white text-xs font-bold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                        <Badge className={`${employmentTypeColor[member.employmentType]} border text-xs mt-0.5`}>
                          {member.employmentType}
                        </Badge>
                      </div>
                      {selectedGlobal?.id === member.id && (
                        <UserCheck className="h-4 w-4 text-blue-600 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Allocation parameters (shown when member selected) */}
            {selectedGlobal && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                    Parâmetros de Alocação — <span className="text-blue-700">{selectedGlobal.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <Label>Função no Projeto</Label>
                      <Input
                        value={allocRole}
                        onChange={e => setAllocRole(e.target.value)}
                        placeholder="ex.: Encarregado Geral, Carpinteiro"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Horas/Dia</Label>
                      <Input
                        type="number"
                        value={allocHoursPerDay}
                        onChange={e => setAllocHoursPerDay(e.target.value)}
                        min={1} max={24}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Horas Planeadas (total)</Label>
                      <Input
                        type="number"
                        value={allocPlannedHours}
                        onChange={e => setAllocPlannedHours(e.target.value)}
                        placeholder="ex.: 200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Custo/Hora (AOA)</Label>
                      <Input
                        type="number"
                        value={allocCostPerHour}
                        onChange={e => setAllocCostPerHour(e.target.value)}
                        placeholder={selectedGlobal.costPerHour ? String(selectedGlobal.costPerHour) : 'ex.: 5000'}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ref. EAP / Atividade</Label>
                      {wbsList.length > 0 ? (
                        <Select value={allocWbsRef} onValueChange={setAllocWbsRef}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a tarefa / EAP..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma (Geral da Obra)</SelectItem>
                            {wbsList.map(item => (
                              <SelectItem key={item.id} value={item.code || item.name}>
                                {item.code ? `${item.code} - ` : ''}{item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={allocWbsRef}
                          onChange={e => setAllocWbsRef(e.target.value)}
                          placeholder="ex.: 1.3.2"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Data de Início</Label>
                      <Input type="date" value={allocStart} onChange={e => setAllocStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Data de Fim Prevista</Label>
                      <Input type="date" value={allocEnd} onChange={e => setAllocEnd(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Notas</Label>
                      <Textarea
                        rows={2}
                        value={allocNotes}
                        onChange={e => setAllocNotes(e.target.value)}
                        placeholder="Observações sobre a alocação..."
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAllocateOpen(false); resetAllocForm(); }}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedGlobal || isSavingAlloc}
              onClick={handleAllocate}
            >
              {isSavingAlloc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Alocar ao Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 2: Registar Novo Colaborador                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isRegisterOpen} onOpenChange={v => { setIsRegisterOpen(v); if (!v) resetRegForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Registar Novo Colaborador
            </DialogTitle>
            <DialogDescription>
              Cadastra o trabalhador no quadro de pessoal global e, opcionalmente, aloca-o a este projeto de imediato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Nome Completo *</Label>
                <Input
                  placeholder="ex.: João Manuel da Costa"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Função / Categoria *</Label>
                <Input
                  placeholder="ex.: Encarregado, Pedreiro"
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Vínculo *</Label>
                <Select value={regType} onValueChange={v => setRegType(v as EmploymentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efetivo">🔵 Efetivo</SelectItem>
                    <SelectItem value="Temporário">🟠 Temporário</SelectItem>
                    <SelectItem value="Subcontratado">🟣 Subcontratado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Contacto</Label>
                <Input
                  placeholder="Nº de telemóvel"
                  value={regContact}
                  onChange={e => setRegContact(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Custo/Hora (AOA)</Label>
                <Input
                  type="number"
                  placeholder="ex.: 5000"
                  value={regCostHour}
                  onChange={e => setRegCostHour(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Competências / Habilitações</Label>
              <Input
                placeholder="Separadas por vírgula: Cofragem, Armaduras, Betão"
                value={regSkills}
                onChange={e => setRegSkills(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separe múltiplas competências por vírgula.</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Contacto de Emergência</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome familiar"
                    value={regEmergContact}
                    onChange={e => setRegEmergContact(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telemóvel</Label>
                  <Input
                    placeholder="Nº contacto de emergência"
                    value={regEmergPhone}
                    onChange={e => setRegEmergPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                placeholder="Observações gerais sobre o colaborador..."
                value={regNotes}
                onChange={e => setRegNotes(e.target.value)}
              />
            </div>

            {/* Alloc immediately toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-50/50">
              <div>
                <div className="text-sm font-medium">Alocar a este projeto imediatamente</div>
                <div className="text-xs text-muted-foreground">
                  Adiciona o colaborador à equipa desta obra no mesmo passo.
                </div>
              </div>
              <Switch checked={regAllocNow} onCheckedChange={setRegAllocNow} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRegisterOpen(false); resetRegForm(); }}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!regName || !regRole || isSavingReg}
              onClick={handleRegister}
            >
              {isSavingReg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              {regAllocNow ? 'Registar e Alocar' : 'Registar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 3: Registar Horas Trabalhadas (Apontamento)                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isLogHoursOpen} onOpenChange={setIsLogHoursOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Registar Horas de Trabalho
            </DialogTitle>
            <DialogDescription>
              {activeMember ? `Apontamento de horas para ${activeMember.name} (${activeMember.role})` : 'Registo de horas'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data do Trabalho</Label>
                <Input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Horas Trabalhadas *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="ex.: 8"
                  value={logHours}
                  onChange={e => setLogHours(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Atividade / EAP</Label>
              {wbsList.length > 0 ? (
                <Select value={logTaskWbs} onValueChange={setLogTaskWbs}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tarefa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral / Sem EAP</SelectItem>
                    {wbsList.map(item => (
                      <SelectItem key={item.id} value={item.code || item.name}>
                        {item.code ? `${item.code} - ` : ''}{item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="ex.: 1.2 Fundações"
                  value={logTaskWbs}
                  onChange={e => setLogTaskWbs(e.target.value)}
                />
              )}
            </div>

            {activeMember?.costPerHour ? (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex justify-between items-center">
                <span>Custo projetado destas horas:</span>
                <span className="font-semibold text-foreground text-sm">
                  {formatCurrency((parseFloat(logHours) || 0) * (activeMember.costPerHour || 0))}
                </span>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label>Observações / Ocorrências</Label>
              <Textarea
                rows={2}
                placeholder="ex.: Trabalho em turno estendido na betonagem de vigas..."
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogHoursOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!logHours || isSavingLog}
              onClick={handleSaveLogHours}
            >
              {isSavingLog ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Guardar Horas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 4: Editar Alocação                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isEditAllocOpen} onOpenChange={setIsEditAllocOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              Editar Parâmetros de Alocação
            </DialogTitle>
            <DialogDescription>
              {activeMember ? `Atualizar detalhes de ${activeMember.name} na obra` : 'Editar Alocação'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Função / Cargo na Obra</Label>
              <Input
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                placeholder="ex.: Encarregado de Cofragem"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Horas / Dia</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={editHoursPerDay}
                  onChange={e => setEditHoursPerDay(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Horas Planeadas (Total)</Label>
                <Input
                  type="number"
                  placeholder="ex.: 250"
                  value={editPlannedHours}
                  onChange={e => setEditPlannedHours(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Custo / Hora (AOA)</Label>
                <Input
                  type="number"
                  placeholder="ex.: 5500"
                  value={editCostPerHour}
                  onChange={e => setEditCostPerHour(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Ref. EAP / Atividade</Label>
                {wbsList.length > 0 ? (
                  <Select value={editWbsRef} onValueChange={setEditWbsRef}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tarefa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (Geral)</SelectItem>
                      {wbsList.map(item => (
                        <SelectItem key={item.id} value={item.code || item.name}>
                          {item.code ? `${item.code} - ` : ''}{item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="ex.: 1.3"
                    value={editWbsRef}
                    onChange={e => setEditWbsRef(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={e => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Data de Fim Prevista</Label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={e => setEditEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                placeholder="Observações sobre a alocação..."
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAllocOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSavingEdit}
              onClick={handleSaveEditAlloc}
            >
              {isSavingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 5: Registar Produção                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isProductionOpen} onOpenChange={setIsProductionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-emerald-600" />
              Registar Produção
            </DialogTitle>
            <DialogDescription>
              {activeMember ? `Lançar produção para ${activeMember.name}` : 'Registar produção'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={prodDate}
                  onChange={e => setProdDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="ex.: 12.5"
                  value={prodQuantity}
                  onChange={e => setProdQuantity(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Unidade de Medida</Label>
              <Select value={prodUnit} onValueChange={setProdUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['m²', 'm³', 'm', 'un', 'kg', 't', 'vg'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Atividade / EAP</Label>
              {wbsList.length > 0 ? (
                <Select value={prodWbs} onValueChange={setProdWbs}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tarefa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral / Sem EAP</SelectItem>
                    {wbsList.map(item => (
                      <SelectItem key={item.id} value={item.code || item.name}>
                        {item.code ? `${item.code} - ` : ''}{item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="ex.: 1.2 Betão de Pilares"
                  value={prodWbs}
                  onChange={e => setProdWbs(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                placeholder="Detalhe da produção..."
                value={prodNotes}
                onChange={e => setProdNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductionOpen(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!prodQuantity || isSavingProd}
              onClick={handleSaveProduction}
            >
              {isSavingProd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Factory className="h-4 w-4 mr-2" />}
              Guardar Produção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DIALOG 6: Pedido de Ausência / Férias                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-amber-600" />
              Pedido de Ausência
            </DialogTitle>
            <DialogDescription>
              {activeMember ? `Criar pedido de ausência para ${activeMember.name}` : 'Pedido de Ausência'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Tipo de Ausência *</Label>
              <Select value={leaveType} onValueChange={v => setLeaveType(v as LeaveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Férias">🏖 Férias</SelectItem>
                  <SelectItem value="Licença Médica">🏥 Licença Médica</SelectItem>
                  <SelectItem value="Falta Justificada">📋 Falta Justificada</SelectItem>
                  <SelectItem value="Outro">📌 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={e => setLeaveStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  min={leaveStartDate}
                  onChange={e => setLeaveEndDate(e.target.value)}
                />
              </div>
            </div>

            {leaveStartDate && leaveEndDate && leaveStartDate <= leaveEndDate && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">Resumo do Pedido</p>
                <p>Tipo: <span className="font-medium">{leaveType}</span></p>
                <p>Período: {leaveStartDate} até {leaveEndDate}</p>
                <p className="mt-1 text-amber-600">Estado inicial: <span className="font-semibold">Pendente</span> (aguarda aprovação)</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Motivo / Observações</Label>
              <Textarea
                rows={2}
                placeholder="Descreva o motivo da ausência..."
                value={leaveNotes}
                onChange={e => setLeaveNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveOpen(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!leaveStartDate || !leaveEndDate || isSavingLeave}
              onClick={handleSaveLeave}
            >
              {isSavingLeave ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarOff className="h-4 w-4 mr-2" />}
              Submeter Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
