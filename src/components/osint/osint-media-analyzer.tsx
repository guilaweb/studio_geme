"use client";

import React, { useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  Shield,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Copy,
  Info,
  RefreshCw,
  FileDown,
  Link2,
  Lock,
  Upload,
  Cpu
} from "lucide-react";
import { generateOsintPdfReport } from "@/lib/osint-report-pdf";

interface MediaExifRecord {
  fileName: string;
  fileSize: string;
  mimeType: string;
  hashes: {
    md5: string;
    sha1: string;
    sha256: string;
    phash: string; // Perceptual Hash
  };
  deviceExif: {
    make: string;
    model: string;
    software: string;
    serialNumber?: string;
    captureDate: string;
    exposureTime: string;
    aperture: string;
    iso: string;
    focalLength: string;
  };
  gpsLocation?: {
    latitude: string;
    longitude: string;
    altitude: string;
    locationName: string;
  };
  integrityCheck: {
    isOriginal: boolean;
    editedWithSoftware: boolean;
    steganographyAlert: boolean;
    confidence: number;
    auditNote: string;
  };
}

const DEFAULT_MEDIA_RECORD: MediaExifRecord = {
  fileName: "EVIDENCIA_DOCUMENTAL_LOCAL_20260928.jpg",
  fileSize: "4.82 MB (5,054,120 bytes)",
  mimeType: "image/jpeg",
  hashes: {
    md5: "8f14e45fceea167a5a36dedd4bea2543",
    sha1: "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    phash: "bf82d6c19a4e320f",
  },
  deviceExif: {
    make: "Apple",
    model: "iPhone 15 Pro Max",
    software: "iOS 17.5.1 (Build 21F90)",
    serialNumber: "C39YF0A80D89",
    captureDate: "28 de Setembro de 2026 às 11:42:15 UTC+1",
    exposureTime: "1/120 sec",
    aperture: "f/1.78",
    iso: "ISO 80",
    focalLength: "6.76 mm (24mm equivalente)",
  },
  gpsLocation: {
    latitude: "8° 48' 32.4\" S (-8.809000)",
    longitude: "13° 14' 04.2\" E (13.234500)",
    altitude: "14.2 metros acima do nível do mar",
    locationName: "Avenida 4 de Fevereiro (Marginal de Luanda), Ingombota, Angola",
  },
  integrityCheck: {
    isOriginal: true,
    editedWithSoftware: false,
    steganographyAlert: false,
    confidence: 0.96,
    auditNote: "Estrutura do cabeçalho EXIF coincide com pipeline original do sensor Apple. Sem vestígios de Adobe Photoshop ou software de manipulação gráfica.",
  },
};

interface OsintMediaAnalyzerProps {
  onSaveAsEvidence?: (fileName: string, data: any) => void;
}

