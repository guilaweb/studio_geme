"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  MessageSquare,
  Phone,
  MapPin,
  Image as ImageIcon,
  Search,
  Shield,
  Lock,
  FileText,
  CheckCircle,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  Clock,
  Database,
  Radio,
  HardDrive,
  Trash2,
  UserCheck,
  Layers,
  Share2,
  Info,
  ArrowRight,
  Filter,
  CheckSquare,
  FileCheck,
  Sparkles,
  ChevronRight,
  Globe,
  Building2,
  Compass
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";

// Tipos para Perícia Móvel
interface SeizedDevice {
  id: string;
  caseNumber: string;
  model: string;
  osVersion: string;
  serialNumber: string;
  imei: string;
  extractionType: "EXTRAÇÃO FÍSICA (FULL BIT-BY-BIT)" | "SISTEMA DE FICHEIROS AVANÇADO" | "LÓGICA / UFDR" | "CHIPSET EDL / BOOTLOADER";
  status: "CONCLUÍDO COM SUCESSO" | "EM PROCESSAMENTO" | "AGUARDANDO VALIDAÇÃO";
  sha256Hash: string;
  warrantRef: string;
  seizureDate: string;
  forensicAnalyst: string;
  messagesCount: number;
  callsCount: number;
  photosCount: number;
  locationsCount: number;
  deletedArtifactsCount: number;
}

interface ForensicMessage {
  id: string;
  app: "WhatsApp" | "Telegram" | "Signal" | "SMS";
  sender: string;
  receiver: string;
  text: string;
  timestamp: string;
  isDeleted: boolean; // Recuperado de área não alocada / SQLite WAL
  hasAttachment?: boolean;
  attachmentType?: "audio" | "image" | "document";
  attachmentName?: string;
  recoveryNote?: string;
}

interface ForensicCall {
  id: string;
  contactName: string;
  phoneNumber: string;
  callType: "RECEBIDA" | "EFETUADA" | "PERDIDA" | "REJEITADA";
  duration: string;
  timestamp: string;
  cellTowerBts: string;
}

interface ForensicPhoto {
  id: string;
  fileName: string;
  cameraModel: string;
  captureDate: string;
  gpsCoordinates: string;
  locationName: string;
  sha256: string;
  category: "DOCUMENTO" | "INFRAESTRUTURA" | "VEÍCULO" | "PESSOAL";
  thumbColor: string;
}

interface TimelineEvent {
  id: string;
  time: string;
  type: "CALL" | "MESSAGE" | "PHOTO" | "GPS" | "DELETED_RECOVERY";
  title: string;
  description: string;
  sourceApp: string;
  isAlert?: boolean;
}

