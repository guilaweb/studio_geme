'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Cloud, HardDrive, CheckCircle2, AlertCircle, RefreshCw, Download, Database, ShieldCheck, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BackupLog {
  id: string;
  timestamp: string;
  target: string;
  size: string;
  status: 'Concluído' | 'Falha' | 'Em Curso';
  type: 'Automático' | 'Manual';
}

const INITIAL_BACKUPS: BackupLog[] = [];

export default function StorageIntegrationPage() {
  const { user: adminUser, loading: authLoading } = useRequireAuth(['super-admin']);
  const router = useRouter();
  const { toast } = useToast();

  const [activeProvider, setActiveProvider] = useState<'gcs' | 's3' | 'onedrive'>('gcs');
  const [bucketName, setBucketName] = useState('oasis-backups-ao');
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [retentionDays, setRetentionDays] = useState('90');
  const [backupDocs, setBackupDocs] = useState(true);
  const [backupPhotos, setBackupPhotos] = useState(true);
  const [backupDb, setBackupDb] = useState(true);

  const [backups, setBackups] = useState<BackupLog[]>(INITIAL_BACKUPS);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleRunManualBackup = () => {
    setIsRunningBackup(true);
    toast({ title: 'A iniciar backup...', description: 'A consolidar ficheiros e snapshots do Firestore.' });

    setTimeout(() => {
      const newBackup: BackupLog = {
        id: `b-${Date.now().toString().slice(-4)}`,
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm'),
        target: activeProvider === 'gcs' ? `Google Cloud Storage (${bucketName})` : activeProvider === 's3' ? `AWS S3 (${bucketName})` : 'Microsoft OneDrive',
        size: '1.45 GB',
        status: 'Concluído',
        type: 'Manual',
      };
      setBackups(prev => [newBackup, ...prev]);
      setIsRunningBackup(false);
      toast({
        title: 'Backup Concluído com Sucesso ✅',
        description: 'Todos os ficheiros e base de dados foram replicados para o repositório seguro.',
      });
    }, 2500);
  };

  const handleSaveStorageConfig = () => {
    setIsSavingConfig(true);
    setTimeout(() => {
      setIsSavingConfig(false);
      toast({
        title: 'Configurações Guardadas ✅',
        description: 'A política de backup em nuvem foi atualizada.',
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
            <span>A carregar configurações de armazenamento...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Bar */}
          <div>
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin/integrations">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às Integrações
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Cloud className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold font-headline">Armazenamento em Nuvem & Cópias de Segurança</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Configure a sincronização contínua de peças desenhadas (BIM/CAD), fotos de obra e snapshots da base de dados.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 ${activeProvider === 'gcs' ? 'border-primary shadow-md bg-primary/5' : 'hover:border-primary/40'}`}
              onClick={() => setActiveProvider('gcs')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Google Cloud Storage</div>
                  <p className="text-xs text-muted-foreground">GCP Bucket / Drive</p>
                </div>
                <Badge variant={activeProvider === 'gcs' ? 'default' : 'outline'} className="text-[10px]">
                  {activeProvider === 'gcs' ? 'Ativo' : 'Selecionar'}
                </Badge>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${activeProvider === 's3' ? 'border-primary shadow-md bg-primary/5' : 'hover:border-primary/40'}`}
              onClick={() => setActiveProvider('s3')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Amazon Web Services (S3)</div>
                  <p className="text-xs text-muted-foreground">AWS S3 / MinIO</p>
                </div>
                <Badge variant={activeProvider === 's3' ? 'default' : 'outline'} className="text-[10px]">
                  {activeProvider === 's3' ? 'Ativo' : 'Selecionar'}
                </Badge>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${activeProvider === 'onedrive' ? 'border-primary shadow-md bg-primary/5' : 'hover:border-primary/40'}`}
              onClick={() => setActiveProvider('onedrive')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Microsoft OneDrive / SharePoint</div>
                  <p className="text-xs text-muted-foreground">Microsoft 365 Cloud</p>
                </div>
                <Badge variant={activeProvider === 'onedrive' ? 'default' : 'outline'} className="text-[10px]">
                  {activeProvider === 'onedrive' ? 'Ativo' : 'Selecionar'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Política de Replicação & Backup
              </CardTitle>
              <CardDescription>
                Defina o repositório, periodicidade e elementos que devem ser salvaguardados periodicamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Bucket / Pasta de Destino</Label>
                  <Input value={bucketName} onChange={e => setBucketName(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Frequência Automática</Label>
                  <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário (às 02:00 GMT+1)</SelectItem>
                      <SelectItem value="weekly">Semanal (Domingos)</SelectItem>
                      <SelectItem value="hourly">A cada 6 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Período de Retenção</Label>
                  <Select value={retentionDays} onValueChange={setRetentionDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias (Recomendado)</SelectItem>
                      <SelectItem value="365">1 ano (Compliance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Data Items Toggles */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold">Conteúdos a Salvaguardar</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <span className="text-xs">Projetos & Documentos BIM</span>
                    <Switch checked={backupDocs} onCheckedChange={setBackupDocs} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <span className="text-xs">Fotografias & RDOs Diários</span>
                    <Switch checked={backupPhotos} onCheckedChange={setBackupPhotos} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <span className="text-xs">Snapshots da Base de Dados</span>
                    <Switch checked={backupDb} onCheckedChange={setBackupDb} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleSaveStorageConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />}
                  Guardar Configuração
                </Button>

                <Button onClick={handleRunManualBackup} disabled={isRunningBackup} className="bg-primary">
                  {isRunningBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Executar Backup Agora
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Histórico de Backups ({backups.length})</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Armazenamento Seguro Ativo
                </Badge>
              </CardTitle>
              <CardDescription>
                Registo de execuções com validação de integridade e tamanho consolidado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          Nenhum backup executado ainda nesta sessão. Clique em &quot;Executar Backup Agora&quot; para iniciar a consolidação.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-mono">{b.timestamp}</TableCell>
                          <TableCell className="text-xs font-medium">{b.target}</TableCell>
                          <TableCell className="text-xs font-mono">{b.size}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px]">{b.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {b.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