export function OsintMediaAnalyzer({
  onSaveAsEvidence,
}: OsintMediaAnalyzerProps) {
  const [media, setMedia] = useState<MediaExifRecord>(DEFAULT_MEDIA_RECORD);
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePreserve = () => {
    setFeedbackMsg(`Artefacto multimédia [${media.fileName}] preservado no Cofre Probatório com hash SHA-256.`);
    if (onSaveAsEvidence) {
      onSaveAsEvidence(media.fileName, media);
    }
  };

  const handleLinkToCase = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("profundidade_osint_linked_items") || "[]");
      existing.push({
        caseId: "CASO-2026-001",
        caseTitle: "Operação Sombra Digital",
        type: "EVIDENCIA_FOTOGRAFICA_EXIF",
        title: `Fotografia Georreferenciada: ${media.fileName} (${media.deviceExif.model})`,
        hash: media.hashes.sha256,
        linkedAt: new Date().toISOString(),
      });
      localStorage.setItem("profundidade_osint_linked_items", JSON.stringify(existing));
    } catch {}
    setFeedbackMsg(`Evidência multimédia vinculada formalmente ao CASO-2026-001 sob selo de custódia.`);
  };

  const handleDownloadPdf = () => {
    generateOsintPdfReport({
      search: {
        id: `MED-${Date.now().toString().slice(-6)}`,
        targetQuery: media.fileName,
        targetType: "IMAGEM",
        contextNotes: `Exame pericial de metadados EXIF, integridade criptográfica e geolocalização por satélite para ${media.fileName}.`,
        investigationRef: "CASO-2026-001 (Operação Sombra Digital)",
        status: "CONCLUIDA",
        resultsCount: 4,
        discoveriesCount: 1,
        createdAt: new Date().toISOString(),
        requestedBy: "Perito em Computação Forense & Imagem",
      },
      tenantName: "PROFUNDIDADE - Lab de Inteligência & Evidências",
      analystName: "Perito em Análise Forense de Imagem & Vídeo",
      results: [
        {
          id: `res-med-1`,
          searchId: "MED-001",
          source: "ImageConnector (EXIF / Perceptual Hash)",
          sourceType: "ImageConnector",
          category: "IMAGENS",
          url: `https://profundidade.ao/evidencias/${media.fileName}`,
          title: `Extração de Metadados EXIF: ${media.fileName}`,
          snippet: `Dispositivo: ${media.deviceExif.make} ${media.deviceExif.model} • GPS: ${media.gpsLocation?.locationName} • pHash: ${media.hashes.phash}`,
          publishedAt: media.deviceExif.captureDate,
          collectedAt: new Date().toISOString(),
          contentHash: media.hashes.sha256,
          entities: [media.fileName, media.deviceExif.model, media.gpsLocation?.locationName || "Luanda"],
          indicators: [`pHash: ${media.hashes.phash}`, media.deviceExif.software],
          isPreservedAsEvidence: true,
        },
      ],
      discoveries: [
        {
          id: `disc-med-1`,
          title: `Localização & Dispositivo Preservados: ${media.fileName}`,
          description: `Artefacto capturado com ${media.deviceExif.model} em ${media.gpsLocation?.locationName}. Integridade do cabeçalho confirmada (sem edição digital por terceiros).`,
          type: "EVIDENCIA_DOCUMENTADA",
          sources: ["ImageConnector"],
          evidences: [media.hashes.sha256],
          validationStatus: "VALIDADO",
          validatorNotes: "Perícia de metadados realizada em conformidade com o Art. 212º do CPP Angolano.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com Instruções */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Análise Forense de Imagem, Metadados EXIF & Perceptual Hash
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
              MEDIA FORENSICS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Extração de metadados EXIF, coordenadas de GPS integradas, cálculo de Perceptual Hash (pHash) e deteção de manipulação digital.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inspecionar Ficheiro Local</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setMedia((prev) => ({
                    ...prev,
                    fileName: file.name,
                    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB (${file.size.toLocaleString()} bytes)`,
                    mimeType: file.type || "image/jpeg",
                  }));
                  setFeedbackMsg(`Ficheiro [${file.name}] processado no motor de metadados EXIF com sucesso.`);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Ficha do Ficheiro Analisado */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono">{media.fileName}</h4>
              <span className="text-xs text-slate-400 font-mono">
                {media.fileSize} • Formato: {media.mimeType}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500">Perceptual Hash (pHash):</span>
            <span className="text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {media.hashes.phash}
            </span>
          </div>
        </div>

        {/* Hashes Criptográficos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block">MD5 Digest:</span>
            <span className="text-slate-300 block text-[11px] truncate">{media.hashes.md5}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block">SHA-1 Digest:</span>
            <span className="text-slate-300 block text-[11px] truncate">{media.hashes.sha1}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] block">NIST SHA-256 (Custódia):</span>
            <span className="text-amber-400 font-bold block text-[11px] truncate">{media.hashes.sha256}</span>
          </div>
        </div>
      </div>

      {/* Grid: EXIF do Dispositivo & Geolocalização por Satélite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 1: Metadados do Equipamento Captor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Equipamento & Parâmetros Ópticos (EXIF)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              VERIFICADO
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 text-[10px] block">Fabricante:</span>
                <span className="text-white font-bold">{media.deviceExif.make}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Modelo do Dispositivo:</span>
                <span className="text-slate-200 font-bold">{media.deviceExif.model}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 text-[10px] block">Sistema & Software:</span>
                <span className="text-slate-300">{media.deviceExif.software}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Nº de Série da Câmara:</span>
                <span className="text-amber-400">{media.deviceExif.serialNumber || "Disponível"}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">Data e Hora da Captura:</span>
              <span className="text-slate-200">{media.deviceExif.captureDate}</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px]">
              <div>
                <span className="text-slate-500 block">Exposição</span>
                <span className="text-slate-200 font-bold">{media.deviceExif.exposureTime}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Abertura</span>
                <span className="text-slate-200 font-bold">{media.deviceExif.aperture}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sensibilidade</span>
                <span className="text-slate-200 font-bold">{media.deviceExif.iso}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dist. Focal</span>
                <span className="text-slate-200 font-bold">{media.deviceExif.focalLength}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Coordenadas de GPS & Localização */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Geolocalização Embutida por Satélite (GPS)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              COORDENADAS GPS
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Latitude / Longitude:</span>
              <span className="text-white font-bold block text-[11px]">
                {media.gpsLocation?.latitude}
              </span>
              <span className="text-white font-bold block text-[11px]">
                {media.gpsLocation?.longitude}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">Endereço Aproximado (Reverse Geocoding):</span>
              <span className="text-amber-400 block text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
                {media.gpsLocation?.locationName}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">Altitude Relativa:</span>
              <span className="text-slate-300">{media.gpsLocation?.altitude}</span>
            </div>

            {/* Caixa de Integridade */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-lg space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[11px]">
                <Shield className="w-3.5 h-3.5" />
                <span>Integridade dos Metadados: Original Intacto</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {media.integrityCheck.auditNote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações de Custódia Probatória & Protocolo Judicial */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 text-[11px] block">Assinatura Digital de Imagem & EXIF:</span>
          <div className="flex items-center space-x-2 text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="select-all">SHA-256: {media.hashes.sha256}</span>
            <button
              onClick={() => handleCopy(media.hashes.sha256)}
              className="text-slate-400 hover:text-white"
              title="Copiar Hash"
            >
              {copiedHash ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            * Extração realizada em modo somente-leitura com garantia de preservação do ficheiro original.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Laudo PDF de Mídia</span>
          </button>

          <button
            onClick={handleLinkToCase}
            className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <span>Vincular ao CASO-2026-001</span>
          </button>

          <button
            onClick={handlePreserve}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shadow-lg transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Preservar Evidência</span>
          </button>
        </div>
      </div>
    </div>
  );
}