const SAMPLE_DEVICES: SeizedDevice[] = [
  {
    id: "DEV-2026-001",
    caseNumber: "CASO-2026-001 (Operação Sombra Digital)",
    model: "Apple iPhone 15 Pro Max (A3106)",
    osVersion: "iOS 17.5.1 (21F90)",
    serialNumber: "H9D71X902L",
    imei: "359123450912384",
    extractionType: "SISTEMA DE FICHEIROS AVANÇADO",
    status: "CONCLUÍDO COM SUCESSO",
    sha256Hash: "8f9b4c12d5e3f890123456789abcdef0123456789abcdef0123456789abcdef0",
    warrantRef: "Mandado Judicial nº 42/2026 - SIC / PGR Luanda",
    seizureDate: "2026-09-28 09:30 UTC+1",
    forensicAnalyst: "Capitão Silva (Perito Digital)",
    messagesCount: 14892,
    callsCount: 684,
    photosCount: 2340,
    locationsCount: 3120,
    deletedArtifactsCount: 342,
  },
  {
    id: "DEV-2026-002",
    caseNumber: "CASO-2026-001 (Operação Sombra Digital)",
    model: "Samsung Galaxy S24 Ultra (SM-S928B)",
    osVersion: "Android 14 (One UI 6.1)",
    serialNumber: "R5CW10982AA",
    imei: "869102938475610",
    extractionType: "EXTRAÇÃO FÍSICA (FULL BIT-BY-BIT)",
    status: "CONCLUÍDO COM SUCESSO",
    sha256Hash: "3a7e59b1884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    warrantRef: "Mandado Judicial nº 42/2026 - SIC / PGR Luanda",
    seizureDate: "2026-09-28 10:15 UTC+1",
    forensicAnalyst: "Capitão Silva (Perito Digital)",
    messagesCount: 9410,
    callsCount: 420,
    photosCount: 1520,
    locationsCount: 1890,
    deletedArtifactsCount: 188,
  },
  {
    id: "DEV-2026-003",
    caseNumber: "CASO-2026-002 (Infiltração Ciber)",
    model: "Xiaomi 13 Pro (2210132G)",
    osVersion: "MIUI 14 / Android 13",
    serialNumber: "XM982012481",
    imei: "864901029384712",
    extractionType: "LÓGICA / UFDR",
    status: "CONCLUÍDO COM SUCESSO",
    sha256Hash: "6c2049ba9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15",
    warrantRef: "Auto de Apreensão Forense nº 18/2026",
    seizureDate: "2026-09-29 14:00 UTC+1",
    forensicAnalyst: "Tenente Manuel (Eng. Forense)",
    messagesCount: 5210,
    callsCount: 198,
    photosCount: 680,
    locationsCount: 940,
    deletedArtifactsCount: 94,
  }
];

const SAMPLE_MESSAGES: ForensicMessage[] = [
  {
    id: "msg-001",
    app: "WhatsApp",
    sender: "Alvo (+244 923 100 200)",
    receiver: "Contacto Offshore (+41 79 123 4567)",
    text: "Confirma a recepção da primeira tranche via Banco BAI para a conta em Genebra?",
    timestamp: "2026-09-26 14:23:10 UTC+1",
    isDeleted: false,
  },
  {
    id: "msg-002",
    app: "WhatsApp",
    sender: "Contacto Offshore (+41 79 123 4567)",
    receiver: "Alvo (+244 923 100 200)",
    text: "Recebido com sucesso. Os 250.000 USD já foram alocados na estrutura fiduciária.",
    timestamp: "2026-09-26 14:25:02 UTC+1",
    isDeleted: false,
  },
  {
    id: "msg-003",
    app: "WhatsApp",
    sender: "Alvo (+244 923 100 200)",
    receiver: "Contacto Offshore (+41 79 123 4567)",
    text: "[ATENÇÃO: APAGA ESTE REGISTO] O contrato assinado está no anexo. Não deixes rasto no servidor local.",
    timestamp: "2026-09-26 14:28:44 UTC+1",
    isDeleted: true,
    hasAttachment: true,
    attachmentType: "document",
    attachmentName: "contrato_offshore_vortex_assinado.pdf",
    recoveryNote: "Recuperado de fragmento SQLite WAL (ChatStorage.sqlite - Bloco 4912)",
  },
  {
    id: "msg-004",
    app: "Signal",
    sender: "Alvo (+244 923 100 200)",
    receiver: "Operador C2 (Identidade Oculta)",
    text: "O acesso perimetral está aberto. Usa a VPN com a chave SSH temporária que mandei ontem.",
    timestamp: "2026-09-27 01:14:55 UTC+1",
    isDeleted: true,
    recoveryNote: "Recuperado via dump físico do SQLite na tabela message_records (Área livre não substituída)",
  },
  {
    id: "msg-005",
    app: "Telegram",
    sender: "@shadow_broker_angola",
    receiver: "Alvo (+244 923 100 200)",
    text: "Encontro confirmado na Ilha de Luanda, Restaurante Tamariz, às 20h. Traz a drive USB segura.",
    timestamp: "2026-09-27 16:45:20 UTC+1",
    isDeleted: false,
  },
  {
    id: "msg-006",
    app: "WhatsApp",
    sender: "Alvo (+244 923 100 200)",
    receiver: "Operador C2 (Identidade Oculta)",
    text: "Áudio explicativo das rotas de fuga financeira.",
    timestamp: "2026-09-27 18:02:11 UTC+1",
    isDeleted: false,
    hasAttachment: true,
    attachmentType: "audio",
    attachmentName: "PTT-20260927-WA0084.opus (Duração: 01:42)",
  }
];

