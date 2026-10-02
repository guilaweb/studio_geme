'use client';

import React, { useState } from 'react';
import { useTenant } from '@/contexts/tenant-context';
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  PlusCircle, 
  Settings, 
  ShieldCheck, 
  HardHat, 
  Briefcase 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export function TenantSwitcher() {
  const { 
    activeOrganization, 
    activeMembership, 
    organizations, 
    memberships, 
    switchOrganization, 
    createOrganization,
    isSuperAdmin,
    isOrgAdmin 
  } = useTenant();

  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [legalName, setLegalName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [nif, setNif] = useState('');
  const [province, setProvince] = useState('Luanda');

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor indique a razão social da empresa.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createOrganization({
        legalName: legalName.trim(),
        commercialName: commercialName.trim() || legalName.trim(),
        nif: nif.trim(),
        province: province.trim() || 'Luanda',
        currency: 'AOA',
        timezone: 'Africa/Luanda',
        language: 'pt-AO',
        status: 'active',
        plan: 'starter',
      });

      toast({
        title: 'Organização Criada',
        description: `Ambiente "${created.commercialName}" inicializado com sucesso.`,
      });

      setIsCreateOpen(false);
      setLegalName('');
      setCommercialName('');
      setNif('');
    } catch (err: any) {
      toast({
        title: 'Erro ao criar organização',
        description: err.message || 'Ocorreu um erro ao registar a organização.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super-admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'director': return 'Diretor';
      case 'project_manager': return 'Gestor de Obra';
      case 'engineer': return 'Engenheiro';
      case 'fiscal': return 'Fiscal';
      case 'supervisor': return 'Encarregado';
      case 'warehouse_clerk': return 'Fiel Armazém';
      case 'viewer': return 'Visualizador';
      default: return 'Membro';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 max-w-[210px] sm:max-w-[260px] h-10 px-2.5 rounded-lg border-primary/20 bg-background/95 hover:bg-muted transition-all select-none text-left shadow-xs"
            aria-label="Selecionar Organização Ativa"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <span className="text-xs font-semibold truncate text-foreground">
                {activeOrganization?.commercialName || activeOrganization?.legalName || 'Profundidade'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground truncate">
                  {getRoleLabel(activeMembership?.role)}
                </span>
                {activeOrganization?.plan === 'enterprise' && (
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded-xs">
                    PRO
                  </span>
                )}
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px] p-1.5 shadow-xl">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Ambientes & Organizações</span>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
              {organizations.length} {organizations.length === 1 ? 'tenant' : 'tenants'}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-[220px] overflow-y-auto space-y-0.5">
            {organizations.map((org) => {
              const isSelected = org.id === activeOrganization?.id;
              const membership = memberships.find((m) => m.organizationId === org.id);

              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs ${
                    isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-foreground font-medium">
                        {org.commercialName || org.legalName}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {getRoleLabel(membership?.role)} • {org.province || 'Angola'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium cursor-pointer text-primary focus:text-primary"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Criar Nova Organização</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/empresa"
              className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Gerir Empresa & Alvará</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Criação de Nova Organização */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="h-5 w-5 text-primary" />
              Registar Nova Empresa / Fiscalização
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie um novo ambiente operacional isolado. Cada organização possui os seus próprios projectos, equipamentos, medições e equipas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrg} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="legalName" className="text-xs font-medium">
                Razão Social da Empresa *
              </Label>
              <Input
                id="legalName"
                placeholder="Ex: Sonangol Infraestruturas, S.A."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="commercialName" className="text-xs font-medium">
                Nome Comercial (Como aparecerá no sistema)
              </Label>
              <Input
                id="commercialName"
                placeholder="Ex: Sonangol Infra"
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nif" className="text-xs font-medium">
                  NIF Angolano
                </Label>
                <Input
                  id="nif"
                  placeholder="5412345678"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="province" className="text-xs font-medium">
                  Província Sede
                </Label>
                <Input
                  id="province"
                  placeholder="Luanda, Benguela..."
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Será configurado automaticamente como <strong>Administrador</strong> desta nova organização com controlo total sobre projectos e utilizadores.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                {isSubmitting ? 'A criar...' : 'Criar Organização'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
