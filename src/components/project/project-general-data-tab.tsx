'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBrowserLocation } from '@/lib/geo-utils';
import type { Project, ProjectPriority, ProjectType, UserRole } from '@/types/project';
import { safeToDateInputValue } from '@/lib/date-utils';
import {
  FileSpreadsheet,
  Building2,
  MapPin,
  Calendar,
  Users,
  Save,
  Loader2,
  Navigation,
  Globe2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

const ANGOLA_PROVINCES = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire',
];

interface ProjectGeneralDataTabProps {
  projectId: string;
  project: Project;
  userRole?: UserRole | null;
}

export function ProjectGeneralDataTab({ projectId, project, userRole }: ProjectGeneralDataTabProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);

  // 1. Identificação
  const [code, setCode] = useState(project.code || `PRJ-${projectId.slice(0, 6).toUpperCase()}`);
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [projectType, setProjectType] = useState<ProjectType>(project.type || 'Edifício');
  const [category, setCategory] = useState(project.category || 'Obra Pública');
  const [priority, setPriority] = useState<ProjectPriority>(project.priority || 'Alta');

  // 2. Cliente
  const [clientName, setClientName] = useState(project.clientName || '');
  const [clientEmail, setClientEmail] = useState(project.clientEmail || '');
  const [clientPhone, setClientPhone] = useState(project.clientPhone || '');
  const [clientContact, setClientContact] = useState(project.clientContact || '');
  const [clientRepresentative, setClientRepresentative] = useState(project.clientRepresentative || '');

  // 3. Localização em Angola
  const [country, setCountry] = useState(project.location?.country || 'Angola');
  const [province, setProvince] = useState(project.location?.province || 'Luanda');
  const [municipality, setMunicipality] = useState(project.location?.municipality || 'Talatona');
  const [commune, setCommune] = useState(project.location?.commune || 'Benfica');
  const [address, setAddress] = useState(project.location?.address || '');
  const [latitude, setLatitude] = useState(project.location?.latitude?.toString() || '-8.8383');
  const [longitude, setLongitude] = useState(project.location?.longitude?.toString() || '13.2344');

  // 4. Datas
  const [contractStartDate, setContractStartDate] = useState(
    safeToDateInputValue(project.contractStartDate)
  );
  const [contractEndDate, setContractEndDate] = useState(
    safeToDateInputValue(project.contractEndDate)
  );
  const [actualStartDate, setActualStartDate] = useState(
    safeToDateInputValue(project.actualStartDate)
  );
  const [actualEndDate, setActualEndDate] = useState(
    safeToDateInputValue(project.actualEndDate)
  );

  // 5. Responsáveis
  const [director, setDirector] = useState(project.director || 'Eng. Manuel dos Santos');
  const [projectManager, setProjectManager] = useState(project.projectManager || 'Eng. António Carvalho');
  const [leadEngineer, setLeadEngineer] = useState(project.leadEngineer || 'Eng. Paulo Gaspar');
  const [inspector, setInspector] = useState(project.inspector || 'Fiscalização OEA');
  const [coordinator, setCoordinator] = useState(project.coordinator || 'Técnico Domingos Pedro');

  // Captura de GPS instantânea do dispositivo
  const handleCaptureGps = async () => {
    setCapturingGps(true);
    try {
      const loc = await getBrowserLocation();
      setLatitude(loc.latitude.toString());
      setLongitude(loc.longitude.toString());
      if (loc.formattedCoordinates) {
        setAddress(prev => prev ? `${prev} (${loc.formattedCoordinates})` : loc.formattedCoordinates);
      }
      toast({
        title: 'Coordenadas Capturadas!',
        description: `Lat: ${loc.latitude.toFixed(6)}, Lng: ${loc.longitude.toFixed(6)}`,
      });
    } catch (err: any) {
      toast({
        title: 'Falha no GPS',
        description: err.message || 'Verifique as permissões de localização do navegador.',
        variant: 'destructive',
      });
    } finally {
      setCapturingGps(false);
    }
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      const projectRef = doc(db, 'projects', projectId);

      const updatePayload: Partial<Project> = {
        code,
        name,
        description,
        type: projectType,
        category,
        priority,

        clientName,
        clientEmail,
        clientPhone,
        clientContact,
        clientRepresentative,

        location: {
          country,
          province,
          municipality,
          commune,
          address,
          latitude: parseFloat(latitude) || 0,
          longitude: parseFloat(longitude) || 0,
        },

        contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,

        director,
        projectManager,
        leadEngineer,
        inspector,
        coordinator,
      };

      await updateDoc(projectRef, updatePayload);

      toast({
        title: 'Dados Gerais Atualizados com Sucesso!',
        description: 'Todas as informações cadastrais e de governança foram guardadas.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar dados do projeto:', err);
      toast({
        title: 'Erro ao Salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header com Ação de Gravação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/20">
              {code}
            </Badge>
            <Badge variant="secondary" className="text-xs font-medium">
              {category}
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-headline mt-1">{name || 'Dados Gerais da Empreitada'}</h2>
          <p className="text-xs text-muted-foreground">
            Cadastro completo da obra: identificação, cliente, localização em Angola, datas contratuais e responsáveis.
          </p>
        </div>

        <Button onClick={handleSaveProject} disabled={isSaving} className="font-semibold gap-2 shadow-sm">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> A guardar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Guardar Alterações
            </>
          )}
        </Button>
      </div>

      {/* 1. Identificação da Empreitada */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> 1. Identificação da Empreitada
          </CardTitle>
          <CardDescription className="text-xs">
            Códigos, categorização, prioridade e tipologia técnica da obra.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Código do Projeto *</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="PRJ-2026-001" />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold">Nome Oficial da Empreitada *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Construção do Edifício..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Prioridade Operacional</Label>
            <Select value={priority} onValueChange={(val: ProjectPriority) => setPriority(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipologia Técnica</Label>
            <Select value={projectType} onValueChange={(val: ProjectType) => setProjectType(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Edifício">Edifício / Habitação</SelectItem>
                <SelectItem value="Residencial">Residencial / Condomínio</SelectItem>
                <SelectItem value="Estrada">Estradas & Rodovias</SelectItem>
                <SelectItem value="Infraestrutura">Infraestruturas & Pontes</SelectItem>
                <SelectItem value="Mineração">Mineração & Pedreiras</SelectItem>
                <SelectItem value="Energia">Energia & Subestações</SelectItem>
                <SelectItem value="Telecomunicações">Telecomunicações</SelectItem>
                <SelectItem value="Industrial">Industrial & Logística</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Categoria de Contrato</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Empreitada Geral / PPP" />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label className="text-xs font-semibold">Descrição do Escopo Contratual</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o escopo executivo, especificações principais e premissas..."
              className="h-10 min-h-[38px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Cliente & Fiscalização */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" /> 2. Cliente & Fiscalização
          </CardTitle>
          <CardDescription className="text-xs">
            Entidade proprietária da obra, representantes legais e gabinete de fiscalização.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome do Cliente / Dono da Obra</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ministério / Privado" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail Corporativo</Label>
            <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@entidade.ao" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
            <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+244 9..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ponto de Contacto / Cargo</Label>
            <Input value={clientContact} onChange={e => setClientContact(e.target.value)} placeholder="Diretor de Obras Públicas" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Representante Oficial do Cliente / Fiscal Designado</Label>
            <Input value={clientRepresentative} onChange={e => setClientRepresentative(e.target.value)} placeholder="Eng. Fiscal Residente..." />
          </div>
        </CardContent>
      </Card>

      {/* 3. Localização em Angola */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500" /> 3. Localização Geográfica em Angola
              </CardTitle>
              <CardDescription className="text-xs">
                Divisão político-administrativa, endereço do estaleiro e coordenadas GPS para mapa e RDO.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCaptureGps}
              disabled={capturingGps}
              className="text-xs gap-1.5 h-8"
            >
              {capturingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 text-rose-500" />}
              Capturar GPS do Dispositivo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">País</Label>
            <Input value={country} onChange={e => setCountry(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Província *</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Município</Label>
            <Input value={municipality} onChange={e => setMunicipality(e.target.value)} placeholder="Ex: Belas, Viana, Lobito..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Comuna / Bairro</Label>
            <Input value={commune} onChange={e => setCommune(e.target.value)} placeholder="Ex: Barra do Kwanza, Benfica..." />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Endereço / Referência de Acesso</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Estrada Nacional EN-230, Km 42..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Latitude GPS (WGS84)</Label>
            <Input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-8.838333" font-mono />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Longitude GPS (WGS84)</Label>
            <Input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="13.234444" font-mono />
          </div>

          {/* Atalho Mapa */}
          <div className="sm:col-span-2 lg:col-span-4 p-3 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" />
              <span>Coordenadas mapeadas: <strong>{latitude}, {longitude}</strong></span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Abrir no Google Maps &rarr;
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 4. Datas Contratuais & Prazo */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" /> 4. Datas Contratuais & Prazos
          </CardTitle>
          <CardDescription className="text-xs">
            Cronograma contratual, marcos de consignação e prazos reais de execução.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Início Previsto (Consignação)</Label>
            <Input type="date" value={contractStartDate} onChange={e => setContractStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Conclusão Prevista Contratual</Label>
            <Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Início Real de Obra</Label>
            <Input type="date" value={actualStartDate} onChange={e => setActualStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Conclusão Real (Auto de Receção)</Label>
            <Input type="date" value={actualEndDate} onChange={e => setActualEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 5. Governança & 5 Responsáveis-Chave */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-500" /> 5. Governança & Responsáveis-Chave
          </CardTitle>
          <CardDescription className="text-xs">
            Nomeação dos 5 cargos regulatórios e operacionais de liderança do projeto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Diretor de Projeto</Label>
            <Input value={director} onChange={e => setDirector(e.target.value)} placeholder="Eng. Diretor..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Gestor do Projeto (PM)</Label>
            <Input value={projectManager} onChange={e => setProjectManager(e.target.value)} placeholder="Eng. Gestor..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Engenheiro Responsável / Diretor de Obra</Label>
            <Input value={leadEngineer} onChange={e => setLeadEngineer(e.target.value)} placeholder="Eng. Responsável..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Fiscal da Obra</Label>
            <Input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="Consórcio Fiscalizador..." />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Coordenador de Campo & Segurança (HSEQ)</Label>
            <Input value={coordinator} onChange={e => setCoordinator(e.target.value)} placeholder="Coordenador de Qualidade & Segurança..." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
