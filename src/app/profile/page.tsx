'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { useFirebase } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Header } from '@/components/Header';
import { DigitalSignatureCard } from '@/components/profile/digital-signature-card';
import { 
  ANGOLA_PROVINCES, 
  ENGINEERING_ROLES, 
  type AngolaProvince, 
  type EngineeringRole, 
  type UserNotificationPreferences 
} from '@/types/user-profile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Award, 
  FileSignature, 
  Sliders, 
  Shield, 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  Save, 
  KeyRound, 
  HardHat, 
  FileText, 
  Bell, 
  Smartphone,
  PieChart,
  Activity,
  Layers,
  Sparkles,
  MapPin,
  Laptop
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, idToken } = useRequireAuth();
  const { auth } = useFirebase();
  const { toast } = useToast();

  // Estados do formulário de perfil técnico
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState<string>('Investigador Principal');
  const [company, setCompany] = useState('');
  const [professionalRegNumber, setProfessionalRegNumber] = useState('');
  const [province, setProvince] = useState<string>('Luanda');
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(null);

  // Estados de preferências operacionais
  const [defaultViewMode, setDefaultViewMode] = useState<string>('executive_cockpit');
  const [notifications, setNotifications] = useState<UserNotificationPreferences>({
    emailAlerts: true,
    evidenceTamperAlerts: true,
    caseStatusAlerts: true,
    siInferenceAlerts: true,
    reportSealingAlerts: true,
  });

  // Estados de submissão
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Inicializa dados com base no utilizador logado
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setJobTitle(user.jobTitle || 'Investigador Principal');
      setCompany(user.company || 'PROFUNDIDADE Inteligência & Investigação');
      setProfessionalRegNumber(user.professionalRegNumber || 'PER-AO-2026');
      setProvince(user.province || 'Luanda');
      setDigitalSignatureUrl(user.digitalSignatureUrl || null);
      if (user.defaultViewMode) {
        setDefaultViewMode(user.defaultViewMode);
      }
      if (user.notifications) {
        setNotifications((prev) => ({
          ...prev,
          ...user.notifications,
        }));
      }
    }
  }, [user]);

  // Função para salvar dados gerais e técnicos
  const handleSaveGeneralProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o seu nome de exibição profissional.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingGeneral(true);
    try {
      const payload = {
        displayName,
        phoneNumber,
        jobTitle,
        company,
        professionalRegNumber,
        province,
      };

      // Atualiza demo localmente se aplicável
      if (user?.uid === 'demo-user-master-id' && typeof window !== 'undefined') {
        const cached = localStorage.getItem('profundidade_demo_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem('profundidade_demo_user', JSON.stringify({ ...parsed, ...payload }));
        }
      }

      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || 'demo-token'}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar perfil.');
      }

      toast({
        title: 'Perfil Atualizado com Sucesso!',
        description: 'Os seus dados técnicos e profissionais de engenharia foram salvos.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao guardar dados',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Função para salvar a assinatura gráfica / carimbo
  const handleSaveSignature = async (signatureDataUrl: string) => {
    setDigitalSignatureUrl(signatureDataUrl);

    try {
      if (user?.uid === 'demo-user-master-id' && typeof window !== 'undefined') {
        const cached = localStorage.getItem('profundidade_demo_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem(
            'profundidade_demo_user', 
            JSON.stringify({ ...parsed, digitalSignatureUrl: signatureDataUrl })
          );
        }
      }

      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || 'demo-token'}`,
        },
        body: JSON.stringify({ digitalSignatureUrl: signatureDataUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar assinatura.');
      }

      toast({
        title: signatureDataUrl ? 'Rubrica Homologada!' : 'Rubrica Removida',
        description: signatureDataUrl 
          ? 'Sua rubrica digital foi registrada e está pronta para relatórios técnicos e autos de medição.'
          : 'A assinatura anterior foi removida.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar assinatura',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Função para salvar preferências operacionais
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const payload = {
        defaultViewMode: defaultViewMode as any,
        notifications,
      };

      if (user?.uid === 'demo-user-master-id' && typeof window !== 'undefined') {
        const cached = localStorage.getItem('profundidade_demo_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem('profundidade_demo_user', JSON.stringify({ ...parsed, ...payload }));
        }
      }

      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || 'demo-token'}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar preferências.');
      }

      toast({
        title: 'Preferências Operacionais Salvas',
        description: 'O seu modo padrão de operação e alertas foram configurados com êxito.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar preferências',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Envio de redefinição de senha
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: 'Email indisponível',
        description: 'Não foi possível identificar o email associado à sua conta.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingResetEmail(true);
    try {
      if (user.uid === 'demo-user-master-id') {
        // Simulação elegante para modo demo
        await new Promise((resolve) => setTimeout(resolve, 600));
        toast({
          title: 'Email de Redefinição Enviado (Simulado)',
          description: `Um link seguro de redefinição de palavra-passe foi simulado para ${user.email}.`,
        });
        return;
      }

      if (auth) {
        await sendPasswordResetEmail(auth, user.email);
        toast({
          title: 'Email de Redefinição Enviado!',
          description: `Verifique a sua caixa de entrada em ${user.email} para redefinir a palavra-passe.`,
        });
      } else {
        throw new Error('Serviço de autenticação temporariamente indisponível.');
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar email',
        description: err.message || 'Ocorreu um erro ao processar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'EP';
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A carregar perfil de engenharia...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/60 dark:bg-slate-950">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          
          {/* Top Banner de Perfil Técnico */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md">
                  <AvatarImage src={user.photoURL || ''} alt={displayName || 'Perfil'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {getInitials(displayName || user.displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      {displayName || user.displayName || 'Investigador Principal'}
                    </h1>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Credenciação Ativa
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      {jobTitle}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {company || 'PROFUNDIDADE Investigação'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {province}, Angola
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold border">
                      Cédula / Registo: {professionalRegNumber || 'Não informada'}
                    </span>
                    <span className="text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Badges de Sistema & Plano */}
              <div className="flex md:flex-col items-end gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                <Badge className="bg-primary text-primary-foreground text-xs uppercase tracking-wider px-2.5 py-1">
                  Plano {user.plan === 'hobby' ? 'Hobby' : 'Enterprise GCP'}
                </Badge>
                <div className="text-xs text-muted-foreground text-right">
                  Função Operacional: <span className="font-semibold text-foreground capitalize">{user.role || 'Super Admin'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Abas do Módulo de Perfil */}
          <Tabs defaultValue="dados-tecnicos" className="w-full space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <TabsTrigger value="dados-tecnicos" className="gap-2 py-2.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                <User className="h-4 w-4" />
                <span className="text-xs font-semibold">Identidade & Credenciação</span>
              </TabsTrigger>
              <TabsTrigger value="assinatura-carimbo" className="gap-2 py-2.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                <FileSignature className="h-4 w-4" />
                <span className="text-xs font-semibold">Chancela & Custódia</span>
              </TabsTrigger>
              <TabsTrigger value="preferencias" className="gap-2 py-2.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                <Sliders className="h-4 w-4" />
                <span className="text-xs font-semibold">Modo Operacional</span>
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="gap-2 py-2.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-semibold">Segurança & Acesso</span>
              </TabsTrigger>
              <TabsTrigger value="subscricao" className="gap-2 py-2.5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground col-span-2 md:col-span-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-semibold">Plano & Quotas</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS PESSOAIS E CREDENCIAÇÃO PERICIAL */}
            <TabsContent value="dados-tecnicos">
              <Card className="border shadow-sm">
                <form onSubmit={handleSaveGeneralProfile}>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Ficha Profissional de Inteligência & Perícia
                    </CardTitle>
                    <CardDescription>
                      Estes dados constarão nos termos de custódia SHA-256, relatórios investigativos e dossiês homologados no sistema.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Nome de Exibição */}
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-xs font-semibold">
                          Nome Completo / Assinatura
                        </Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ex.: Eng. Bartolomeu Manuel"
                          required
                        />
                      </div>

                      {/* Email (Read only) */}
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold flex items-center justify-between">
                          <span>Email Institucional</span>
                          <span className="text-[10px] text-muted-foreground">Autenticação</span>
                        </Label>
                        <Input
                          id="email"
                          value={user.email || ''}
                          disabled
                          className="bg-slate-50 dark:bg-slate-900 text-muted-foreground"
                        />
                      </div>

                      {/* Cargo Técnico */}
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle" className="text-xs font-semibold">
                          Função Técnica Principal
                        </Label>
                        <Select value={jobTitle} onValueChange={(val) => setJobTitle(val)}>
                          <SelectTrigger id="jobTitle">
                            <SelectValue placeholder="Selecione a sua função" />
                          </SelectTrigger>
                          <SelectContent>
                            {ENGINEERING_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Organização / Agência de Investigação */}
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-xs font-semibold">
                          Organização / Agência / Departamento
                        </Label>
                        <Input
                          id="company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Ex.: DIIP / Gabinete de Compliance / PROFUNDIDADE"
                        />
                      </div>

                      {/* Nº Cédula Pericial / Investigador */}
                      <div className="space-y-2">
                        <Label htmlFor="regNumber" className="text-xs font-semibold flex items-center justify-between">
                          <span>Nº de Registo / Cédula Pericial</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/40 text-primary">
                            Habilitação Forense
                          </Badge>
                        </Label>
                        <Input
                          id="regNumber"
                          value={professionalRegNumber}
                          onChange={(e) => setProfessionalRegNumber(e.target.value)}
                          placeholder="Ex.: PER-AO-2026/09"
                        />
                      </div>

                      {/* Província de Atuação */}
                      <div className="space-y-2">
                        <Label htmlFor="province" className="text-xs font-semibold">
                          Província de Atuação em Angola
                        </Label>
                        <Select value={province} onValueChange={(val) => setProvince(val)}>
                          <SelectTrigger id="province">
                            <SelectValue placeholder="Selecione a província" />
                          </SelectTrigger>
                          <SelectContent>
                            {ANGOLA_PROVINCES.map((prov) => (
                              <SelectItem key={prov} value={prov}>
                                {prov}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Telefone / Terminal de Campo */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="phoneNumber" className="text-xs font-semibold">
                          Telefone de Contacto (+244 Angola)
                        </Label>
                        <Input
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Ex.: +244 923 000 000"
                        />
                      </div>

                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 border-t py-4">
                    <p className="text-xs text-muted-foreground">
                      Os dados são criptografados e sincronizados com a nuvem do PROFUNDIDADE OS.
                    </p>
                    <Button type="submit" disabled={isSavingGeneral} className="gap-2">
                      {isSavingGeneral ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A guardar...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Ficha Técnica
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* ABA 2: ASSINATURA GRÁFICA & CARIMBO TÉCNICO */}
            <TabsContent value="assinatura-carimbo" className="space-y-6">
              <DigitalSignatureCard
                currentSignatureUrl={digitalSignatureUrl}
                professionalName={displayName || user.displayName || 'Investigador Principal'}
                professionalRegNumber={professionalRegNumber}
                jobTitle={jobTitle}
                company={company}
                onSaveSignature={handleSaveSignature}
              />

              <Card className="border bg-slate-50/50 dark:bg-slate-900/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Como funciona a Chancela Digital e Selagem Forense?
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    • <strong>Termo de Custódia Forense:</strong> Cada evidência registada, acedida ou versionada recebe uma chancela com a sua identidade profissional e hash SHA-256 imediato.
                  </p>
                  <p>
                    • <strong>Dossiês e Laudos Periciais:</strong> Os relatórios conclusivos de investigação são selados com a sua assinatura gráfica e carimbo de peritagem credenciada.
                  </p>
                  <p>
                    • <strong>Integridade Criptográfica:</strong> Cada PDF exportado pelo motor forense PROFUNDIDADE inclui selo de integridade criptográfica, carimbo temporal oficial (WAT UTC+1) e ledger de auditoria GCP.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: MODO OPERACIONAL E NOTIFICAÇÕES */}
            <TabsContent value="preferencias">
              <div className="space-y-6">
                
                {/* Seletor de Modo Operacional Padrão */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-primary" />
                      Modo de Arranque Padrão (Princípio da Revelação Progressiva)
                    </CardTitle>
                    <CardDescription>
                      Configure qual interface deve carregar automaticamente ao entrar no espaço de casos e investigações.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Opção: Modo Investigador de Campo */}
                      <div 
                        onClick={() => setDefaultViewMode('field_operation')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          defaultViewMode === 'field_operation' 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-amber-500" />
                            <span className="font-bold text-sm">Modo Investigador de Campo</span>
                          </div>
                          {defaultViewMode === 'field_operation' && (
                            <Badge className="bg-primary text-[10px]">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Interface simplificada estilo PWA móvel: recolha rápida de evidências no terreno, registo fotográfico imediato com cálculo SHA-256 e apontamentos periciais offline.
                        </p>
                      </div>

                      {/* Opção: Modo Analista de Inteligência */}
                      <div 
                        onClick={() => setDefaultViewMode('cost_engineer')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          defaultViewMode === 'cost_engineer' 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-blue-500" />
                            <span className="font-bold text-sm">Modo Analista de Inteligência</span>
                          </div>
                          {defaultViewMode === 'cost_engineer' && (
                            <Badge className="bg-primary text-[10px]">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Foco em exploração de grafos relacionais, análise de fluxos financeiros, timelines de ocorrências e cruzamentos de fontes abertas (OSINT).
                        </p>
                      </div>

                      {/* Opção: Modo Diretor de Investigação */}
                      <div 
                        onClick={() => setDefaultViewMode('executive_cockpit')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          defaultViewMode === 'executive_cockpit' 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            <span className="font-bold text-sm">Modo Diretor de Investigação</span>
                          </div>
                          {defaultViewMode === 'executive_cockpit' && (
                            <Badge className="bg-primary text-[10px]">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Painel executivo de comando: acompanhamento global de dossiês, métricas de apuração, alocação de peritos e despacho de relatórios selados.
                        </p>
                      </div>

                      {/* Opção: Visão Forense Completa */}
                      <div 
                        onClick={() => setDefaultViewMode('full_engineering')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          defaultViewMode === 'full_engineering' 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-purple-500" />
                            <span className="font-bold text-sm">Visão Forense Completa</span>
                          </div>
                          {defaultViewMode === 'full_engineering' && (
                            <Badge className="bg-primary text-[10px]">Ativo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Acesso integral a todas as abas: cofre de custódia SHA-256, motor de inferência SI com validação humana e trilha completa de auditoria GCP.
                        </p>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Notificações e Alertas */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      Alertas de Custódia & Notificações de Investigação
                    </CardTitle>
                    <CardDescription>
                      Defina como e quando deseja ser alertado sobre eventos críticos nos seus casos e custódia probatória.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-4 divide-y">
                      
                      <div className="flex items-center justify-between pt-3">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-sm font-semibold">Notificações por Email</Label>
                          <p className="text-xs text-muted-foreground">
                            Receba despachos, termos periciais e relatórios selados no seu email institucional.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.emailAlerts}
                          onCheckedChange={(checked) => 
                            setNotifications((prev) => ({ ...prev, emailAlerts: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-sm font-semibold">Alertas de Violação de Custódia SHA-256</Label>
                          <p className="text-xs text-muted-foreground">
                            Dispara alerta prioritário imediato caso haja qualquer tentativa de alteração de arquivo sob custódia.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.evidenceTamperAlerts ?? true}
                          onCheckedChange={(checked) => 
                            setNotifications((prev) => ({ ...prev, evidenceTamperAlerts: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-sm font-semibold">Alertas de Prazos Processuais & Diligências</Label>
                          <p className="text-xs text-muted-foreground">
                            Notificação sobre prazos críticos de inquérito, perícias agendadas e mandados pendentes.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.caseStatusAlerts ?? true}
                          onCheckedChange={(checked) => 
                            setNotifications((prev) => ({ ...prev, caseStatusAlerts: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-sm font-semibold">Hipóteses do Sistema de Inteligência (SI)</Label>
                          <p className="text-xs text-muted-foreground">
                            Notificar quando o motor analítico gerar correlações automáticas que necessitem de validação humana.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.siInferenceAlerts ?? true}
                          onCheckedChange={(checked) => 
                            setNotifications((prev) => ({ ...prev, siInferenceAlerts: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-sm font-semibold">Emissão e Selagem de Relatórios</Label>
                          <p className="text-xs text-muted-foreground">
                            Notificar quando um dossiê pericial for finalizado e assinado com selo criptográfico.
                          </p>
                        </div>
                        <Switch
                          checked={notifications.reportSealingAlerts ?? true}
                          onCheckedChange={(checked) => 
                            setNotifications((prev) => ({ ...prev, reportSealingAlerts: checked }))
                          }
                        />
                      </div>

                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-end bg-slate-50/50 dark:bg-slate-900/50 border-t py-4">
                    <Button onClick={handleSavePreferences} disabled={isSavingPreferences} className="gap-2">
                      {isSavingPreferences ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A guardar preferências...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Guardar Preferências
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

              </div>
            </TabsContent>

            {/* ABA 4: SEGURANÇA E ACESSO */}
            <TabsContent value="seguranca">
              <div className="space-y-6">
                
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Credenciais & Palavra-Passe
                    </CardTitle>
                    <CardDescription>
                      Gerencie o acesso seguro à sua conta através do protocolo criptográfico Firebase Auth.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">Redefinição de Palavra-Passe</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Enviaremos um link de redefinição com chave temporária para o email <strong>{user.email}</strong>.
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={handlePasswordReset}
                        disabled={isSendingResetEmail}
                        className="text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/5"
                      >
                        {isSendingResetEmail ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            A enviar email...
                          </>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5" />
                            Redefinir Palavra-Passe
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Metadados da Sessão e Conta */}
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      Metadados & Integridade da Conta
                    </CardTitle>
                    <CardDescription>
                      Informações técnicas de conformidade com a auditoria de estaleiro.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      
                      <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="text-muted-foreground">ID do Utilizador (UID)</div>
                        <div className="font-mono font-semibold text-foreground truncate mt-1">
                          {user.uid}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="text-muted-foreground">Papel de Governança</div>
                        <div className="font-semibold text-foreground mt-1 capitalize">
                          {user.role || 'Super Admin'} (Acesso Completo)
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="text-muted-foreground">Provedor de Autenticação</div>
                        <div className="font-semibold text-foreground mt-1">
                          Firebase Auth (Email / Password + OAuth)
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="text-muted-foreground">Segurança de Transporte</div>
                        <div className="font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          TLS 1.3 / Encriptação em Repouso
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            {/* ABA 5: SUBSCRIÇÃO E QUOTAS */}
            <TabsContent value="subscricao">
              <Card className="border shadow-sm">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Subscrição & Quotas de Engenharia
                      </CardTitle>
                      <CardDescription>
                        Acompanhe os limites operacionais de projetos ativos, armazenamento e motor de PDF.
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary text-xs uppercase px-3 py-1">
                      {user.plan === 'hobby' ? 'Plano Hobby' : 'Plano Enterprise'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-1">
                      <div className="text-xs text-muted-foreground">Casos & Dossiês Ativos</div>
                      <div className="text-2xl font-bold text-foreground">Ilimitado</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Capacidade Enterprise</div>
                    </div>

                    <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-1">
                      <div className="text-xs text-muted-foreground">Motor Forense & Selagem</div>
                      <div className="text-2xl font-bold text-foreground">SHA-256 Ledger</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Relatórios Selados & Custódia</div>
                    </div>

                    <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 space-y-1">
                      <div className="text-xs text-muted-foreground">Cofre de Evidências Digitais</div>
                      <div className="text-2xl font-bold text-foreground">Cloud Storage GCP</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Imutabilidade & Auditoria</div>
                    </div>

                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/60">
                    <div className="text-sm font-bold text-foreground mb-1">
                      PROFUNDIDADE - Sistema Operacional de Inteligência, Investigação e Evidências
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A sua licença concede infraestrutura dedicada para gestão de inquéritos, cadeia de custódia ininterrupta de provas digitais, formulação assistida de hipóteses (SI) com validação humana e geração de relatórios periciais selados em conformidade com as normas forenses.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 border-t py-4">
                  <p className="text-xs text-muted-foreground">
                    Para upgrades de frota ou suporte dedicado, fale com a nossa equipa.
                  </p>
                  <Button variant="outline" asChild className="text-xs">
                    <Link href="/ajuda">Centro de Suporte</Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

          </Tabs>

        </div>
      </main>
    </div>
  );
}
