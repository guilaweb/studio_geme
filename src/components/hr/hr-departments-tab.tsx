'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2,
  Users,
  Plus,
  Shield,
  Loader2,
  HardHat,
  Search,
  CheckCircle2,
  FolderTree
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type HrDepartment, type HrTeam } from '@/types/hr';

interface HrDepartmentsTabProps {
  canManage: boolean;
}

export default function HrDepartmentsTab({ canManage }: HrDepartmentsTabProps) {
  const { idToken } = useAuth();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [teams, setTeams] = useState<HrTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // New Department Dialog State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  // New Team Dialog State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');
  const [teamLeaderName, setTeamLeaderName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  const fetchData = async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const [resDepts, resTeams] = await Promise.all([
        fetch('/api/hr/departments', { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch('/api/hr/teams', { headers: { Authorization: `Bearer ${idToken}` } })
      ]);

      if (resDepts.ok) {
        const d = await resDepts.json();
        setDepartments(d.departments || []);
      }
      if (resTeams.ok) {
        const t = await resTeams.json();
        setTeams(t.teams || []);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao carregar estrutura', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [idToken]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      toast({ title: 'Campos em falta', description: 'Nome e código são obrigatórios.', variant: 'destructive' });
      return;
    }

    setIsSubmittingDept(true);
    try {
      const res = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          description: deptDesc.trim(),
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar departamento.');
      }

      toast({ title: 'Departamento Criado!', description: `"${deptName}" registado com sucesso.` });
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const selDept = departments.find(d => d.id === teamDeptId);
    if (!teamName.trim() || !teamDeptId || !selDept) {
      toast({ title: 'Campos em falta', description: 'Nome e departamento são obrigatórios.', variant: 'destructive' });
      return;
    }

    setIsSubmittingTeam(true);
    try {
      const res = await fetch('/api/hr/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: teamName.trim(),
          departmentId: teamDeptId,
          departmentName: selDept.name,
          leaderName: teamLeaderName.trim() || null,
          description: teamDesc.trim(),
          memberUids: [],
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar equipa.');
      }

      toast({ title: 'Equipa Criada!', description: `"${teamName}" associada a ${selDept.name}.` });
      setIsTeamModalOpen(false);
      setTeamName('');
      setTeamDeptId('');
      setTeamLeaderName('');
      setTeamDesc('');
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE DEPARTAMENTOS */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Departamentos da Organização ({departments.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Unidades funcionais e centros de custo da estrutura empresarial
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsDeptModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Departamento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              A carregar departamentos...
            </div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Nenhum departamento configurado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div key={dept.id} className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {dept.code}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {dept.memberCount || 0} colaborador(es)
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{dept.name}</h4>
                  {dept.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{dept.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SEÇÃO DE EQUIPAS FUNCIONAIS */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Equipas & Brigadas Operacionais ({teams.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Agrupamentos de trabalho por especialidade, frente de serviço ou turno
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTeamModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Equipa
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              A carregar equipas...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma equipa registada de momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Equipa</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Líder / Encarregado</TableHead>
                    <TableHead className="text-center">Integrantes</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-semibold text-xs flex items-center gap-2">
                        <FolderTree className="h-3.5 w-3.5 text-primary shrink-0" />
                        {team.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{team.departmentName}</TableCell>
                      <TableCell className="text-xs font-medium">{team.leaderName || 'Não designado'}</TableCell>
                      <TableCell className="text-xs text-center font-bold">{team.memberCount || 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{team.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL NOVO DEPARTAMENTO */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateDepartment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" />
                Criar Novo Departamento
              </DialogTitle>
              <DialogDescription>
                Adicione uma nova unidade funcional à estrutura da empresa.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">Nome do Departamento *</Label>
                <Input
                  id="dept-name"
                  placeholder="Ex: Topografia & Geotecnia"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-code">Código / Sigla *</Label>
                <Input
                  id="dept-code"
                  placeholder="Ex: TOP"
                  maxLength={6}
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept-desc">Descrição / Atribuições</Label>
                <Textarea
                  id="dept-desc"
                  placeholder="Âmbito das atividades e responsabilidades..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsDeptModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingDept} className="gap-2">
                {isSubmittingDept && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Departamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA EQUIPA */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Criar Nova Equipa / Brigada
              </DialogTitle>
              <DialogDescription>
                Associe uma equipa de trabalho a um departamento.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Nome da Equipa *</Label>
                <Input
                  id="team-name"
                  placeholder="Ex: Brigada de Betonagem A"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-dept">Departamento *</Label>
                <Select value={teamDeptId} onValueChange={setTeamDeptId}>
                  <SelectTrigger id="team-dept">
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-leader">Líder / Encarregado da Equipa</Label>
                <Input
                  id="team-leader"
                  placeholder="Nome do responsável técnico ou mestre..."
                  value={teamLeaderName}
                  onChange={(e) => setTeamLeaderName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-desc">Descrição</Label>
                <Textarea
                  id="team-desc"
                  placeholder="Frente operacional de atuação..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsTeamModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingTeam} className="gap-2">
                {isSubmittingTeam && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Equipa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
