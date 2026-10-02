'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Mail,
  Phone,
  HardHat,
  Briefcase,
  Layers,
  ArrowRight,
  MoreVertical,
  Loader2,
  Filter,
  Check,
  Send,
  Trash2,
  RefreshCw,
  Copy,
  AlertTriangle,
  FileText,
  UserCheck,
  Compass,
  Sparkles,
  Lock,
  Eye,
  Sliders,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import {
  USER_STATUSES,
  ACCESS_PROFILES,
  ORGANIZATION_DEPARTMENTS,
  PROJECT_ROLES,
  PROJECT_RESPONSIBILITIES,
  DEFAULT_PROFILE_PERMISSIONS,
  type UserStatus,
  type AccessProfileId,
  type OrganizationDepartment,
  type ProjectRole,
  type ProjectResponsibility,
  type TeamMemberProfile,
  type Invitation,
  type AuditLog,
  type ModuleKey
} from '@/types/team';
import type { Project } from '@/types/project';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function TeamManagementPage() {
  const { user: currentUser, idToken } = useRequireAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMemberProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');

  // Selected Member for 360° Management Sheet
  const [selectedMember, setSelectedMember] = useState<TeamMemberProfile | null>(null);

  // Invite Member Wizard State (5 Steps)
  const [isInviteWizardOpen, setIsInviteWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Wizard fields
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteJobTitle, setInviteJobTitle] = useState('Engenheiro Residente');
  const [inviteDepartment, setInviteDepartment] = useState<OrganizationDepartment>('Engenharia & Projetos');
  const [inviteProfileId, setInviteProfileId] = useState<AccessProfileId>('engineer');
  const [inviteAssignedProjects, setInviteAssignedProjects] = useState<Array<{
    projectId: string;
    projectName: string;
    projectRole: ProjectRole;
    responsibility: ProjectResponsibility;
  }>>([]);

  // Project Assign form within Wizard
  const [tempProjectId, setTempProjectId] = useState<string>('');
  const [tempProjectRole, setTempProjectRole] = useState<ProjectRole>('Engenheiro de Campo');
  const [tempProjectResp, setTempProjectResp] = useState<ProjectResponsibility>('Responsável pelo Planeamento');

  // Assign Project Modal within Member Details Sheet
  const [isAssignProjectOpen, setIsAssignProjectOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignProjectRole, setAssignProjectRole] = useState<ProjectRole>('Engenheiro de Campo');
  const [assignProjectResp, setAssignProjectResp] = useState<ProjectResponsibility>('Membro Técnico');
  const [isSubmittingProjectAssign, setIsSubmittingProjectAssign] = useState(false);

  // Firestore Subscriptions
  useEffect(() => {
    if (!currentUser) return;

    // 1. Fetch Users
    const usersQ = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const fetched: TeamMemberProfile[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          uid: docSnap.id,
          displayName: d.displayName || d.email?.split('@')[0] || 'Colaborador',
          email: d.email || '',
          phoneNumber: d.phoneNumber || undefined,
          photoURL: d.photoURL || null,
          jobTitle: d.jobTitle || 'Engenheiro',
          department: (d.department as OrganizationDepartment) || 'Engenharia & Projetos',
          profileId: (d.profileId as AccessProfileId) || (d.role === 'super-admin' ? 'admin' : (d.role as AccessProfileId)) || 'engineer',
          status: (d.status as UserStatus) || 'Activo',
          assignedProjects: d.assignedProjects || [],
          customPermissions: d.customPermissions || undefined,
          lastLoginAt: d.lastLoginAt || d.updatedAt || d.createdAt,
          createdAt: d.createdAt,
          invitedBy: d.invitedBy,
        };
      });
      setMembers(fetched);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching members:', err);
      setLoading(false);
    });

    // 2. Fetch Invitations
    const invitesQ = query(collection(db, 'invitations'), orderBy('invitedAt', 'desc'));
    const unsubInvites = onSnapshot(invitesQ, (snapshot) => {
      const fetched: Invitation[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Invitation));
      setInvitations(fetched);
    }, () => {});

    // 3. Fetch Projects
    const projectsQ = query(collection(db, 'projects'), orderBy('name', 'asc'));
    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      const fetched: Project[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Project));
      setProjects(fetched);
    }, () => {});

    // 4. Fetch Audit Logs
    const auditQ = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubAudit = onSnapshot(auditQ, (snapshot) => {
      const fetched: AuditLog[] = snapshot.docs.slice(0, 30).map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as AuditLog));
      setAuditLogs(fetched);
    }, () => {});

    return () => {
      unsubUsers();
      unsubInvites();
      unsubProjects();
      unsubAudit();
    };
  }, [currentUser]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch =
        m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        m.assignedProjects.some(p => p.projectName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || m.department === departmentFilter;
      const matchesProfile = profileFilter === 'all' || m.profileId === profileFilter;

      return matchesSearch && matchesStatus && matchesDepartment && matchesProfile;
    });
  }, [members, searchTerm, statusFilter, departmentFilter, profileFilter]);

  // Real Stats for Dashboard
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.status === 'Activo').length;
    const suspended = members.filter(m => m.status === 'Suspenso').length;
    const pendingInvites = invitations.filter(i => i.status === 'Pendente').length;
    const deptSet = new Set(members.map(m => m.department));
    const projectsWithTeams = new Set(members.flatMap(m => m.assignedProjects.map(p => p.projectId))).size;

    return {
      total,
      active,
      suspended,
      pendingInvites,
      departmentsCount: deptSet.size,
      projectsWithTeams,
    };
  }, [members, invitations]);

  // Wizard Project Tag Handler
  const handleAddProjectToWizard = () => {
    if (!tempProjectId) return;
    const proj = projects.find(p => p.id === tempProjectId);
    if (!proj) return;

    if (inviteAssignedProjects.some(p => p.projectId === tempProjectId)) {
      toast({ title: 'Projeto já adicionado', variant: 'destructive' });
      return;
    }

    setInviteAssignedProjects(prev => [
      ...prev,
      {
        projectId: proj.id,
        projectName: proj.name,
        projectRole: tempProjectRole,
        responsibility: tempProjectResp,
      }
    ]);
    setTempProjectId('');
  };

  const handleRemoveProjectFromWizard = (projectId: string) => {
    setInviteAssignedProjects(prev => prev.filter(p => p.projectId !== projectId));
  };

  // Submit Invite
  const handleSendInvitation = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: inviteName.trim(),
          email: inviteEmail.trim(),
          jobTitle: inviteJobTitle.trim(),
          department: inviteDepartment,
          profileId: inviteProfileId,
          assignedProjects: inviteAssignedProjects,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao enviar convite');
      }

      toast({
        title: 'Convite enviado com sucesso!',
        description: `O convite para ${inviteEmail} foi registado e está pronto para ativação.`,
      });

      // Reset Wizard
      setIsInviteWizardOpen(false);
      setWizardStep(1);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteJobTitle('Engenheiro Residente');
      setInviteDepartment('Engenharia & Projetos');
      setInviteProfileId('engineer');
      setInviteAssignedProjects([]);
    } catch (err: any) {
      console.error('Error sending invite:', err);
      toast({ title: 'Erro ao criar convite', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Resend or Cancel Invitation
  const handleResendInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Falha ao reenviar convite');
      toast({ title: 'Convite reenviado!', description: 'Validade renovada por mais 7 dias.' });
    } catch (err: any) {
      toast({ title: 'Erro ao reenviar', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Falha ao cancelar convite');
      toast({ title: 'Convite cancelado.' });
    } catch (err: any) {
      toast({ title: 'Erro ao cancelar', description: err.message, variant: 'destructive' });
    }
  };

  // Member Status Change (Activar, Suspender, Desactivar)
  const handleUpdateStatus = async (member: TeamMemberProfile, newStatus: UserStatus) => {
    try {
      const res = await fetch(`/api/team/members/${member.uid}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao alterar estado');

      toast({ title: `Estado alterado para "${newStatus}"`, description: resData.message });
      if (selectedMember && selectedMember.uid === member.uid) {
        setSelectedMember({ ...selectedMember, status: newStatus });
      }
    } catch (err: any) {
      toast({ title: 'Erro na alteração', description: err.message, variant: 'destructive' });
    }
  };

  // Member Project Assignment in Sheet
  const handleAssignProjectToMember = async () => {
    if (!selectedMember || !assignProjectId) return;
    const proj = projects.find(p => p.id === assignProjectId);
    if (!proj) return;

    setIsSubmittingProjectAssign(true);
    try {
      const res = await fetch(`/api/team/members/${selectedMember.uid}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId: proj.id,
          projectName: proj.name,
          projectCode: proj.code,
          projectRole: assignProjectRole,
          responsibility: assignProjectResp,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao alocar projeto');

      toast({ title: 'Projeto atribuído!', description: `${selectedMember.displayName} foi alocado a ${proj.name}.` });
      setIsAssignProjectOpen(false);
      setAssignProjectId('');
    } catch (err: any) {
      toast({ title: 'Erro ao atribuir', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingProjectAssign(false);
    }
  };

  const handleRemoveProjectFromMember = async (projectId: string) => {
    if (!selectedMember) return;
    try {
      const res = await fetch(`/api/team/members/${selectedMember.uid}/projects?projectId=${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Erro ao desvincular projeto');
      toast({ title: 'Membro desvinculado do projeto.' });
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'Activo':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">Activo</Badge>;
      case 'Suspenso':
        return <Badge variant="destructive" className="font-medium">Suspenso</Badge>;
      case 'Pendente':
        return <Badge className="bg-amber-600 text-white font-medium">Pendente</Badge>;
      case 'Convidado':
        return <Badge className="bg-blue-600 text-white font-medium">Convidado</Badge>;
      case 'Inactivo':
      default:
        return <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>;
    }
  };

  const getProfileBadge = (profileId: string) => {
    const p = ACCESS_PROFILES.find(ap => ap.id === profileId);
    if (!p) return <Badge variant="outline">{profileId}</Badge>;

    if (profileId === 'admin' || profileId === 'super-admin') {
      return <Badge className="bg-purple-600 text-white font-medium">{p.label}</Badge>;
    }
    if (profileId === 'director') {
      return <Badge className="bg-indigo-600 text-white font-medium">{p.label}</Badge>;
    }
    if (profileId === 'project_manager') {
      return <Badge className="bg-blue-600 text-white font-medium">{p.label}</Badge>;
    }
    return <Badge variant="secondary" className="font-normal">{p.label}</Badge>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8 pb-28 md:pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2.5">
              <Users className="h-8 w-8 text-primary" />
              Gestão de Equipa & Acessos
            </h1>
            <p className="text-muted-foreground">
              Estrutura organizacional, perfis operacionais, atribuição a empreitadas e controlo seguro de permissões.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button onClick={() => { setIsInviteWizardOpen(true); setWizardStep(1); }} className="gap-1.5 shadow-sm">
              <UserPlus className="h-4 w-4" /> Convidar Membro
            </Button>
          </div>
        </div>

        {/* Dashboard Cards (Dados Reais) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <Card className="bg-background">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total da Equipa</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono">{stats.total}</div>
              <p className="text-[11px] text-muted-foreground">Membros cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-background border-emerald-500/20">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Activos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.active}</div>
              <p className="text-[11px] text-muted-foreground">Operacionais na plataforma</p>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400">Convites Pendentes</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.pendingInvites}</div>
              <p className="text-[11px] text-muted-foreground">Aguardando aceitação</p>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-destructive">Suspensos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono text-destructive">{stats.suspended}</div>
              <p className="text-[11px] text-muted-foreground">Acesso bloqueado</p>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Departamentos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono">{stats.departmentsCount}</div>
              <p className="text-[11px] text-muted-foreground">Áreas corporativas</p>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs font-medium text-primary">Projetos c/ Equipa</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-2xl font-bold font-mono text-primary">{stats.projectsWithTeams}</div>
              <p className="text-[11px] text-muted-foreground">Obras com técnicos</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs defaultValue="team" className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="bg-background border p-1">
              <TabsTrigger value="team" className="gap-1.5 text-xs">
                <Users className="h-4 w-4" /> Minha Equipa ({members.length})
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-1.5 text-xs">
                <Send className="h-4 w-4" /> Convites ({invitations.filter(i => i.status === 'Pendente').length})
              </TabsTrigger>
              <TabsTrigger value="profiles" className="gap-1.5 text-xs">
                <Shield className="h-4 w-4" /> Perfis & Permissões
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 text-xs">
                <Clock className="h-4 w-4" /> Registo de Auditoria
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* TAB 1: MINHA EQUIPA */}
          <TabsContent value="team" className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, email, cargo, departamento ou projeto..."
                  className="pl-9 bg-background text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[170px] bg-background text-xs h-9">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Depts.</SelectItem>
                    {ORGANIZATION_DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={profileFilter} onValueChange={setProfileFilter}>
                  <SelectTrigger className="w-[170px] bg-background text-xs h-9">
                    <SelectValue placeholder="Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Perfis</SelectItem>
                    {ACCESS_PROFILES.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background text-xs h-9">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    {USER_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Members Table / Mobile Cards */}
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                {/* Mobile Cards View (< 768px) */}
                <div className="md:hidden divide-y divide-border/60">
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      A carregar a equipa...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      Nenhum membro encontrado.
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.uid}
                        onClick={() => setSelectedMember(member)}
                        className="p-3.5 space-y-2.5 transition-colors active:bg-muted/40 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={member.photoURL || undefined} />
                              <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                                {getInitials(member.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                {member.displayName}
                                {member.uid === currentUser?.uid && (
                                  <Badge variant="outline" className="text-[10px] py-0">Você</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{member.jobTitle} • {member.department}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {getStatusBadge(member.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuLabel>Ações do Membro</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> Visão 360°
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {member.status !== 'Activo' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(member, 'Activo')} className="text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Ativar Membro
                                  </DropdownMenuItem>
                                )}
                                {member.status !== 'Suspenso' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(member, 'Suspenso')} className="text-destructive">
                                    <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Suspender
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/30">
                          <div>
                            {getProfileBadge(member.profileId)}
                          </div>
                          {member.assignedProjects.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {member.assignedProjects[0].projectName}
                              </Badge>
                              {member.assignedProjects.length > 1 && (
                                <Badge variant="outline" className="text-[10px] py-0">
                                  +{member.assignedProjects.length - 1}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Sem projetos</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[280px]">Membro / Colaborador</TableHead>
                        <TableHead>Cargo & Departamento</TableHead>
                        <TableHead>Perfil de Acesso</TableHead>
                        <TableHead>Projetos Atribuídos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                            A carregar a equipa da organização...
                          </TableCell>
                        </TableRow>
                      ) : filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                            Nenhum membro encontrado com os critérios selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow
                            key={member.uid}
                            onClick={() => setSelectedMember(member)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border">
                                  <AvatarImage src={member.photoURL || undefined} />
                                  <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">
                                    {getInitials(member.displayName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                    {member.displayName}
                                    {member.uid === currentUser?.uid && (
                                      <Badge variant="outline" className="text-[10px] py-0">Você</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" /> {member.email}
                                    </span>
                                    {member.phoneNumber && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> {member.phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium text-xs text-foreground">{member.jobTitle}</div>
                              <div className="text-[11px] text-muted-foreground">{member.department}</div>
                            </TableCell>

                            <TableCell>
                              {getProfileBadge(member.profileId)}
                            </TableCell>

                            <TableCell>
                              {member.assignedProjects.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Nenhum projeto</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {member.assignedProjects.slice(0, 2).map((p) => (
                                    <Badge key={p.projectId} variant="secondary" className="text-[10px] py-0">
                                      {p.projectName}
                                    </Badge>
                                  ))}
                                  {member.assignedProjects.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] py-0">
                                      +{member.assignedProjects.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            <TableCell>
                              {getStatusBadge(member.status)}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {member.lastLoginAt ? (
                                <span>{formatDistanceToNow(new Date((member.lastLoginAt as any)?.toDate?.() || member.lastLoginAt), { addSuffix: true, locale: ptBR })}</span>
                              ) : (
                                <span>Recente</span>
                              )}
                            </TableCell>

                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuLabel>Ações do Membro</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Visão 360° do Membro
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {member.status !== 'Activo' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(member, 'Activo')} className="text-emerald-600">
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Ativar Membro
                                    </DropdownMenuItem>
                                  )}
                                  {member.status !== 'Suspenso' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(member, 'Suspenso')} className="text-destructive">
                                      <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Suspender Acesso
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: GESTÃO DE CONVITES */}
          <TabsContent value="invitations" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Convites para a Organização ({invitations.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Acompanhe o estado dos convites enviados, reenvie ou revogue acessos pendentes.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => { setIsInviteWizardOpen(true); setWizardStep(1); }} className="gap-1.5 h-8 text-xs">
                  <UserPlus className="h-3.5 w-3.5" /> Novo Convite
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Convidado</TableHead>
                      <TableHead>Cargo & Departamento</TableHead>
                      <TableHead>Perfil Previsto</TableHead>
                      <TableHead>Enviado Por</TableHead>
                      <TableHead>Tempo de Espera</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                          Nenhum convite registado no momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitations.map(invite => {
                        const invitedDate = invite.invitedAt ? new Date((invite.invitedAt as any)?.toDate?.() || invite.invitedAt) : new Date();
                        const timeAgo = formatDistanceToNow(invitedDate, { addSuffix: true, locale: ptBR });

                        return (
                          <TableRow key={invite.id} className="text-xs">
                            <TableCell>
                              <div className="font-semibold text-foreground">{invite.displayName}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {invite.email}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">{invite.jobTitle}</div>
                              <div className="text-[11px] text-muted-foreground">{invite.department}</div>
                            </TableCell>

                            <TableCell>
                              {getProfileBadge(invite.profileId)}
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {invite.invitedBy?.displayName || 'Administrador'}
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-amber-700 dark:text-amber-400">
                                Enviado {timeAgo}
                              </span>
                            </TableCell>

                            <TableCell>
                              {invite.status === 'Pendente' ? (
                                <Badge className="bg-amber-600 text-white font-medium">Aguardando aceitação</Badge>
                              ) : invite.status === 'Aceite' ? (
                                <Badge className="bg-emerald-600 text-white font-medium">Aceite</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">{invite.status}</Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {invite.status === 'Pendente' && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleResendInvite(invite.id)}
                                    title="Reenviar convite e renovar validade por 7 dias"
                                  >
                                    <RefreshCw className="h-3 w-3" /> Reenviar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() => handleCancelInvite(invite.id)}
                                    title="Cancelar convite"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PERFIS & PERMISSÕES */}
          <TabsContent value="profiles" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Matriz de Perfis e Permissões por Módulo
                </CardTitle>
                <CardDescription className="text-xs">
                  Os perfis de acesso são baseados no Princípio de Mínimo Acesso. Abaixo está a definição de cada função na organização.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ACCESS_PROFILES.map(prof => (
                    <div key={prof.id} className="p-3.5 rounded-lg border bg-background space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{prof.label}</span>
                        {getProfileBadge(prof.id)}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {prof.description}
                      </p>
                      <div className="pt-2 border-t mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Colaboradores com este perfil:</span>
                        <span className="font-bold font-mono text-foreground">
                          {members.filter(m => m.profileId === prof.id).length}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: AUDITORIA */}
          <TabsContent value="audit" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Registo Cronológico de Auditoria & Segurança
                </CardTitle>
                <CardDescription className="text-xs">
                  Rastreabilidade probatória: Quem fez → O que fez → Quando fez → Em que contexto.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Alvo / Registo</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Contexto</TableHead>
                      <TableHead className="text-right">Data & Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                          Nenhum evento de auditoria registado até ao momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => {
                        const dateObj = log.timestamp ? new Date((log.timestamp as any)?.toDate?.() || log.timestamp) : new Date();

                        return (
                          <TableRow key={log.id} className="text-xs">
                            <TableCell className="font-medium">
                              {log.actor?.displayName || 'Sistema'}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {log.action}
                              </Badge>
                            </TableCell>

                            <TableCell className="font-medium text-foreground">
                              {log.target?.name || log.target?.id}
                            </TableCell>

                            <TableCell className="text-muted-foreground max-w-[280px] truncate">
                              {log.details}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {log.context || 'Equipa & Acessos'}
                            </TableCell>

                            <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                              {format(dateObj, 'dd/MM/yyyy HH:mm:ss')}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* WIZARD DIALOG: CONVIDAR MEMBRO (5 PASSOS) */}
        <Dialog open={isInviteWizardOpen} onOpenChange={setIsInviteWizardOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Convidar Novo Membro para a Equipa
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  Passo {wizardStep} de 5
                </Badge>
              </div>
              <DialogDescription>
                {wizardStep === 1 && 'Identificação inicial do colaborador.'}
                {wizardStep === 2 && 'Defina o cargo profissional e o departamento.'}
                {wizardStep === 3 && 'Escolha o perfil de acesso e privilégios na plataforma.'}
                {wizardStep === 4 && 'Atribua as empreitadas em que o colaborador irá trabalhar.'}
                {wizardStep === 5 && 'Revise os dados antes de disparar o convite oficial.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {/* PASSO 1: QUEM É? */}
              {wizardStep === 1 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-name" className="text-xs font-semibold">Nome Completo do Colaborador *</Label>
                    <Input
                      id="wiz-name"
                      placeholder="Ex: Eng. Mário Tavares"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="wiz-email" className="text-xs font-semibold">Email Corporativo *</Label>
                      <Input
                        id="wiz-email"
                        type="email"
                        placeholder="mario.tavares@empresa.ao"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wiz-phone" className="text-xs font-semibold">Telefone de Contacto</Label>
                      <Input
                        id="wiz-phone"
                        placeholder="+244 923 000 000"
                        value={invitePhone}
                        onChange={e => setInvitePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 2: CARGO & DEPARTAMENTO */}
              {wizardStep === 2 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-job" className="text-xs font-semibold">Cargo / Função Profissional *</Label>
                    <Input
                      id="wiz-job"
                      placeholder="Ex: Engenheiro Residente / Fiscal de Estruturas"
                      value={inviteJobTitle}
                      onChange={e => setInviteJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wiz-dept" className="text-xs font-semibold">Departamento da Organização *</Label>
                    <Select value={inviteDepartment} onValueChange={v => setInviteDepartment(v as OrganizationDepartment)}>
                      <SelectTrigger id="wiz-dept"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORGANIZATION_DEPARTMENTS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* PASSO 3: PERFIL DE ACESSO */}
              {wizardStep === 3 && (
                <div className="space-y-3 text-xs">
                  <Label className="text-xs font-semibold">Selecione o Perfil de Acesso *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {ACCESS_PROFILES.map(prof => (
                      <div
                        key={prof.id}
                        onClick={() => setInviteProfileId(prof.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          inviteProfileId === prof.id
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-xs">
                          <span>{prof.label}</span>
                          {inviteProfileId === prof.id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                          {prof.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PASSO 4: ATRIBUIÇÃO DE PROJETOS */}
              {wizardStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-muted/30 border rounded-lg space-y-3">
                    <h4 className="font-semibold text-xs flex items-center gap-1.5">
                      <HardHat className="h-4 w-4 text-primary" /> Alocar a um Projeto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select value={tempProjectId} onValueChange={setTempProjectId}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolha a obra..." /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={tempProjectRole} onValueChange={v => setTempProjectRole(v as ProjectRole)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Função no projeto" /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_ROLES.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={tempProjectResp} onValueChange={v => setTempProjectResp(v as ProjectResponsibility)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Responsabilidade" /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_RESPONSIBILITIES.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddProjectToWizard} disabled={!tempProjectId} className="h-7 text-xs gap-1">
                      <Check className="h-3 w-3" /> Adicionar Projeto
                    </Button>
                  </div>

                  {/* List of projects added */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs text-muted-foreground uppercase">Projetos Atribuídos ({inviteAssignedProjects.length})</h5>
                    {inviteAssignedProjects.length === 0 ? (
                      <p className="text-muted-foreground text-xs italic py-2">Nenhum projeto associado. O utilizador terá acesso apenas aos projetos onde for adicionado posteriormente.</p>
                    ) : (
                      inviteAssignedProjects.map(p => (
                        <div key={p.projectId} className="flex items-center justify-between p-2 rounded border bg-background text-xs">
                          <div>
                            <span className="font-semibold">{p.projectName}</span>
                            <div className="text-[11px] text-muted-foreground">
                              Função: <strong>{p.projectRole}</strong> • {p.responsibility}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveProjectFromWizard(p.projectId)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PASSO 5: REVISÃO & CONFIRMAÇÃO */}
              {wizardStep === 5 && (
                <div className="space-y-3 text-xs bg-muted/20 border rounded-lg p-3.5">
                  <h4 className="font-bold text-sm text-foreground">Resumo do Convite</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-semibold">{inviteName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold">{inviteEmail}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b">
                    <span className="text-muted-foreground">Cargo & Departamento:</span>
                    <span className="font-semibold">{inviteJobTitle} ({inviteDepartment})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b">
                    <span className="text-muted-foreground">Perfil de Acesso:</span>
                    <span>{getProfileBadge(inviteProfileId)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <span className="text-muted-foreground">Obras Atribuídas:</span>
                    <span className="font-semibold">{inviteAssignedProjects.length} projeto(s)</span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              {wizardStep > 1 ? (
                <Button variant="outline" onClick={() => setWizardStep(prev => prev - 1)} disabled={isSubmittingInvite}>
                  Voltar
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setIsInviteWizardOpen(false)}>
                  Cancelar
                </Button>
              )}

              {wizardStep < 5 ? (
                <Button onClick={() => {
                  if (wizardStep === 1 && (!inviteName.trim() || !inviteEmail.trim())) {
                    toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' });
                    return;
                  }
                  setWizardStep(prev => prev + 1);
                }} className="gap-1">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSendInvitation} disabled={isSubmittingInvite} className="gap-1.5">
                  {isSubmittingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar Convite Oficial
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SHEET: VISÃO 360° DO MEMBRO */}
        <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedMember && (
              <>
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={selectedMember.photoURL || undefined} />
                      <AvatarFallback className="font-bold text-base bg-primary/10 text-primary">
                        {getInitials(selectedMember.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-lg font-bold">{selectedMember.displayName}</SheetTitle>
                        {getStatusBadge(selectedMember.status)}
                      </div>
                      <SheetDescription className="text-xs">
                        {selectedMember.jobTitle} • {selectedMember.department}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-6 py-4 text-xs">
                  {/* Informações de Contacto & Acesso */}
                  <Card>
                    <CardHeader className="py-2.5">
                      <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-primary" /> Perfil & Acesso na Organização
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-semibold">{selectedMember.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Telefone</span>
                        <span>{selectedMember.phoneNumber || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Perfil de Acesso</span>
                        <span>{getProfileBadge(selectedMember.profileId)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Último Acesso</span>
                        <span>{selectedMember.lastLoginAt ? format(new Date((selectedMember.lastLoginAt as any)?.toDate?.() || selectedMember.lastLoginAt), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Recente'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Projetos Atribuídos */}
                  <Card>
                    <CardHeader className="py-2.5 flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                        <HardHat className="h-4 w-4 text-primary" /> Obras & Projetos Atribuídos ({selectedMember.assignedProjects.length})
                      </CardTitle>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setIsAssignProjectOpen(true)}>
                        <UserPlus className="h-3 w-3" /> Alocar Obra
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedMember.assignedProjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">Nenhum projeto atribuído atualmente a este membro.</p>
                      ) : (
                        selectedMember.assignedProjects.map(p => (
                          <div key={p.projectId} className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 text-xs">
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {p.projectName}
                                <Badge variant="outline" className="text-[10px]">{p.projectRole}</Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Responsabilidade: <strong>{p.responsibility || 'Técnico'}</strong>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveProjectFromMember(p.projectId)}
                              title="Desvincular deste projeto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Ações Administrativas de Segurança */}
                  <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
                    <p className="font-semibold text-xs">Segurança Operacional & Estado</p>
                    <div className="flex gap-2">
                      {selectedMember.status !== 'Activo' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(selectedMember, 'Activo')} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ativar Membro
                        </Button>
                      )}
                      {selectedMember.status !== 'Suspenso' && (
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedMember, 'Suspenso')} className="h-8 text-xs gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Suspender Acesso
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                      Ao suspender um membro, o acesso à plataforma é bloqueado de imediato, mas todos os registos históricos, medições e RDOs assinados permanecem preservados com autoria intacta.
                    </p>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* MODAL: ALOCAR PROJETO AO MEMBRO */}
        <Dialog open={isAssignProjectOpen} onOpenChange={setIsAssignProjectOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alocar Membro a um Projeto</DialogTitle>
              <DialogDescription>
                Defina a função e responsabilidade técnica de {selectedMember?.displayName} nesta obra.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label htmlFor="proj-select">Empreitada / Projeto *</Label>
                <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                  <SelectTrigger id="proj-select"><SelectValue placeholder="Selecione o projeto..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proj-role">Função no Projeto *</Label>
                <Select value={assignProjectRole} onValueChange={v => setAssignProjectRole(v as ProjectRole)}>
                  <SelectTrigger id="proj-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proj-resp">Responsabilidade Técnica Atribuída *</Label>
                <Select value={assignProjectResp} onValueChange={v => setAssignProjectResp(v as ProjectResponsibility)}>
                  <SelectTrigger id="proj-resp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_RESPONSIBILITIES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignProjectOpen(false)} disabled={isSubmittingProjectAssign}>
                Cancelar
              </Button>
              <Button onClick={handleAssignProjectToMember} disabled={isSubmittingProjectAssign || !assignProjectId} className="gap-1.5">
                {isSubmittingProjectAssign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar Alocação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
