
'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
  collectionGroup,
  getDocs,
  writeBatch,
  getDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Truck,
  MinusCircle,
  UserCheck,
  Trash2,
  SlidersHorizontal,
  UserPlus,
  Wrench,
  ArrowRightLeft,
} from 'lucide-react';
import {
  type Equipment,
  type EquipmentCategory,
  type EquipmentStatus,
  EquipmentCategories,
} from '@/types/equipment';
import { type Project } from '@/types/project';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/contexts/tenant-context';
import type { UserRole } from '@/app/projects/[id]/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

interface CompanyEquipmentTabProps {
  userRole: UserRole | null;
  projectId: string;
}

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return 'N/A';
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
};

export function CompanyEquipmentTab({
  userRole,
  projectId,
}: CompanyEquipmentTabProps) {
  const { user } = useAuth();
  const { activeOrganization } = useTenant();
  const { toast } = useToast();
  const [globalEquipment, setGlobalEquipment] = useState<Equipment[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAddEquipmentDialogOpen, setIsAddEquipmentDialogOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Outros');
  const [isOwned, setIsOwned] = useState('true');
  const [cost, setCost] = useState('');
  const [operationalCostPerHour, setOperationalCostPerHour] = useState('');
  const [maintenanceInterval, setMaintenanceInterval] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = userRole === 'Editor' || userRole === 'Gestor';
  const orgId = activeOrganization?.id || 'org_default_profundidade';

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const globalEquipmentQuery = query(
      collection(db, 'equipment'),
      where('organizationId', '==', orgId),
      orderBy('name', 'asc')
    );
    const projectRef = doc(db, 'projects', projectId);
    getDoc(projectRef).then((doc) => {
      if (doc.exists()) setProject({ id: doc.id, ...doc.data() } as Project);
    });

    const unsubEquipment = onSnapshot(
      globalEquipmentQuery,
      (snapshot) => {
        const fetchedEquipment = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Equipment)
        );

        if (fetchedEquipment.length === 0 && orgId === 'org_default_profundidade') {
          // Fallback para equipamentos legados do utilizador
          const fallbackQuery = query(
            collection(db, 'equipment'),
            where('author.uid', '==', user.uid),
            orderBy('name', 'asc')
          );
          getDocs(fallbackQuery).then((fbSnap) => {
            const legacy = fbSnap.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Equipment)
            );
            setGlobalEquipment(legacy);
            setLoading(false);
          }).catch(() => {
            setGlobalEquipment([]);
            setLoading(false);
          });
          return;
        }

        setGlobalEquipment(fetchedEquipment);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching global equipment: ', error);
        // Fallback resiliente
        const fallbackQuery = query(
          collection(db, 'equipment'),
          where('author.uid', '==', user.uid),
          orderBy('name', 'asc')
        );
        getDocs(fallbackQuery).then((fbSnap) => {
          const legacy = fbSnap.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Equipment)
          );
          setGlobalEquipment(legacy);
          setLoading(false);
        }).catch(() => {
          setGlobalEquipment([]);
          setLoading(false);
        });
      }
    );

    return () => {
      unsubEquipment();
    };
  }, [user, orgId, projectId]);

  const resetForm = () => {
    setName('');
    setCategory('Outros');
    setIsOwned('true');
    setCost('');
    setOperationalCostPerHour('');
    setMaintenanceInterval('');
    setNotes('');
    setIsAddEquipmentDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!canEdit || !user) return;
    if (!name || !category) {
      toast({
        title: 'Campos obrigatórios em falta',
        description: 'Nome e categoria são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'equipment'), {
        name,
        category,
        isOwned: isOwned === 'true',
        cost: parseFloat(cost) || 0,
        operationalCostPerHour: parseFloat(operationalCostPerHour) || 0,
        maintenanceIntervalHours: parseFloat(maintenanceInterval) || undefined,
        currentHours: 0,
        lastMaintenanceHours: 0,
        notes,
        status: 'Disponível',
        organizationId: orgId,
        currentProjectId: null,
        currentProjectName: null,
        createdAt: serverTimestamp(),
        author: { uid: user.uid, displayName: user.displayName || user.email },
      });
      toast({ title: 'Equipamento adicionado ao parque!' });
      resetForm();
    } catch (error) {
      console.error('Error submitting equipment:', error);
      toast({ title: 'Erro ao adicionar equipamento', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (equipment: Equipment) => {
    if (!canEdit) return;
    if (equipment.currentProjectId) {
      toast({
        title: 'Ação não permitida',
        description:
          'Não pode eliminar um equipamento que está alocado a um projeto.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'equipment', equipment.id));
      toast({ title: 'Equipamento eliminado do parque.' });
    } catch (error) {
      console.error('Error deleting equipment: ', error);
      toast({ title: 'Erro ao eliminar equipamento.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (
    equipmentId: string,
    newStatus: EquipmentStatus
  ) => {
    if (!canEdit) return;
    try {
      const eqRef = doc(db, 'equipment', equipmentId);
      await updateDoc(eqRef, { status: newStatus });
      toast({ title: 'Estado do equipamento atualizado.' });
    } catch (error) {
      console.error('Error updating equipment status: ', error);
      toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
    }
  };

  const handleAllocate = async (equipment: Equipment) => {
    if (!canEdit || !project) return;
    const batch = writeBatch(db);
    // 1. Update the global equipment document
    const globalEqRef = doc(db, 'equipment', equipment.id);
    batch.update(globalEqRef, {
      status: 'Em Uso',
      currentProjectId: project.id,
      currentProjectName: project.name,
    });
    // 2. Add the equipment to the project's subcollection
    const projectEqRef = doc(collection(db, 'projects', project.id, 'equipment'));
    batch.set(projectEqRef, {
      equipmentId: equipment.id,
      name: equipment.name,
      category: equipment.category,
      allocatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      toast({
        title: 'Equipamento Alocado!',
        description: `${equipment.name} foi adicionado a este projeto.`,
      });
    } catch (error) {
      console.error('Error allocating equipment:', error);
      toast({ title: 'Erro ao alocar', variant: 'destructive' });
    }
  };
  
    const handleTransfer = async (equipment: Equipment) => {
        if (!canEdit || !project || !equipment.currentProjectId) return;

        const isConfirmed = confirm(`Tem a certeza que deseja transferir "${equipment.name}" do projeto "${equipment.currentProjectName}" para "${project.name}"?`);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        const batch = writeBatch(db);
        
        try {
            // 1. Find and delete from old project's subcollection
            const oldProjectEqQuery = query(
                collection(db, 'projects', equipment.currentProjectId, 'equipment'),
                where('equipmentId', '==', equipment.id)
            );
            const oldProjectEqSnapshot = await getDocs(oldProjectEqQuery);
            if (!oldProjectEqSnapshot.empty) {
                const oldProjectEqDocRef = oldProjectEqSnapshot.docs[0].ref;
                batch.delete(oldProjectEqDocRef);
            }

            // 2. Add to current project's subcollection
            const newProjectEqRef = doc(collection(db, 'projects', projectId, 'equipment'));
            batch.set(newProjectEqRef, {
                equipmentId: equipment.id,
                name: equipment.name,
                category: equipment.category,
                allocatedAt: serverTimestamp(),
            });

            // 3. Update the global equipment document
            const globalEqRef = doc(db, 'equipment', equipment.id);
            batch.update(globalEqRef, {
                currentProjectId: projectId,
                currentProjectName: project.name,
            });

            await batch.commit();
            toast({ title: 'Transferência Concluída!', description: `${equipment.name} foi transferido para ${project.name}.` });
        } catch (error) {
            console.error("Error transferring equipment: ", error);
            toast({ title: 'Erro ao transferir', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

  const getMaintenanceStatus = (eq: Equipment) => {
    if (!eq.maintenanceIntervalHours || eq.maintenanceIntervalHours === 0) {
        return { needsMaintenance: false, isUrgent: false, message: 'Intervalo de manutenção não definido.' };
    }
    const hoursSinceLast = (eq.currentHours || 0) - (eq.lastMaintenanceHours || 0);
    const needsMaintenance = hoursSinceLast >= eq.maintenanceIntervalHours;
    const isUrgent = hoursSinceLast >= eq.maintenanceIntervalHours * 1.1; // 10% overdue
    const hoursRemaining = eq.maintenanceIntervalHours - hoursSinceLast;
    
    let message = '';
    if (needsMaintenance) {
        message = `Manutenção ${isUrgent ? 'urgente' : 'necessária'}. Horas desde a última: ${hoursSinceLast.toFixed(0)}`;
    } else {
        message = `Próxima manutenção em ${hoursRemaining.toFixed(0)} horas.`;
    }

    return { needsMaintenance, isUrgent, message };
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Add New Equipment Dialog */}
      <Dialog
        open={isAddEquipmentDialogOpen}
        onOpenChange={setIsAddEquipmentDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Equipamento</DialogTitle>
            <DialogDescription>
              Registe um novo ativo no parque de equipamentos da sua empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eq-name">Nome do Equipamento</Label>
                <Input
                  id="eq-name"
                  placeholder="Ex: Retroescavadora CAT 428"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eq-category">Categoria</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as EquipmentCategory)}
                >
                  <SelectTrigger id="eq-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EquipmentCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eq-owner">Propriedade</Label>
                <Select value={isOwned} onValueChange={setIsOwned}>
                  <SelectTrigger id="eq-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Próprio</SelectItem>
                    <SelectItem value="false">Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eq-cost">Custo (Kz)</Label>
                <Input
                  id="eq-cost"
                  type="number"
                  placeholder={
                    isOwned === 'true'
                      ? 'Custo de Aquisição'
                      : 'Custo Mensal de Aluguer'
                  }
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="eq-op-cost">Custo Operacional por Hora (Kz)</Label>
                    <Input id="eq-op-cost" type="number" placeholder="3500" value={operationalCostPerHour} onChange={e => setOperationalCostPerHour(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="maintenance-interval">Intervalo de Manutenção (Horas)</Label>
                    <Input id="maintenance-interval" type="number" placeholder="250" value={maintenanceInterval} onChange={e => setMaintenanceInterval(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-notes">Notas Adicionais</Label>
              <Textarea
                id="eq-notes"
                placeholder="Nº de série, matrícula, observações sobre manutenção, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              Adicionar Equipamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>Parque de Equipamentos da Empresa</CardTitle>
            <CardDescription>
              Gira o inventário global e aloque ou transfira equipamentos entre projetos.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={() => setIsAddEquipmentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Equipamento{' '}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin" data-testid="loader"/> Carregando...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Alocado a</TableHead>
                  <TableHead>Estado Global</TableHead>
                  {canEdit && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center">
                      Nenhum equipamento registado.
                    </TableCell>
                  </TableRow>
                ) : (
                  globalEquipment.map((item) => {
                    const maintenanceStatus = getMaintenanceStatus(item);
                    const isAllocatedToThisProject = item.currentProjectId === projectId;
                    return (
                        <TableRow
                        key={item.id}
                        className={
                            item.status !== 'Disponível'
                            ? 'text-muted-foreground'
                            : ''
                        }
                        >
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                {item.name}
                                {maintenanceStatus.needsMaintenance && (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Wrench className={cn("h-4 w-4", maintenanceStatus.isUrgent ? "text-destructive" : "text-yellow-500")} />
                                            </TooltipTrigger>
                                            <TooltipContent><p>{maintenanceStatus.message}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            {item.currentProjectId ? (
                            <Badge
                                variant={
                                isAllocatedToThisProject
                                    ? 'default'
                                    : 'secondary'
                                }
                            >
                                {item.currentProjectName || 'Projeto Desconhecido'}
                            </Badge>
                            ) : (
                            '-'
                            )}
                        </TableCell>
                        <TableCell>
                            <Select
                            value={item.status}
                            onValueChange={(value) =>
                                handleStatusChange(item.id, value as EquipmentStatus)
                            }
                            disabled={!!item.currentProjectId}
                            >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Disponível">Disponível</SelectItem>
                                <SelectItem value="Em Manutenção">
                                Em Manutenção
                                </SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                            </SelectContent>
                            </Select>
                        </TableCell>
                        {canEdit && (
                            <TableCell className="text-right">
                            {item.status === 'Disponível' && (
                                <Button
                                size="sm"
                                onClick={() => handleAllocate(item)}
                                >
                                <Plus className="h-4 w-4 mr-2" /> Alocar a Este Projeto
                                </Button>
                            )}
                             {item.currentProjectId && !isAllocatedToThisProject && (
                                <Button size="sm" variant="outline" onClick={() => handleTransfer(item)} disabled={isSubmitting}>
                                    <ArrowRightLeft className="h-4 w-4 mr-2"/> Transferir para cá
                                </Button>
                            )}
                            {isAllocatedToThisProject && (
                                <span className="text-xs text-muted-foreground italic">Gerir no separador "Equipamentos (Projeto)"</span>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={!!item.currentProjectId}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação é irreversível e irá eliminar o
                                    registo do equipamento "{item.name}". Apenas o
                                    pode fazer se não estiver alocado a um projeto.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                    onClick={() => handleDeleteEquipment(item)}
                                    >
                                    Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            </TableCell>
                        )}
                        </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
