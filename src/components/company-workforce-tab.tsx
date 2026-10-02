
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
  writeBatch,
  getDoc,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove,
  setDoc,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
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
  ArrowRightLeft,
  Search,
  Pencil,
  User,
} from 'lucide-react';
import {
  type WorkforceMember,
  type EmploymentType,
  type ProjectWorkforceMember,
  type WorkforceStatus,
} from '@/types/workforce';
import { type Project } from '@/types/project';
import { useAuth } from '@/hooks/use-auth';
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
import { DatePicker } from './ui/date-picker';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useRouter } from 'next/navigation';


interface CompanyWorkforceTabProps {
  userRole: UserRole | null;
  projectId: string | null;
  initialWorkforce: WorkforceMember[];
  isLoading: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};


export default function CompanyWorkforceTab({
  userRole,
  projectId,
  initialWorkforce,
  isLoading
}: CompanyWorkforceTabProps) {
  const { user, idToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [editingMember, setEditingMember] = useState<WorkforceMember | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Efetivo');
  const [contact, setContact] = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canEdit = user?.role === 'super-admin' || user?.role === 'Gestor de RH' || user?.accessProfile === 'admin' || user?.accessProfile === 'hr_manager';

  useEffect(() => {
    if (!projectId) return;
    
    const projectRef = doc(db, 'projects', projectId);
    getDoc(projectRef).then((doc) => {
      if (doc.exists()) setProject({ id: doc.id, ...doc.data() } as Project);
    });

  }, [projectId]);

  const filteredWorkforce = useMemo(() => {
    return initialWorkforce.filter(member => {
        const matchesSearch = searchTerm.trim() === '' ||
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.role.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

        return matchesSearch && matchesStatus;
    });
  }, [initialWorkforce, searchTerm, statusFilter]);

  const resetForm = () => {
    setName('');
    setRole('');
    setEmploymentType('Efetivo');
    setContact('');
    setCostPerHour('');
    setCostPerUnit('');
    setNotes('');
    setEditingMember(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsFormDialogOpen(false);
  };
  
    const handleOpenDialog = (member: WorkforceMember | null = null) => {
        if (member) {
             setEditingMember(member);
            setName(member.name);
            setRole(member.role);
            setEmploymentType(member.employmentType);
            setContact(member.contact || '');
            setCostPerHour(String(member.costPerHour || ''));
            setCostPerUnit(String(member.costPerUnit || ''));
            setNotes(member.notes || '');
            setPhotoPreview(member.photoURL || null);
            setPhotoFile(null);
        } else {
            resetForm();
        }
        setIsFormDialogOpen(true);
    };
    
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
  const uploadPhoto = async (memberId: string): Promise<string> => {
        if (!photoFile) {
            return editingMember?.photoURL || '';
        }
        if (!idToken) {
            throw new Error("Utilizador não autenticado.");
        }
        
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('path', `workforce/${memberId}/profile`);

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no upload da foto.');
        }

        const { url } = await response.json();
        return url;
    };

  const handleSubmit = async () => {
    if (!canEdit || !user) return;
    if (!name || !role) {
      toast({ title: 'Campos obrigatórios em falta', description: 'Nome e função são obrigatórios.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    try {
        if (editingMember) {
             let photoURL = editingMember.photoURL || '';
            if (photoFile) {
                photoURL = await uploadPhoto(editingMember.id);
            } else if (!photoPreview) {
                photoURL = '';
            }
            const memberRef = doc(db, 'workforce', editingMember.id);
            await updateDoc(memberRef, {
                name, role, employmentType, contact,
                costPerHour: parseFloat(costPerHour) || 0,
                costPerUnit: parseFloat(costPerUnit) || 0,
                notes, photoURL,
            });
            toast({ title: 'Funcionário atualizado!' });
        } else {
             const newMemberRef = doc(collection(db, 'workforce'));
             const memberId = newMemberRef.id;
             let photoURL = '';
             if (photoFile) {
                 photoURL = await uploadPhoto(memberId);
             }
            
            await setDoc(newMemberRef, {
                name, role, employmentType, contact,
                costPerHour: parseFloat(costPerHour) || 0,
                costPerUnit: parseFloat(costPerUnit) || 0,
                notes, photoURL,
                status: 'Ativo',
                documents: [], skills: [], createdAt: serverTimestamp(),
                author: { uid: user.uid, displayName: user.displayName || user.email },
            });
            toast({ title: 'Funcionário adicionado ao quadro geral!' });
        }
        resetForm();
        setIsFormDialogOpen(false);
    } catch (error: any) {
      console.error('Error submitting workforce member:', error);
      toast({ title: `Erro ao ${editingMember ? 'atualizar' : 'adicionar'} funcionário`, description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: WorkforceMember) => {
    if (!canEdit) return;
    if (member.currentProjectId) {
      toast({
        title: 'Ação não permitida',
        description:
          'Não pode eliminar um funcionário que está alocado a um projeto.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'workforce', member.id));
      toast({ title: 'Funcionário eliminado do quadro.' });
    } catch (error) {
      console.error('Error deleting member: ', error);
      toast({ title: 'Erro ao eliminar funcionário.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (
    memberId: string,
    newStatus: WorkforceStatus
  ) => {
    if (!canEdit) return;
    try {
      const memberRef = doc(db, 'workforce', memberId);
      await updateDoc(memberRef, { status: newStatus });
      toast({ title: 'Estado do funcionário atualizado.' });
    } catch (error) {
      console.error('Error updating member status: ', error);
      toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
    }
  };

  const handleAllocate = async (member: WorkforceMember) => {
    if (!canEdit || !project) return;
    const batch = writeBatch(db);
    // 1. Update the global member document
    const globalEqRef = doc(db, 'workforce', member.id);
    batch.update(globalEqRef, {
      status: 'Ativo',
      currentProjectId: project.id,
      currentProjectName: project.name,
    });
    // 2. Add the member to the project's subcollection
    const projectEqRef = doc(collection(db, 'projects', project.id, 'workforce'));
    batch.set(projectEqRef, {
      workforceId: member.id,
      name: member.name,
      role: member.role,
      employmentType: member.employmentType,
      allocatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
      toast({
        title: 'Funcionário Alocado!',
        description: `${member.name} foi adicionado a este projeto.`,
      });
    } catch (error) {
      console.error('Error allocating member:', error);
      toast({ title: 'Erro ao alocar', variant: 'destructive' });
    }
  };
  
    const handleTransfer = async (member: WorkforceMember) => {
        if (!canEdit || !project || !member.currentProjectId) return;

        const isConfirmed = confirm(`Tem a certeza que deseja transferir "${member.name}" do projeto "${member.currentProjectName}" para "${project.name}"?`);
        if (!isConfirmed) return;

        setIsSubmitting(true);
        const batch = writeBatch(db);
        
        try {
            const oldProjectEqQuery = query(
                collection(db, 'projects', member.currentProjectId, 'workforce'),
                where('workforceId', '==', member.id)
            );
            const oldProjectEqSnapshot = await getDocs(oldProjectEqQuery);
            if (!oldProjectEqSnapshot.empty) {
                const oldProjectEqDocRef = oldProjectEqSnapshot.docs[0].ref;
                batch.delete(oldProjectEqDocRef);
            }

            if (projectId) {
                const newProjectEqRef = doc(collection(db, 'projects', projectId, 'workforce'));
                batch.set(newProjectEqRef, {
                    workforceId: member.id,
                    name: member.name,
                    role: member.role,
                    employmentType: member.employmentType,
                    allocatedAt: serverTimestamp(),
                });
            }

            const globalEqRef = doc(db, 'workforce', member.id);
            batch.update(globalEqRef, {
                currentProjectId: projectId,
                currentProjectName: project.name,
            });

            await batch.commit();
            toast({ title: 'Transferência Concluída!', description: `${member.name} foi transferido para ${project.name}.` });
        } catch (error) {
            console.error("Error transferring member: ", error);
            toast({ title: 'Erro ao transferir', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };


  return (
    <div className="space-y-6 pt-4">
      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => { if(!open) resetForm() }} >
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>Quadro de Pessoal da Empresa</CardTitle>
                    <CardDescription>
                        {projectId ? 'Gira o inventário global e aloque funcionários a este projeto.' : 'Gira o inventário global de funcionários da sua empresa.'}
                    </CardDescription>
                </div>
                {canEdit && (
                     <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog(null)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Funcionário
                        </Button>
                    </DialogTrigger>
                )}
            </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar por nome ou função..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por estado..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="De Férias">De Férias</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin" data-testid="loader"/> Carregando...
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< 768px) */}
              <div className="md:hidden space-y-3">
                {filteredWorkforce.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum funcionário encontrado.
                  </div>
                ) : (
                  filteredWorkforce.map((item) => {
                    const isAllocatedToThisProject = projectId ? item.currentProjectId === projectId : false;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border bg-card/80 shadow-2xs space-y-3 transition-colors active:bg-muted/30"
                        onClick={() => router.push(`/hr/workforce/${item.id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border border-border">
                              <AvatarImage src={item.photoURL} alt={item.name} />
                              <AvatarFallback className="font-semibold text-xs">{getInitials(item.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground tracking-tight leading-tight">{item.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.role}</p>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={item.status}
                              onValueChange={(value) => handleStatusChange(item.id, value as WorkforceStatus)}
                              disabled={!!item.currentProjectId || !canEdit}
                            >
                              <SelectTrigger className="w-[100px] h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="De Férias">De Férias</SelectItem>
                                <SelectItem value="Inativo">Inativo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                          <div>
                            {item.currentProjectId ? (
                              <Badge
                                variant={isAllocatedToThisProject ? 'default' : 'secondary'}
                                className="text-[10px] font-normal"
                              >
                                {item.currentProjectName || 'Projeto Desconhecido'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                                Disponível
                              </Badge>
                            )}
                          </div>

                          {canEdit && (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenDialog(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {projectId && item.status === 'Ativo' && !item.currentProjectId && (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs px-2.5"
                                  onClick={() => handleAllocate(item)}
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Alocar
                                </Button>
                              )}
                              {projectId && item.currentProjectId && !isAllocatedToThisProject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs px-2.5"
                                  onClick={() => handleTransfer(item)}
                                  disabled={isSubmitting}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transferir
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Alocado ao Projeto</TableHead>
                      <TableHead>Estado Global</TableHead>
                      {canEdit && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkforce.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center">
                          Nenhum funcionário encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkforce.map((item) => {
                        const isAllocatedToThisProject = projectId ? item.currentProjectId === projectId : false;
                        return (
                          <TableRow
                            key={item.id}
                            className={item.status !== 'Ativo' ? 'text-muted-foreground' : 'cursor-pointer'}
                            onClick={() => router.push(`/hr/workforce/${item.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={item.photoURL} alt={item.name} />
                                  <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  {item.name}
                                  <p className="text-xs text-muted-foreground">{item.role}</p>
                                </div>
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
                                <Badge variant="outline">Disponível</Badge>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={item.status}
                                onValueChange={(value) =>
                                  handleStatusChange(item.id, value as WorkforceStatus)
                                }
                                disabled={!!item.currentProjectId || !canEdit}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ativo">Ativo</SelectItem>
                                  <SelectItem value="De Férias">De Férias</SelectItem>
                                  <SelectItem value="Inativo">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Pencil className="h-4 w-4"/></Button>
                                {projectId && item.status === 'Ativo' && !item.currentProjectId && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAllocate(item)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" /> Alocar
                                  </Button>
                                )}
                                {projectId && item.currentProjectId && !isAllocatedToThisProject && (
                                  <Button size="sm" variant="outline" onClick={() => handleTransfer(item)} disabled={isSubmitting}>
                                    <ArrowRightLeft className="h-4 w-4 mr-2"/> Transferir
                                  </Button>
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
                                        registo do funcionário "{item.name}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteMember(item)}
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
        </Card>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Altere os dados do funcionário.' : 'Registe um novo membro no quadro geral da sua empresa.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
              <div className="space-y-2">
                <Label>Foto (Opcional)</Label>
                <div className="flex items-center gap-4">
                     <Avatar className="h-16 w-16">
                        {photoPreview ? <AvatarImage src={photoPreview} /> : null}
                        <AvatarFallback>{name ? getInitials(name) : <User />}</AvatarFallback>
                    </Avatar>
                     <Input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wf-name">Nome Completo</Label>
                    <Input id="wf-name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="wf-role">Função</Label>
                    <Input id="wf-role" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Engenheiro Civil"/>
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="wf-type">Vínculo Laboral</Label>
                    <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                        <SelectTrigger id="wf-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Efetivo">Efetivo</SelectItem>
                            <SelectItem value="Temporário">Temporário</SelectItem>
                            <SelectItem value="Subcontratado">Subcontratado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="wf-contact">Contacto Telefónico</Label>
                    <Input id="wf-contact" value={contact} onChange={e => setContact(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wf-cost-hour">Custo por Hora (Kz)</Label>
                    <Input id="wf-cost-hour" type="number" value={costPerHour} onChange={e => setCostPerHour(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="wf-cost-unit">Custo por Unidade (Kz)</Label>
                    <Input id="wf-cost-unit" type="number" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} />
                </div>
              </div>
               <div className="space-y-2">
                    <Label htmlFor="wf-notes">Notas</Label>
                    <Textarea id="wf-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais..." />
                </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              {editingMember ? 'Guardar Alterações' : 'Adicionar Funcionário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
