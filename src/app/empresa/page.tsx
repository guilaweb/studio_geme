'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useRequireAuth } from '@/hooks/use-auth';
import { useTenant } from '@/contexts/tenant-context';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where,
  onSnapshot, 
  addDoc, 
  orderBy 
} from 'firebase/firestore';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Building2, 
  FileCheck2, 
  Users, 
  ShieldCheck, 
  Coins, 
  Award, 
  Briefcase, 
  PlusCircle, 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CompanyProfile, CompanyClient, CompanyContract, CredentialLevel, CompanyCategory } from '@/types/company';
import type { Project } from '@/types/project';

const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 
  'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 
  'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
];

const CREDENTIAL_LEVELS: CredentialLevel[] = [
  'Nível 1 - Básico', 'Nível 2 - Confidencial', 'Nível 3 - Secreto', 'Nível 4 - Muito Secreto', 'Perito Certificado'
];

export default function EmpresaHubPage() {
  const { user } = useRequireAuth();
  const { activeOrganization, updateActiveOrganization } = useTenant();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'perfil' | 'clientes' | 'contratos' | 'casos' | 'conformidade'>('perfil');
  const [savingProfile, setSavingProfile] = useState(false);

  const activeOrgId = activeOrganization?.id || 'org_default_profundidade';

  // Company Profile State
  const [profile, setProfile] = useState<CompanyProfile>({
    id: activeOrgId,
    organizationId: activeOrgId,
    legalName: activeOrganization?.legalName || '',
    commercialName: activeOrganization?.commercialName || '',
    nif: activeOrganization?.nif || '',
    registoComercial: activeOrganization?.registoComercial || '',
    licencaNumero: activeOrganization?.licencaNumero || '',
    credencialNivel: (activeOrganization?.credencialNivel as CredentialLevel) || 'Nível 2 - Confidencial',
    licencaValidade: activeOrganization?.licencaValidade || '',
    entidadeEmissora: activeOrganization?.entidadeEmissora || 'Ministério do Interior / Gabinete Nacional de Cibersegurança',
    categoria: (activeOrganization?.categoria as CompanyCategory) || 'Inteligência Estratégica & Investigação',
    provincia: activeOrganization?.province || 'Luanda',
    municipio: activeOrganization?.municipality || 'Luanda',
    endereco: activeOrganization?.address || '',
    telefone: activeOrganization?.phone || '',
    email: activeOrganization?.email || '',
    website: activeOrganization?.website || '',
    diretorGeral: activeOrganization?.diretorGeral || '',
    diretorOperacoes: activeOrganization?.diretorOperacoes || '',
    cedulaPericial: activeOrganization?.cedulaPericial || '',
    bancoPrincipal: activeOrganization?.bancoPrincipal || 'Banco Angolano de Investimentos (BAI)',
    ibanPrincipal: activeOrganization?.ibanPrincipal || ''
  });

  // Collections
  const [clients, setClients] = useState<CompanyClient[]>([]);
  const [contracts, setContracts] = useState<CompanyContract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New Client Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<CompanyClient>>({
    name: '',
    nif: '',
    tipoEntidade: 'Empresa Privada',
    contactoPrincipal: '',
    cargo: '',
    email: '',
    telefone: '',
    provincia: 'Luanda',
    casosAtribuidos: 1,
    valorTotalContratado: 0,
    status: 'Ativo'
  });

  // New Contract Modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [newContract, setNewContract] = useState<Partial<CompanyContract>>({
    codigoContrato: '',
    titulo: '',
    clienteId: '',
    clienteNome: '',
    tipo: 'Investigação Especial',
    valorTotal: 0,
    moeda: 'AOA',
    dataAssinatura: new Date().toISOString().split('T')[0],
    dataInicio: new Date().toISOString().split('T')[0],
    dataConclusaoPrevista: '',
    status: 'Vigente'
  });

  // 1. Fetch Company Profile for active organization
  useEffect(() => {
    if (!user || !activeOrgId) return;
    const profileRef = doc(db, 'company_profile', activeOrgId);
    getDoc(profileRef).then((snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as CompanyProfile);
      } else {
        // Inicializar a partir da organização ativa
        setProfile({
          id: activeOrgId,
          organizationId: activeOrgId,
          legalName: activeOrganization?.legalName || 'Gabinete de Inteligência e Investigação Forense, Lda',
          commercialName: activeOrganization?.commercialName || 'PROFUNDIDADE Investigação',
          nif: activeOrganization?.nif || '',
          registoComercial: activeOrganization?.registoComercial || '',
          licencaNumero: activeOrganization?.licencaNumero || '',
          credencialNivel: (activeOrganization?.credencialNivel as CredentialLevel) || 'Nível 2 - Confidencial',
          licencaValidade: activeOrganization?.licencaValidade || '',
          entidadeEmissora: activeOrganization?.entidadeEmissora || 'Ministério do Interior / Gabinete Nacional de Cibersegurança',
          categoria: (activeOrganization?.categoria as CompanyCategory) || 'Inteligência Estratégica & Investigação',
          provincia: activeOrganization?.province || 'Luanda',
          municipio: activeOrganization?.municipality || 'Luanda',
          endereco: activeOrganization?.address || '',
          telefone: activeOrganization?.phone || '',
          email: activeOrganization?.email || user.email || '',
          website: activeOrganization?.website || '',
          diretorGeral: activeOrganization?.diretorGeral || '',
          diretorOperacoes: activeOrganization?.diretorOperacoes || '',
          cedulaPericial: activeOrganization?.cedulaPericial || '',
          bancoPrincipal: activeOrganization?.bancoPrincipal || 'Banco Angolano de Investimentos (BAI)',
          ibanPrincipal: activeOrganization?.ibanPrincipal || ''
        });
      }
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching company profile:', err);
      setLoading(false);
    });
  }, [user, activeOrgId, activeOrganization]);

  // 2. Fetch Clients & Contracts & Projects scoped to activeOrgId
  useEffect(() => {
    if (!user || !activeOrgId) return;

    // Clients / Requisitioning Entities
    const qClients = query(collection(db, 'company_clients'), where('organizationId', '==', activeOrgId));
    const unsubClients = onSnapshot(qClients, (snap) => {
      const list: CompanyClient[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CompanyClient));
      setClients(list);
    }, (err) => console.warn('company_clients listen notice:', err.message));

    // Contracts
    const qContracts = query(collection(db, 'company_contracts'), where('organizationId', '==', activeOrgId));
    const unsubContracts = onSnapshot(qContracts, (snap) => {
      const list: CompanyContract[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CompanyContract));
      setContracts(list);
    }, (err) => console.warn('company_contracts listen notice:', err.message));

    // Projects / Cases
    const qProjects = query(collection(db, 'projects'), where('organizationId', '==', activeOrgId));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const list: Project[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Project));
      setProjects(list);
    }, (err) => console.warn('projects listen notice:', err.message));

    return () => {
      unsubClients();
      unsubContracts();
      unsubProjects();
    };
  }, [user, activeOrgId]);

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrgId) return;
    setSavingProfile(true);
    try {
      const profileRef = doc(db, 'company_profile', activeOrgId);
      const updated: CompanyProfile = {
        ...profile,
        id: activeOrgId,
        organizationId: activeOrgId,
        updatedAt: new Date().toISOString()
      };
      await setDoc(profileRef, updated, { merge: true });
      await updateActiveOrganization({
        legalName: updated.legalName,
        commercialName: updated.commercialName,
        nif: updated.nif,
        phone: updated.telefone,
        email: updated.email,
        address: updated.endereco,
        province: updated.provincia,
        municipality: updated.municipio,
        diretorGeral: updated.diretorGeral,
        diretorOperacoes: updated.diretorOperacoes,
        cedulaPericial: updated.cedulaPericial,
      });
      setProfile(updated);
      toast({
        title: 'Ficha da Organização Atualizada',
        description: 'Os dados institucionais e licença de segurança foram guardados com sucesso.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao guardar',
        description: err.message
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name?.trim() || !activeOrgId) return;
    try {
      await addDoc(collection(db, 'company_clients'), {
        ...newClient,
        organizationId: activeOrgId,
        createdAt: new Date().toISOString()
      });
      setIsClientModalOpen(false);
      toast({
        title: 'Cliente Registado',
        description: `${newClient.name} foi adicionado à carteira da empresa.`
      });
      setNewClient({
        name: '',
        nif: '',
        tipoEntidade: 'Empresa Privada',
        contactoPrincipal: '',
        cargo: '',
        email: '',
        telefone: '',
        provincia: 'Luanda',
        casosAtribuidos: 1,
        valorTotalContratado: 0,
        status: 'Ativo'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registar cliente',
        description: err.message
      });
    }
  };

  // Create Contract
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.codigoContrato?.trim() || !newContract.titulo?.trim() || !activeOrgId) return;
    try {
      await addDoc(collection(db, 'company_contracts'), {
        ...newContract,
        organizationId: activeOrgId,
        createdAt: new Date().toISOString()
      });
      setIsContractModalOpen(false);
      toast({
        title: 'Termo / Contrato Registado',
        description: `Contrato ${newContract.codigoContrato} guardado com sucesso.`
      });
      setNewContract({
        codigoContrato: '',
        titulo: '',
        clienteId: '',
        clienteNome: '',
        tipo: 'Investigação Especial',
        valorTotal: 0,
        moeda: 'AOA',
        dataAssinatura: new Date().toISOString().split('T')[0],
        dataInicio: new Date().toISOString().split('T')[0],
        dataConclusaoPrevista: '',
        status: 'Vigente'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registar contrato',
        description: err.message
      });
    }
  };

  // Calculated Portfolio Stats
  const totalContractedAOA = contracts.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
  const activeProjectsCount = projects.filter(p => p.status === 'Em Execução').length;

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />

      <main className="flex-1 container mx-auto px-3.5 sm:px-4 py-4 sm:py-8 max-w-7xl space-y-6 pb-28 md:pb-12">
        {/* Top Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl border shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-semibold">
                Sistema Operacional da Organização & Agência
              </Badge>
              <span className="text-xs text-muted-foreground">República de Angola • GCP Enterprise</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight text-foreground">
              {profile.commercialName || profile.legalName || 'Gestão da Organização'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Centro institucional: Credenciação de Segurança, Licença de Peritagem, NIF, Entidades Requisitantes, Termos Periciais e Conformidade Legal.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-muted flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary" />
              <span>{profile.credencialNivel || 'Nível 2 - Confidencial'} • {profile.licencaNumero || 'Licença Registada'}</span>
            </Badge>
          </div>
        </div>

        {/* 4 KPIs de Visão 360° da Organização */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="p-3.5 sm:p-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Casos Ativos</span>
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-black text-foreground">{activeProjectsCount}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {projects.length} investigações e casos no portfólio
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="p-3.5 sm:p-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Carteira Contratual</span>
                <Coins className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-black text-foreground truncate">
                {totalContractedAOA > 0 
                  ? `${(totalContractedAOA / 1_000_000).toLocaleString('pt-AO', { maximumFractionDigits: 1 })} M Kz`
                  : '0 Kz'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {contracts.length} contratos e termos periciais
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="p-3.5 sm:p-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Entidades Requisitantes</span>
                <Briefcase className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-black text-foreground">{clients.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tribunais, PGR, corporações e parceiros
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            'border-l-4',
            profile.licencaNumero ? 'border-l-emerald-500' : 'border-l-amber-500'
          )}>
            <CardHeader className="p-3.5 sm:p-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Credenciação</span>
                <ShieldCheck className={cn('h-4 w-4', profile.licencaNumero ? 'text-emerald-500' : 'text-amber-500')} />
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-0">
              <div className="text-base sm:text-lg font-black text-foreground truncate">
                {profile.licencaNumero ? 'Licença Regular' : 'Registar Licença'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Validade: {profile.licencaValidade || 'Conforme Lei'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Operação da Organização */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="perfil" className="h-10 text-xs sm:text-sm font-semibold">
              Ficha da Organização
            </TabsTrigger>
            <TabsTrigger value="clientes" className="h-10 text-xs sm:text-sm font-semibold">
              Entidades Requisitantes ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="contratos" className="h-10 text-xs sm:text-sm font-semibold">
              Contratos & Termos ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="casos" className="h-10 text-xs sm:text-sm font-semibold">
              Casos ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="conformidade" className="h-10 text-xs sm:text-sm font-semibold">
              Conformidade Forense
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FICHA DA ORGANIZAÇÃO */}
          <TabsContent value="perfil" className="space-y-4 pt-2">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-lg font-bold">Identidade Institucional da Organização de Inteligência</CardTitle>
                <CardDescription className="text-xs">
                  Dados fiscais, credenciação de segurança, licença de peritagem e habilitação legal em Angola.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Razão Social (Denominação Jurídica Completa)</Label>
                      <Input 
                        value={profile.legalName}
                        onChange={e => setProfile({...profile, legalName: e.target.value})}
                        placeholder="Ex: Gabinete de Inteligência e Perícia Forense, Lda"
                        className="h-10 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nome Operacional / Sigla</Label>
                      <Input 
                        value={profile.commercialName}
                        onChange={e => setProfile({...profile, commercialName: e.target.value})}
                        placeholder="Ex: PROFUNDIDADE Investigação & Forense"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">NIF Angolano</Label>
                      <Input 
                        value={profile.nif}
                        onChange={e => setProfile({...profile, nif: e.target.value})}
                        placeholder="Ex: 5417089123"
                        className="h-10 text-sm font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nº da Licença de Peritagem / Investigação</Label>
                      <Input 
                        value={profile.licencaNumero}
                        onChange={e => setProfile({...profile, licencaNumero: e.target.value})}
                        placeholder="Ex: LIC-2026/0988-SEC"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nível de Credenciação de Segurança</Label>
                      <Select 
                        value={profile.credencialNivel} 
                        onValueChange={(v: CredentialLevel) => setProfile({...profile, credencialNivel: v})}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CREDENTIAL_LEVELS.map(lvl => (
                            <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Validade da Licença</Label>
                      <Input 
                        type="date"
                        value={profile.licencaValidade}
                        onChange={e => setProfile({...profile, licencaValidade: e.target.value})}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Diretor de Operações e Inteligência</Label>
                      <Input 
                        value={profile.diretorOperacoes}
                        onChange={e => setProfile({...profile, diretorOperacoes: e.target.value})}
                        placeholder="Nome do Diretor Operacional"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nº Cédula Pericial / Investigador</Label>
                      <Input 
                        value={profile.cedulaPericial}
                        onChange={e => setProfile({...profile, cedulaPericial: e.target.value})}
                        placeholder="Ex: PER-2891/AO"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Província da Sede</Label>
                      <Select 
                        value={profile.provincia} 
                        onValueChange={v => setProfile({...profile, provincia: v})}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVINCIAS_ANGOLA.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Município</Label>
                      <Input 
                        value={profile.municipio}
                        onChange={e => setProfile({...profile, municipio: e.target.value})}
                        placeholder="Ex: Luanda / Talatona / Belas"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Endereço Físico</Label>
                      <Input 
                        value={profile.endereco}
                        onChange={e => setProfile({...profile, endereco: e.target.value})}
                        placeholder="Edifício, Piso, Rua..."
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Telefone Oficial</Label>
                      <Input 
                        value={profile.telefone}
                        onChange={e => setProfile({...profile, telefone: e.target.value})}
                        placeholder="+244 9..."
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">E-mail Institucional</Label>
                      <Input 
                        type="email"
                        value={profile.email}
                        onChange={e => setProfile({...profile, email: e.target.value})}
                        placeholder="direccao@profundidade.ao"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">IBAN Principal (AO06...)</Label>
                      <Input 
                        value={profile.ibanPrincipal}
                        onChange={e => setProfile({...profile, ibanPrincipal: e.target.value})}
                        placeholder="AO06 0000 0000 0000 0000 0"
                        className="h-10 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={savingProfile} className="touch-target-44 gap-2 font-bold px-6">
                      <Save className="h-4 w-4" />
                      <span>{savingProfile ? 'A guardar...' : 'Guardar Dados da Organização'}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ENTIDADES REQUISITANTES */}
          <TabsContent value="clientes" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Carteira de Entidades Requisitantes</h3>
                <p className="text-xs text-muted-foreground">Tribunais, Magistratura, órgãos de auditoria, corporações e departamentos jurídicos</p>
              </div>
              <Button onClick={() => setIsClientModalOpen(true)} className="touch-target-44 gap-1.5 text-xs font-bold">
                <PlusCircle className="h-4 w-4" />
                <span>Registar Nova Entidade</span>
              </Button>
            </div>

            {clients.length === 0 ? (
              <div className="p-8 text-center border rounded-2xl bg-card text-muted-foreground space-y-2">
                <p className="text-sm font-medium">Nenhuma entidade requisitante cadastrada.</p>
                <p className="text-xs text-muted-foreground">Registe entidades requisitantes para associar termos de perícia e casos no sistema.</p>
                <Button variant="outline" size="sm" onClick={() => setIsClientModalOpen(true)} className="mt-2 text-xs">
                  Adicionar Primeira Entidade
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border bg-card space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.tipoEntidade}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                      </div>
                      <h4 className="text-sm font-bold text-foreground pt-1">{c.name}</h4>
                      <p className="text-xs font-mono text-muted-foreground">NIF: {c.nif || 'Não informado'}</p>
                    </div>

                    <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span>{c.contactoPrincipal} ({c.cargo || 'Responsável'})</span>
                      </div>
                      {c.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{c.telefone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: CONTRATOS & TERMOS PERICIAIS */}
          <TabsContent value="contratos" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Registo de Termos Periciais e Contratos</h3>
                <p className="text-xs text-muted-foreground">Contratos celebrados, honorários periciais, garantias de sigilo e vigência</p>
              </div>
              <Button onClick={() => setIsContractModalOpen(true)} className="touch-target-44 gap-1.5 text-xs font-bold">
                <PlusCircle className="h-4 w-4" />
                <span>Registar Contrato / Termo</span>
              </Button>
            </div>

            {contracts.length === 0 ? (
              <div className="p-8 text-center border rounded-2xl bg-card text-muted-foreground space-y-2">
                <p className="text-sm font-medium">Nenhum contrato registado.</p>
                <p className="text-xs">Registe contratos de perícia ou investigação para controlar valores contratuais e termos de sigilo.</p>
                <Button variant="outline" size="sm" onClick={() => setIsContractModalOpen(true)} className="mt-2 text-xs">
                  Adicionar Primeiro Termo
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {contracts.map(ctr => (
                  <div key={ctr.id} className="p-4 rounded-xl border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{ctr.codigoContrato}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{ctr.tipo}</Badge>
                        <Badge variant="default" className="text-[10px]">{ctr.status}</Badge>
                      </div>
                      <h4 className="text-sm font-bold text-foreground pt-0.5">{ctr.titulo}</h4>
                      <p className="text-xs text-muted-foreground">Requisitante: <strong>{ctr.clienteNome}</strong></p>
                    </div>

                    <div className="flex flex-col md:items-end gap-1 shrink-0">
                      <div className="text-base font-black text-foreground">
                        {ctr.valorTotal.toLocaleString('pt-AO')} {ctr.moeda}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Início: {ctr.dataInicio} • Conclusão: {ctr.dataConclusaoPrevista || 'A definir'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: CASOS DO PORTFÓLIO */}
          <TabsContent value="casos" className="space-y-3 pt-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Casos e Investigações da Organização</h3>
              <p className="text-xs text-muted-foreground">Todos os dossiês e operações ativas, sob análise ou concluídas</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => (
                <div key={p.id} className="p-4 rounded-xl border bg-card space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{p.type || 'Investigação'}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-foreground pt-1">{p.name}</h4>
                    <p className="text-xs text-muted-foreground">{p.clientName || 'Gabinete de Investigação'}</p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">{Math.round(p.progress || 0)}% apurado</span>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs font-semibold">
                      <Link href="/investigacao">Abrir Caso</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 5: CONFORMIDADE LEGAL & FORENSE EM ANGOLA */}
          <TabsContent value="conformidade" className="space-y-4 pt-2">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base sm:text-lg font-bold">Matriz de Conformidade Legal, Normas Forenses e Custódia</CardTitle>
                <CardDescription className="text-xs">
                  Requisitos de habilitação, normas internacionais de evidências digitais (ISO/IEC 27037) e cadeia de custódia ininterrupta.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">1. Licença de Peritagem / Investigação</strong>
                      <Badge variant={profile.licencaNumero ? 'default' : 'destructive'} className="text-[10px]">
                        {profile.licencaNumero ? 'Registada' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Documento legal habilitante para instrução pericial e recolha de evidências forenses.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">2. Cédula do Perito Responsável</strong>
                      <Badge variant={profile.cedulaPericial ? 'default' : 'secondary'} className="text-[10px]">
                        {profile.cedulaPericial ? 'Registada' : 'Aguardando Cédula'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Inscrição profissional ativa perante os órgãos de peritagem e certificação forense.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">3. Regularidade Fiscal & NIF (AGT)</strong>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                        NIF Válido ({profile.nif || 'Não preenchido'})
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Certidão de não-devedor perante a Administração Geral Tributária de Angola.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">4. Cadeia de Custódia SHA-256 (ISO/IEC 27037)</strong>
                      <Badge variant="secondary" className="text-[10px] text-primary">
                        Auditável GCP
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Garantia de integridade probatória inalterada com registo temporal em ledger de auditoria.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Novo Cliente */}
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent className="max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Registar Entidade Requisitante</DialogTitle>
              <DialogDescription className="text-xs">
                Adicione uma entidade pública, tribunal, corporação ou órgão regulador à carteira da organização.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome da Entidade Requisitante *</Label>
                <Input 
                  value={newClient.name}
                  onChange={e => setNewClient({...newClient, name: e.target.value})}
                  placeholder="Ex: Tribunal Supremo / Banco Central / Sonangol..."
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">NIF Angolano</Label>
                  <Input 
                    value={newClient.nif}
                    onChange={e => setNewClient({...newClient, nif: e.target.value})}
                    placeholder="Ex: 5000..."
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo de Entidade</Label>
                  <Select 
                    value={newClient.tipoEntidade} 
                    onValueChange={(v: any) => setNewClient({...newClient, tipoEntidade: v})}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pública (Estado/Governo)">Pública (Estado / Tribunal)</SelectItem>
                      <SelectItem value="Empresa Privada">Empresa Privada</SelectItem>
                      <SelectItem value="Organismo Internacional">Organismo Internacional</SelectItem>
                      <SelectItem value="Tribunal / Ministério Público">Tribunal / Ministério Público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contacto Principal</Label>
                  <Input 
                    value={newClient.contactoPrincipal}
                    onChange={e => setNewClient({...newClient, contactoPrincipal: e.target.value})}
                    placeholder="Nome do interlocutor"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Telefone</Label>
                  <Input 
                    value={newClient.telefone}
                    onChange={e => setNewClient({...newClient, telefone: e.target.value})}
                    placeholder="+244 9..."
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsClientModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold">
                  Registar Entidade
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Novo Contrato / Termo Pericial */}
        <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
          <DialogContent className="max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Registar Contrato / Termo Pericial</DialogTitle>
              <DialogDescription className="text-xs">
                Formalize o contrato de perícia, auditoria forense ou investigação no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateContract} className="space-y-3.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Código do Termo / Contrato *</Label>
                  <Input 
                    value={newContract.codigoContrato}
                    onChange={e => setNewContract({...newContract, codigoContrato: e.target.value})}
                    placeholder="Ex: CTR-2026/001-FOR"
                    className="h-10 text-sm font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo</Label>
                  <Select 
                    value={newContract.tipo} 
                    onValueChange={(v: any) => setNewContract({...newContract, tipo: v})}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Investigação Especial">Investigação Especial</SelectItem>
                      <SelectItem value="Perícia Forense Digital">Perícia Forense Digital</SelectItem>
                      <SelectItem value="Auditoria de Fraude">Auditoria de Fraude</SelectItem>
                      <SelectItem value="Consultoria de Segurança & OSINT">Consultoria de Segurança & OSINT</SelectItem>
                      <SelectItem value="Prestação de Serviços Periciais">Prestação de Serviços Periciais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Objeto da Perícia / Investigação *</Label>
                <Input 
                  value={newContract.titulo}
                  onChange={e => setNewContract({...newContract, titulo: e.target.value})}
                  placeholder="Ex: Perícia Digital e Análise de Rastreabilidade Financeira"
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Entidade Requisitante</Label>
                  <Input 
                    value={newContract.clienteNome}
                    onChange={e => setNewContract({...newContract, clienteNome: e.target.value})}
                    placeholder="Nome da Entidade Requisitante"
                    className="h-10 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor Honorários (Kz) *</Label>
                  <Input 
                    type="number"
                    value={newContract.valorTotal || ''}
                    onChange={e => setNewContract({...newContract, valorTotal: parseFloat(e.target.value) || 0})}
                    placeholder="Valor em Kwanzas"
                    className="h-10 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Data Início</Label>
                  <Input 
                    type="date"
                    value={newContract.dataInicio}
                    onChange={e => setNewContract({...newContract, dataInicio: e.target.value})}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Conclusão Prevista</Label>
                  <Input 
                    type="date"
                    value={newContract.dataConclusaoPrevista}
                    onChange={e => setNewContract({...newContract, dataConclusaoPrevista: e.target.value})}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsContractModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="font-bold">
                  Guardar Termo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