const SAMPLE_CALLS: ForensicCall[] = [
  {
    id: "call-001",
    contactName: "Contacto Offshore Suíça",
    phoneNumber: "+41 79 123 4567",
    callType: "EFETUADA",
    duration: "14 min 32 seg",
    timestamp: "2026-09-26 14:05:00 UTC+1",
    cellTowerBts: "BTS-LUANDA-TALATONA-04 (Sector 2)",
  },
  {
    id: "call-002",
    contactName: "Número Não Identificado",
    phoneNumber: "+244 933 999 888",
    callType: "RECEBIDA",
    duration: "03 min 12 seg",
    timestamp: "2026-09-26 18:20:15 UTC+1",
    cellTowerBts: "BTS-LUANDA-ILHA-02 (Sector 1)",
  },
  {
    id: "call-003",
    contactName: "Bancário BFA Corporativo",
    phoneNumber: "+244 222 000 111",
    callType: "RECEBIDA",
    duration: "08 min 45 seg",
    timestamp: "2026-09-27 10:11:30 UTC+1",
    cellTowerBts: "BTS-LUANDA-COQUEIROS-01 (Sector 3)",
  },
  {
    id: "call-004",
    contactName: "Alvo Secundário",
    phoneNumber: "+244 924 888 777",
    callType: "PERDIDA",
    duration: "0 seg",
    timestamp: "2026-09-27 22:50:00 UTC+1",
    cellTowerBts: "BTS-LUANDA-TALATONA-04 (Sector 1)",
  }
];

const SAMPLE_PHOTOS: ForensicPhoto[] = [
  {
    id: "photo-001",
    fileName: "IMG_20260926_114205.HEIC",
    cameraModel: "Apple iPhone 15 Pro Max (24mm, f/1.78, ISO 50)",
    captureDate: "2026-09-26 11:42:05 UTC+1",
    gpsCoordinates: "-8.838333, 13.234444 (Altitude: 14m)",
    locationName: "Luanda, Talatona - Condomínio Palm Springs",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    category: "DOCUMENTO",
    thumbColor: "from-amber-950 to-slate-900",
  },
  {
    id: "photo-002",
    fileName: "IMG_20260927_195512.JPG",
    cameraModel: "Apple iPhone 15 Pro Max (120mm, f/2.8, ISO 400)",
    captureDate: "2026-09-27 19:55:12 UTC+1",
    gpsCoordinates: "-8.775833, 13.243611 (Altitude: 2m)",
    locationName: "Luanda, Ilha do Cabo - Frente ao Restaurante Tamariz",
    sha256: "4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef01",
    category: "VEÍCULO",
    thumbColor: "from-blue-950 to-slate-900",
  },
  {
    id: "photo-003",
    fileName: "IMG_20260927_201530.JPG",
    cameraModel: "Apple iPhone 15 Pro Max (48mm, f/1.78, ISO 800)",
    captureDate: "2026-09-27 20:15:30 UTC+1",
    gpsCoordinates: "-8.775900, 13.243550 (Altitude: 3m)",
    locationName: "Luanda, Ilha do Cabo - Interior de Instalação",
    sha256: "9f8e7d6c5b4a3210fedcba9876543210fedcba9876543210fedcba98765432",
    category: "INFRAESTRUTURA",
    thumbColor: "from-purple-950 to-slate-900",
  }
];

