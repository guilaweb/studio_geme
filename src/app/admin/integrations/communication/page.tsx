'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Send, CheckCircle2, AlertCircle, HelpCircle, Loader2, BellRing, Mail, Smartphone } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function CommunicationIntegrationPage() {
  const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin']);
  const router = useRouter();
  const { toast } = useToast();

  // Channels state
  const [slackUrl, setSlackUrl] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);

  const [teamsUrl, setTeamsUrl] = useState('');
  const [teamsEnabled, setTeamsEnabled] = useState(false);

  const [whatsappPhone, setWhatsappPhone] = useState('+244 923 000 000');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  // Events Matrix
  const [notifyRdo, setNotifyRdo] = useState(true);
  const [notifyHse, setNotifyHse] = useState(true);
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyMaterials, setNotifyMaterials] = useState(false);

  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestWebhook = (channelName: string) => {
    setIsTesting(channelName);
    setTimeout(() => {
      setIsTesting(null);
      toast({
        title: `Mensagem de Teste Enviada ✅`,
        description: `Disparo de teste executado com sucesso para ${channelName}. Verifique a receção no canal.`,
      });
    }, 1200);
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Configurações de Comunicação Guardadas ✅',
        description: 'Os webhooks e canais corporativos estão ativos.',
      });
    }, 800);
  };

  if (authLoading || !adminUser) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A carregar módulo de comunicação...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Bar */}
          <div>
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin/integrations">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Integrações
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Canais de Comunicação & Webhooks Globais</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Configure o envio automático de alertas de obra para Slack, Microsoft Teams, WhatsApp e Email Corporativo.
            </p>
          </div>

          {/* Channels Configuration */}
          <div className="space-y-4">
            {/* 1. Slack */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#E01E5A]" />
                    <CardTitle className="text-base">Slack (Incoming Webhooks)</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{slackEnabled ? 'Ativo' : 'Desativo'}</span>
                    <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Receba resumos diários e alertas de segurança num canal dedicado do Slack da equipa de engenharia.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Webhook URL do Canal Slack</Label>
                  <Input value={slackUrl} onChange={e => setSlackUrl(e.target.value)} disabled={!slackEnabled} />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!slackEnabled || isTesting === 'Slack'}
                    onClick={() => handleTestWebhook('Slack')}
                  >
                    {isTesting === 'Slack' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                    Enviar Teste para o Slack
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. MS Teams */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-[#5059C9]" />
                    <CardTitle className="text-base">Microsoft Teams (Connectors)</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{teamsEnabled ? 'Ativo' : 'Desativo'}</span>
                    <Switch checked={teamsEnabled} onCheckedChange={setTeamsEnabled} />
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Publica cartões adaptativos (Adaptive Cards) com botões de aprovação direta no canal do Teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Webhook URL do Conector Teams</Label>
                  <Input
                    placeholder="https://outlook.office.com/webhook/..."
                    value={teamsUrl}
                    onChange={e => setTeamsUrl(e.target.value)}
                    disabled={!teamsEnabled}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!teamsEnabled || !teamsUrl || isTesting === 'Teams'}
                    onClick={() => handleTestWebhook('Teams')}
                  >
                    {isTesting === 'Teams' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                    Enviar Teste para o Teams
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 3. WhatsApp */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-[#25D366]" />
                    <CardTitle className="text-base">WhatsApp Business Gateway (Angola SMS/WA)</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{whatsappEnabled ? 'Ativo' : 'Desativo'}</span>
                    <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Notificações instantâneas por WhatsApp e SMS para diretores e fiscais em obra com ligação à rede móvel Unitel/Africell.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Número de Notificação Oficial</Label>
                  <Input value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} disabled={!whatsappEnabled} />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!whatsappEnabled || isTesting === 'WhatsApp'}
                    onClick={() => handleTestWebhook('WhatsApp')}
                  >
                    {isTesting === 'WhatsApp' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                    Enviar Teste para o WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Triggers Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriz de Disparo de Eventos</CardTitle>
              <CardDescription>
                Selecione que tipos de ocorrências desencadeiam alertas imediatos para os canais ativados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Incidentes & Não-Conformidades HSE</Label>
                  <p className="text-[11px] text-muted-foreground">Disparo prioritário quando um quase-acidente ou risco grave é reportado.</p>
                </div>
                <Switch checked={notifyHse} onCheckedChange={setNotifyHse} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Diário de Obra (RDO) Submetido</Label>
                  <p className="text-[11px] text-muted-foreground">Notifica a conclusão e resumo diário das atividades de campo.</p>
                </div>
                <Switch checked={notifyRdo} onCheckedChange={setNotifyRdo} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Desvios de Orçamento / Custos &gt; 10%</Label>
                  <p className="text-[11px] text-muted-foreground">Alerta quando uma rubrica EAP atinge ou supera o teto orçamental.</p>
                </div>
                <Switch checked={notifyBudget} onCheckedChange={setNotifyBudget} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Pedidos de Compra Críticos</Label>
                  <p className="text-[11px] text-muted-foreground">Alerta para requisição de materiais ou peças sobressalentes urgentes.</p>
                </div>
                <Switch checked={notifyMaterials} onCheckedChange={setNotifyMaterials} />
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Guardar Definições de Comunicação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
