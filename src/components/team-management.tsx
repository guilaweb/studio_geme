'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Trash2, UserPlus, X, HelpCircle, Shield, Briefcase, Phone, Mail, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PROJECT_ROLES, PROJECT_RESPONSIBILITIES, type ProjectRole, type ProjectResponsibility } from '@/types/team';

export interface ProjectTeamMember {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  responsibility?: string;
  department?: string;
  phone?: string;
  joinedAt?: any;
}

interface SearchResultUser {
  uid: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
}

const getInitials = (name: string) => {
  if (!name) return 'U';
  const names = name.split(' ').filter(Boolean);
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function TeamManagement({ projectId, userRole }: { projectId: string; userRole?: string | null }) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResultUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('Engenheiro Residente');
  const [selectedResponsibility, setSelectedResponsibility] = useState<string>('Coordenação Geral');

  const canEdit = userRole === 'Gestor' || userRole === 'Gestor de Projecto' || authUser?.role === 'super-admin' || (authUser?.role as string) === 'admin';

  useEffect(() => {
    if (!projectId) return;

    const teamCollectionRef = collection(db, 'projects', projectId, 'team');
    const unsubscribe = onSnapshot(teamCollectionRef, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProjectTeamMember));
      setTeamMembers(members);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching team members: ', error);
      toast({ title: 'Erro ao carregar equipa', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, toast]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast({ title: 'Pesquisa inválida', description: 'Digite pelo menos 2 caracteres para pesquisar.', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    try {
      const usersRef = collection(db, 'users');
      // Look up users in the organization
      const querySnapshot = await getDocs(usersRef);
      const existingMemberIds = new Set(teamMembers.map(m => m.uid));
      const term = searchQuery.toLowerCase().trim();

      const users: SearchResultUser[] = querySnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as any))
        .filter(user => {
          if (existingMemberIds.has(user.uid)) return false;
          const matchEmail = user.email?.toLowerCase().includes(term);
          const matchName = user.displayName?.toLowerCase().includes(term);
          return matchEmail || matchName;
        });

      setSearchResults(users);
      if (users.length === 0) {
        toast({ title: 'Nenhum colaborador encontrado', description: 'Pode convidar novos membros através do menu Equipa & Acessos.' });
      }
    } catch (error) {
      console.error('Error searching users: ', error);
      toast({ title: 'Erro ao pesquisar', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    setIsAdding(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';

      const response = await fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: selectedUser.uid,
          email: selectedUser.email,
          displayName: selectedUser.displayName,
          role: selectedRole,
          responsibility: selectedResponsibility,
          department: selectedUser.department || '',
          phone: selectedUser.phone || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao adicionar membro.');
      }

      toast({ 
        title: 'Membro Alocado!', 
        description: `${selectedUser.displayName} foi integrado na equipa com sucesso.` 
      });

      // Reset
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole('Engenheiro Residente');
      setSelectedResponsibility('Coordenação Geral');
    } catch (error: any) {
      console.error('Error adding member: ', error);
      toast({ title: 'Erro ao adicionar membro', description: error.message, variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setIsUpdatingRole(memberId);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
      const response = await fetch(`/api/projects/${projectId}/team/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId, newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar função.');
      }

      toast({ title: 'Função atualizada com sucesso!' });
    } catch (error: any) {
      console.error('Error updating role: ', error);
      toast({ title: 'Erro ao atualizar função', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleResponsibilityChange = async (memberId: string, newResp: string) => {
    setIsUpdatingRole(memberId);
    try {
      const currentMember = teamMembers.find(m => m.uid === memberId);
      const token = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
      const response = await fetch(`/api/projects/${projectId}/team/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          memberId, 
          newRole: currentMember?.role || 'Engenheiro Residente',
          responsibility: newResp 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar responsabilidade.');
      }

      toast({ title: 'Responsabilidade técnica atualizada!' });
    } catch (error: any) {
      console.error('Error updating responsibility: ', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (uid: string, name: string) => {
    if (!confirm(`Tem a certeza que deseja remover ${name} deste projeto? O histórico de relatórios e apontamentos criados por este colaborador permanecerá totalmente intacto.`)) {
      return;
    }
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
      const response = await fetch(`/api/projects/${projectId}/team/${uid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao remover membro.');
      }

      toast({ title: 'Membro desvinculado do projeto.' });
    } catch (error: any) {
      console.error('Error removing member: ', error);
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-lg font-bold">Equipa & Alocação Técnica do Projecto</CardTitle>
              <Badge variant="secondary" className="font-semibold text-xs">
                {teamMembers.length} {teamMembers.length === 1 ? 'Membro' : 'Membros'}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              Gira quem atua neste projeto, com funções específicas (ex: Engenheiro Residente, Fiscal) e responsabilidades operacionais atribuídas.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
              <Link href="/team">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Painel Geral de Acessos
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                A remoção ou suspensão de um utilizador desativa apenas os seus acessos imediatos. Todos os RDOs, medições e logs de auditoria permanecem inalterados por razões legais e de governança.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add Member Section */}
        {canEdit && (
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Alocar Colaborador ao Projecto</h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Pesquise colaboradores já registados na organização
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar colaborador por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching} size="sm" className="h-9 px-4 text-xs font-semibold gap-1.5">
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Pesquisar
              </Button>
            </div>

            {/* Search results list */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="border rounded-lg p-2 space-y-1.5 max-h-52 overflow-y-auto bg-card shadow-sm">
                <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                  Selecione o utilizador para alocar:
                </div>
                {searchResults.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center justify-between p-2 hover:bg-muted/80 rounded-md cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{user.displayName}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.jobTitle && <Badge variant="outline" className="text-[10px]">{user.jobTitle}</Badge>}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-primary font-bold">
                        Selecionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected User Allocation Form */}
            {selectedUser && (
              <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 border-2 border-primary/30">
                      <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                        {getInitials(selectedUser.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-bold text-foreground">{selectedUser.displayName}</div>
                      <div className="text-[11px] text-muted-foreground">{selectedUser.email}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setSelectedUser(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Função no Projecto *</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="h-8 text-xs bg-card">
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Responsabilidade Técnica Primária</label>
                    <Select value={selectedResponsibility} onValueChange={setSelectedResponsibility}>
                      <SelectTrigger className="h-8 text-xs bg-card">
                        <SelectValue placeholder="Selecione a responsabilidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_RESPONSIBILITIES.map((resp) => (
                          <SelectItem key={resp} value={resp} className="text-xs">{resp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedUser(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddMember} disabled={isAdding} size="sm" className="h-8 text-xs font-bold gap-1.5">
                    {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    Confirmar Alocação ao Projecto
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Members List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Membros Alocados ao Projecto ({teamMembers.length})
            </h4>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl p-6 bg-muted/10">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">Nenhum membro alocado ainda</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Adicione engenheiros, fiscais e técnicos acima para que possam aceder a este projeto e receber tarefas.
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-bold text-foreground">Colaborador</TableHead>
                    <TableHead className="text-xs font-bold text-foreground">Função no Projecto</TableHead>
                    <TableHead className="text-xs font-bold text-foreground">Responsabilidade Técnica</TableHead>
                    <TableHead className="text-xs font-bold text-foreground text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.uid} className="hover:bg-muted/30">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {getInitials(member.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              {member.displayName}
                              {member.uid === authUser?.uid && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/40 text-primary">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        {canEdit && member.uid !== authUser?.uid ? (
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => handleRoleChange(member.uid, newRole)}
                            disabled={isUpdatingRole === member.uid}
                          >
                            <SelectTrigger className="h-7 text-xs w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_ROLES.map((role) => (
                                <SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium bg-background">
                            {member.role || 'Leitor'}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        {canEdit && member.uid !== authUser?.uid ? (
                          <Select
                            value={member.responsibility || 'Coordenação Geral'}
                            onValueChange={(newResp) => handleResponsibilityChange(member.uid, newResp)}
                            disabled={isUpdatingRole === member.uid}
                          >
                            <SelectTrigger className="h-7 text-xs w-[190px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_RESPONSIBILITIES.map((resp) => (
                                <SelectItem key={resp} value={resp} className="text-xs">{resp}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
                            {member.responsibility || 'Coordenação Geral'}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        {canEdit && member.uid !== authUser?.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(member.uid, member.displayName)}
                            title="Remover alocação deste projeto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { TeamManagement };