const SAMPLE_TIMELINE: TimelineEvent[] = [
  {
    id: "time-1",
    time: "26 Set 2026, 11:42",
    type: "PHOTO",
    title: "Fotografia com Metadados GPS em Talatona",
    description: "Captura de fotografia de minuta contratual com coordenadas GPS gravadas pelo sensor EXIF do iPhone.",
    sourceApp: "Câmara Nativa / Apple Photos",
  },
  {
    id: "time-2",
    time: "26 Set 2026, 14:05",
    type: "CALL",
    title: "Chamada Telefónica para Suíça (+41 79 123 4567)",
    description: "Chamada de voz encriptada com duração de 14m32s vinculada à torre celular BTS-LUANDA-TALATONA-04.",
    sourceApp: "Dialer Celular / Antena GSM",
  },
  {
    id: "time-3",
    time: "26 Set 2026, 14:28",
    type: "DELETED_RECOVERY",
    title: "MENSAGEM WHATSAPP APAGADA RECUPERADA (SQLite WAL)",
    description: "Instrução expressa para apagar rastros e envio de contrato offshore em PDF. Recuperada da memória SQLite.",
    sourceApp: "WhatsApp / ChatStorage.sqlite",
    isAlert: true,
  },
  {
    id: "time-4",
    time: "27 Set 2026, 01:14",
    type: "DELETED_RECOVERY",
    title: "MENSAGEM SIGNAL APAGADA RECUPERADA",
    description: "Entrega de credenciais temporárias de VPN para infiltração de perímetro corporativo.",
    sourceApp: "Signal Messenger / DB",
    isAlert: true,
  },
  {
    id: "time-5",
    time: "27 Set 2026, 19:55",
    type: "GPS",
    title: "Deslocação para Ilha de Luanda (GPS Waypoint)",
    description: "Dispositivo fixa posição no Restaurante Tamariz após 45 minutos de trajecto pela Avenida 4 de Fevereiro.",
    sourceApp: "CoreLocation / Wi-Fi Geocache",
  }
];

export default function PericiaMovelPage() {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<SeizedDevice>(SAMPLE_DEVICES[0]);
  const [activeTab, setActiveTab] = useState<
    "dispositivos" | "mensagens" | "chamadas" | "galeria" | "timeline" | "recuperados" | "laudo"
  >("dispositivos");

  const [messageSearch, setMessageSearch] = useState("");
  const [onlyDeletedFilter, setOnlyDeletedFilter] = useState(false);
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [ingestionFileName, setIngestionFileName] = useState("");
  const [ingestionCaseRef, setIngestionCaseRef] = useState("CASO-2026-001");
  const [ingestionType, setIngestionType] = useState("UFDR");
  const [ingestionSuccess, setIngestionSuccess] = useState<string | null>(null);

  // Ingestão simulada
  const handleIngestFile = (e: React.FormEvent) => {
    e.preventDefault();
    setIngestionSuccess(`Extração [${ingestionFileName || "UFDR_EXTRACAO_CELLEBRITE.ufdr"}] ingerida com sucesso! Hash SHA-256 gerado e 3.420 artefactos normalizados.`);
    setShowIngestionModal(false);
  };

  const filteredMessages = SAMPLE_MESSAGES.filter((msg) => {
    const matchesSearch =
      msg.text.toLowerCase().includes(messageSearch.toLowerCase()) ||
      msg.sender.toLowerCase().includes(messageSearch.toLowerCase()) ||
      msg.receiver.toLowerCase().includes(messageSearch.toLowerCase());
    const matchesDeleted = onlyDeletedFilter ? msg.isDeleted : true;
    return matchesSearch && matchesDeleted;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      {/* Top Banner / Breadcrumb & Status */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 sticky top-16 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">LABORATÓRIO DE PERÍCIA MÓVEL</h1>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  UFED / UFDR PARSER
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  CADEIA SHA-256
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Processamento pericial autorizado de smartphones, extração de SQLite WAL, timelines e evidências probatórias.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Seletor de Dispositivo Activo */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <select
                value={selectedDevice.id}
                onChange={(e) => {
                  const d = SAMPLE_DEVICES.find((x) => x.id === e.target.value);
                  if (d) setSelectedDevice(d);
                }}
                className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
              >
                {SAMPLE_DEVICES.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                    {d.model} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowIngestionModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingerir Extração (UFDR/DD)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Sucesso de Ingestão */}
      {ingestionSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{ingestionSuccess}</span>
            </div>
            <button onClick={() => setIngestionSuccess(null)} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Device Quick Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="text-amber-400 font-bold">{selectedDevice.id}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{selectedDevice.caseNumber}</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                {selectedDevice.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{selectedDevice.model}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 font-mono">
              <span>OS: <strong className="text-slate-200">{selectedDevice.osVersion}</strong></span>
              <span>IMEI: <strong className="text-slate-200">{selectedDevice.imei}</strong></span>
              <span>Serial: <strong className="text-slate-200">{selectedDevice.serialNumber}</strong></span>
              <span>Método: <strong className="text-amber-400">{selectedDevice.extractionType}</strong></span>
            </div>
          </div>

          <div className="flex flex-col items-end text-xs text-slate-400 space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
            <span className="font-mono text-[10px] text-slate-500">Hash de Custódia Probatória:</span>
            <span className="font-mono text-[11px] text-amber-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all">
              SHA-256: {selectedDevice.sha256Hash.slice(0, 24)}...
            </span>
            <span className="text-[10px] text-slate-500">{selectedDevice.warrantRef}</span>
          </div>
        </div>

        {/* Forensic Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Mensagens</span>
            <span className="text-xl font-bold text-white">{selectedDevice.messagesCount.toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 block mt-0.5 font-mono">+{selectedDevice.deletedArtifactsCount} recuperadas</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Chamadas</span>
            <span className="text-xl font-bold text-white">{selectedDevice.callsCount.toLocaleString()}</span>
            <span className="text-[10px] text-sky-400 block mt-0.5 font-mono">Com Cell Tower BTS</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Mídia & Fotos</span>
            <span className="text-xl font-bold text-white">{selectedDevice.photosCount.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5 font-mono">Com Metadados EXIF</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Coordenadas GPS</span>
            <span className="text-xl font-bold text-white">{selectedDevice.locationsCount.toLocaleString()}</span>
            <span className="text-[10px] text-purple-400 block mt-0.5 font-mono">Waypoints de Rota</span>
          </div>

          <div className="bg-slate-900/90 border border-rose-500/30 bg-rose-500/5 rounded-xl p-3 text-center">
            <span className="text-[10px] text-rose-300 uppercase tracking-wider block mb-1">Dados Eliminados</span>
            <span className="text-xl font-bold text-rose-400">{selectedDevice.deletedArtifactsCount}</span>
            <span className="text-[10px] text-rose-400/80 block mt-0.5 font-mono">SQLite WAL Recovery</span>
          </div>
        </div>

        {/* Forensic Navigation Tabs */}
        <div className="flex space-x-1 border-b border-slate-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("dispositivos")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "dispositivos"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Dispositivos & Extrações ({SAMPLE_DEVICES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("mensagens")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "mensagens"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Inspector (WhatsApp/Telegram/Signal)</span>
          </button>

          <button
            onClick={() => setActiveTab("chamadas")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "chamadas"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Chamadas & Torres BTS</span>
          </button>

          <button
            onClick={() => setActiveTab("galeria")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "galeria"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Galeria com Metadados EXIF/GPS</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "timeline"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Linha do Tempo Forense</span>
          </button>

          <button
            onClick={() => setActiveTab("recuperados")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "recuperados"
                ? "bg-rose-950/60 text-rose-300 border-t-2 border-rose-500"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Dados Eliminados & SQLite WAL</span>
          </button>

          <button
            onClick={() => setActiveTab("laudo")}
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center space-x-2 transition-colors shrink-0 ${
              activeTab === "laudo"
                ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Laudo Pericial Oficial</span>
          </button>
        </div>

        {/* TAB 1: DISPOSITIVOS */}
        {activeTab === "dispositivos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Dispositivos Apreendidos Sob Custódia</h3>
                <p className="text-xs text-slate-400">Registo formal de equipamentos móveis e extrações efetuadas.</p>
              </div>
              <button
                onClick={() => setShowIngestionModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nova Ingestão Forense</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_DEVICES.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev)}
                  className={`bg-slate-900 border rounded-xl p-5 cursor-pointer transition-all space-y-4 ${
                    selectedDevice.id === dev.id
                      ? "border-amber-500 ring-1 ring-amber-500/50 shadow-xl"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{dev.id}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      {dev.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">{dev.model}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{dev.osVersion}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 font-mono pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">IMEI:</span>
                      <span>{dev.imei}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Tipo de Extração:</span>
                      <span className="text-amber-400">{dev.extractionType}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Mensagens / Mídia:</span>
                      <span>{dev.messagesCount.toLocaleString()} / {dev.photosCount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{dev.seizureDate}</span>
                    <span className="text-amber-400 font-semibold flex items-center space-x-1">
                      <span>Examinar Artefactos</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CHAT INSPECTOR (MENSAGENS) */}
        {activeTab === "mensagens" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Chat Inspector & Mensagens Extraídas</h3>
                <p className="text-xs text-slate-400">Conversações reconstituídas do WhatsApp, Telegram, Signal e SMS.</p>
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyDeletedFilter}
                    onChange={(e) => setOnlyDeletedFilter(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span>Apenas Dados Eliminados (WAL)</span>
                </label>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="Pesquisar mensagens ou alvos..."
                    className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`bg-slate-900 border rounded-xl p-4 space-y-2 transition-all ${
                    msg.isDeleted
                      ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          msg.app === "WhatsApp"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : msg.app === "Telegram"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : msg.app === "Signal"
                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {msg.app}
                      </span>
                      <span className="text-xs font-semibold text-white">{msg.sender}</span>
                      <span className="text-xs text-slate-500">──▶</span>
                      <span className="text-xs font-semibold text-slate-300">{msg.receiver}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {msg.isDeleted && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-bold font-mono flex items-center space-x-1">
                          <Trash2 className="w-3 h-3 inline" />
                          <span>RECUPERADO EM SQLITE WAL</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                    {msg.text}
                  </p>

                  {msg.hasAttachment && (
                    <div className="p-2 bg-slate-950 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs font-mono text-amber-400">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Anexo Forense: {msg.attachmentName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Preservado sob SHA-256</span>
                    </div>
                  )}

                  {msg.recoveryNote && (
                    <div className="text-[11px] text-rose-300/80 font-mono flex items-center space-x-1.5 pt-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.recoveryNote}</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredMessages.length === 0 && (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-xs">
                  Nenhuma mensagem encontrada com os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHAMADAS & BTS */}
        {activeTab === "chamadas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Registo de Chamadas & Triangulação Celular</h3>
                <p className="text-xs text-slate-400">Histórico de chamadas telefónicas com identificação de antenas BTS.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{SAMPLE_CALLS.length} chamadas processadas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Contacto / Número</th>
                    <th className="p-3">Direção</th>
                    <th className="p-3">Duração</th>
                    <th className="p-3">Antena de Conexão (BTS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {SAMPLE_CALLS.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400">{call.timestamp}</td>
                      <td className="p-3 text-white font-semibold">
                        {call.contactName}
                        <span className="block text-[11px] text-slate-500">{call.phoneNumber}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            call.callType === "RECEBIDA"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : call.callType === "EFETUADA"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {call.callType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{call.duration}</td>
                      <td className="p-3 text-amber-400 text-[11px]">{call.cellTowerBts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: GALERIA FORENSE & EXIF */}
        {activeTab === "galeria" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Galeria de Mídia & Metadados EXIF / GPS</h3>
                <p className="text-xs text-slate-400">Fotografias recuperadas com parâmetros ópticos e geolocalização do sensor.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{SAMPLE_PHOTOS.length} itens georreferenciados</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_PHOTOS.map((photo) => (
                <div key={photo.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3">
                  <div className={`h-40 bg-gradient-to-br ${photo.thumbColor} flex flex-col items-center justify-center p-4 relative`}>
                    <ImageIcon className="w-10 h-10 text-amber-400/80 mb-2" />
                    <span className="text-xs font-mono text-white font-bold">{photo.fileName}</span>
                    <span className="text-[10px] bg-slate-950/80 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded mt-1 font-mono">
                      {photo.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Câmara:</span>
                        <span className="text-slate-200">{photo.cameraModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Carimbo Original:</span>
                        <span className="text-slate-200">{photo.captureDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">GPS:</span>
                        <span className="text-amber-400">{photo.gpsCoordinates}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Localização Estimada:</span>
                        <span className="text-emerald-400 text-right">{photo.locationName}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 font-mono text-[10px] text-slate-500 truncate">
                      SHA-256: {photo.sha256}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TIMELINE FORENSE */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Linha do Tempo Cronológica Unificada</h3>
                <p className="text-xs text-slate-400">Reconstituição minuto a minuto correlacionando chamadas, mensagens e GPS.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">5 eventos críticos mapeados</span>
            </div>

            <div className="relative border-l border-slate-800 ml-4 space-y-6 py-2">
              {SAMPLE_TIMELINE.map((event) => (
                <div key={event.id} className="relative pl-6">
                  {/* Dot indicador */}
                  <div
                    className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 ${
                      event.isAlert
                        ? "bg-rose-500 border-rose-300 animate-pulse"
                        : "bg-amber-500 border-slate-950"
                    }`}
                  ></div>

                  <div
                    className={`bg-slate-900 border rounded-xl p-4 space-y-1.5 ${
                      event.isAlert
                        ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{event.time}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {event.sourceApp}
                        </span>
                      </div>
                      {event.isAlert && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold font-mono">
                          ARTEFACTO RECUPERADO
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DADOS ELIMINADOS (SQLITE WAL RECOVERY) */}
        {activeTab === "recuperados" && (
          <div className="space-y-4">
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-5 space-y-2">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Módulo de Recuperação de Dados Eliminados</h3>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                O analisador forense examinou as áreas não alocadas (Unallocated Blocks) e os ficheiros de write-ahead log (WAL) das bases de dados SQLite (WhatsApp, Signal, Telegram e SMS). Foram recuperados com sucesso registos que o utilizador do dispositivo havia apagado deliberadamente.
              </p>
            </div>

            <div className="space-y-3">
              {SAMPLE_MESSAGES.filter((m) => m.isDeleted).map((msg) => (
                <div key={msg.id} className="bg-slate-900 border border-rose-500/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-bold font-mono">
                        {msg.app} (DELETADO PELO ALVO)
                      </span>
                      <span className="text-xs font-bold text-white">{msg.sender}</span>
                      <span className="text-xs text-slate-500">──▶</span>
                      <span className="text-xs font-bold text-slate-300">{msg.receiver}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{msg.timestamp}</span>
                  </div>

                  <p className="text-xs font-mono text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {msg.text}
                  </p>

                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300 flex items-center justify-between">
                    <span>Mecanismo Forense: {msg.recoveryNote}</span>
                    <span className="text-[10px] font-bold text-amber-400">PROVA VÁLIDA PARA INQUÉRITO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: LAUDO PERICIAL OFICIAL */}
        {activeTab === "laudo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Laudo Pericial Oficial de Computação Forense</h3>
                <p className="text-xs text-slate-400">Documento formal assinado e selado criptograficamente para apresentação judicial.</p>
              </div>
              <button
                onClick={() => alert("Laudo Pericial consolidado e preparado para exportação oficial com selo SHA-256.")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Dossiê em PDF</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 font-mono text-xs text-slate-300 leading-relaxed shadow-2xl">
              <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-white font-sans">REPÚBLICA DE ANGOLA</h4>
                  <p className="text-xs text-slate-400">LABORATÓRIO CENTRAL DE PERÍCIA E INTELIGÊNCIA DIGITAL</p>
                  <p className="text-[11px] text-amber-400 mt-1">LAUDO PERICIAL FORENSE Nº 084/2026</p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p>Processo nº: <strong>PGR/LUANDA/42/2026</strong></p>
                  <p>Data do Laudo: <strong>03 de Outubro de 2026</strong></p>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-white uppercase mb-1">1. Objeto do Exame</h5>
                <p>
                  Dispositivo smartphone {selectedDevice.model}, com número de série {selectedDevice.serialNumber} e IMEI {selectedDevice.imei}, apreendido nos autos do {selectedDevice.warrantRef}.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-white uppercase mb-1">2. Metodologia & Cadeia de Custódia</h5>
                <p>
                  O dispositivo foi submetido ao processo de extração avançada com isolamento RF (gaiola de Faraday). A integridade matemática dos dados foi verificada imediatamente através do cálculo de algoritmo criptográfico:
                </p>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded my-2 text-amber-400 font-bold select-all">
                  SHA-256: {selectedDevice.sha256Hash}
                </div>
              </div>

              <div>
                <h5 className="font-bold text-white uppercase mb-1">3. Síntese dos Artefactos Relevantes</h5>
                <ul className="list-disc list-inside space-y-1 text-slate-200">
                  <li>Foram processadas {selectedDevice.messagesCount.toLocaleString()} mensagens e recuperados {selectedDevice.deletedArtifactsCount} registos eliminados das bases SQLite WAL.</li>
                  <li>Identificadas comunicações expressas sobre transferências bancárias internacionais não declaradas.</li>
                  <li>Metadados EXIF de fotografias posicionam o alvo no local e hora das reuniões acordadas.</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <div>
                  <span className="text-slate-500 block">Perito Responsável:</span>
                  <span className="text-white font-bold">{selectedDevice.forensicAnalyst}</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold block">✓ SELADO CRIPTOGRAFICAMENTE</span>
                  <span className="text-slate-500">Conforme Art. 212º do Código de Processo Penal Angolano</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: INGESTÃO DE EXTRAÇÃO FORENSE */}
      {showIngestionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Ingerir Pacote de Extração Forense</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Carregue pacotes de extração gerados por estações periciais (Cellebrite UFED, UFDR, Magnet AXIOM, RAW/DD, TAR ou JSON normalizado).
            </p>

            <form onSubmit={handleIngestFile} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dossiê / Caso de Vinculação</label>
                <input
                  type="text"
                  required
                  value={ingestionCaseRef}
                  onChange={(e) => setIngestionCaseRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Formato do Pacote</label>
                <select
                  value={ingestionType}
                  onChange={(e) => setIngestionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="UFDR">Cellebrite UFDR Report (.ufdr)</option>
                  <option value="FULL_FS">Arquivo de Sistema de Ficheiros (.tar / .zip)</option>
                  <option value="RAW_DD">Imagem Física Bit-a-Bit (.dd / .raw / .bin)</option>
                  <option value="SQLITE_DUMP">Dump de Bases de Dados SQLite (.db / .sqlite)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ficheiro de Extração</label>
                <input
                  type="file"
                  onChange={(e) => setIngestionFileName(e.target.files ? e.target.files[0].name : "")}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-amber-500 file:text-slate-950 file:font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIngestionModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs"
                >
                  Iniciar Indexação Forense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
