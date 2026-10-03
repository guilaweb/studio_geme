"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  MapPin,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Layers,
  Info,
  Calendar,
  Clock,
  Phone,
  Camera,
  MessageSquare,
  Shield,
  Eye,
  Maximize2
} from "lucide-react";

export interface BtsStation {
  id: string;
  code: string;
  name: string;
  operator: string;
  lat: number;
  lng: number;
  sector: number;
  azimuthDeg: number;
  beamwidthDeg: number;
  coverageKm: number;
  lac: string;
  cid: string;
  signalDbm: number;
  x: number; // Coordenada de tela (SVG)
  y: number;
}

export interface GeorefWaypoint {
  id: string;
  time: string;
  type: "PHOTO" | "CALL" | "MESSAGE" | "GPS_FIX";
  title: string;
  detail: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  btsCode?: string;
}

const BTS_STATIONS: BtsStation[] = [
  {
    id: "bts-1",
    code: "BTS-LUANDA-TALATONA-04",
    name: "Talatona Sector Sul • Parque Empresarial",
    operator: "UNITEL ANGOLA (631-02)",
    lat: -8.838333,
    lng: 13.234444,
    sector: 2,
    azimuthDeg: 130,
    beamwidthDeg: 65,
    coverageKm: 2.4,
    lac: "4021",
    cid: "09104",
    signalDbm: -68,
    x: 220,
    y: 420,
  },
  {
    id: "bts-2",
    code: "BTS-LUANDA-COQUEIROS-01",
    name: "Ingombota • Av. 4 de Fevereiro / Marginal",
    operator: "UNITEL ANGOLA (631-02)",
    lat: -8.815000,
    lng: 13.230000,
    sector: 3,
    azimuthDeg: 240,
    beamwidthDeg: 70,
    coverageKm: 1.8,
    lac: "4018",
    cid: "08812",
    signalDbm: -74,
    x: 420,
    y: 260,
  },
  {
    id: "bts-3",
    code: "BTS-LUANDA-ILHA-02",
    name: "Ilha do Cabo • Sector Tamariz / Baía",
    operator: "UNITEL ANGOLA (631-02)",
    lat: -8.775833,
    lng: 13.243611,
    sector: 1,
    azimuthDeg: 25,
    beamwidthDeg: 60,
    coverageKm: 2.1,
    lac: "4010",
    cid: "07201",
    signalDbm: -62,
    x: 620,
    y: 110,
  },
];

const WAYPOINTS: GeorefWaypoint[] = [
  {
    id: "wp-1",
    time: "26 Set 11:42",
    type: "PHOTO",
    title: "Foto EXIF: Minuta Contratual",
    detail: "Condomínio Palm Springs, Talatona (-8.838333, 13.234444)",
    lat: -8.838333,
    lng: 13.234444,
    x: 215,
    y: 430,
    btsCode: "BTS-LUANDA-TALATONA-04",
  },
  {
    id: "wp-2",
    time: "26 Set 14:05",
    type: "CALL",
    title: "Chamada Telefónica para Suíça (+41 79...)",
    detail: "Duração: 14m32s • Conectado a BTS Talatona Sector 2",
    lat: -8.837500,
    lng: 13.235100,
    x: 235,
    y: 410,
    btsCode: "BTS-LUANDA-TALATONA-04",
  },
  {
    id: "wp-3",
    time: "26 Set 14:28",
    type: "MESSAGE",
    title: "WhatsApp WAL: Envio Contrato Offshore",
    detail: "Fragmento recuperado da base de dados • IP móvel ativo",
    lat: -8.836000,
    lng: 13.236000,
    x: 250,
    y: 390,
    btsCode: "BTS-LUANDA-TALATONA-04",
  },
  {
    id: "wp-4",
    time: "27 Set 10:11",
    type: "CALL",
    title: "Chamada Recebida: BFA Corporativo",
    detail: "Conectado a BTS Coqueiros Sector 3 • Deslocação centro Luanda",
    lat: -8.815000,
    lng: 13.230000,
    x: 415,
    y: 265,
    btsCode: "BTS-LUANDA-COQUEIROS-01",
  },
  {
    id: "wp-5",
    time: "27 Set 19:55",
    type: "PHOTO",
    title: "Foto EXIF: Veículo dos Intervenientes",
    detail: "Restaurante Tamariz, Ilha de Luanda (-8.775833, 13.243611)",
    lat: -8.775833,
    lng: 13.243611,
    x: 615,
    y: 115,
    btsCode: "BTS-LUANDA-ILHA-02",
  },
  {
    id: "wp-6",
    time: "27 Set 20:15",
    type: "PHOTO",
    title: "Foto EXIF: Reunião / Instalação Portuária",
    detail: "Interior de Instalação, Ilha do Cabo (-8.775900, 13.243550)",
    lat: -8.775900,
    lng: 13.243550,
    x: 630,
    y: 100,
    btsCode: "BTS-LUANDA-ILHA-02",
  },
];

interface BtsTriangulationMapProps {
  onSelectWaypoint?: (wp: GeorefWaypoint) => void;
  onSelectBts?: (bts: BtsStation) => void;
}

export function BtsTriangulationMap({ onSelectWaypoint, onSelectBts }: BtsTriangulationMapProps) {
  const [currentStep, setCurrentStep] = useState<number>(WAYPOINTS.length - 1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSectors, setShowSectors] = useState<boolean>(true);
  const [showCoverageCones, setShowCoverageCones] = useState<boolean>(true);
  const [selectedBts, setSelectedBts] = useState<BtsStation | null>(BTS_STATIONS[0]);
  const [selectedWp, setSelectedWp] = useState<GeorefWaypoint | null>(WAYPOINTS[0]);

  // Autoplay da reconstituição
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= WAYPOINTS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activeWaypoint = WAYPOINTS[currentStep];

  const handleBtsClick = (bts: BtsStation) => {
    setSelectedBts(bts);
    if (onSelectBts) onSelectBts(bts);
  };

  const handleWaypointClick = (wp: GeorefWaypoint, idx: number) => {
    setCurrentStep(idx);
    setSelectedWp(wp);
    if (onSelectWaypoint) onSelectWaypoint(wp);
  };

  // Trajetória até o passo atual
  const pathD = WAYPOINTS.slice(0, currentStep + 1)
    .map((wp, idx) => `${idx === 0 ? "M" : "L"} ${wp.x} ${wp.y}`)
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Header Cartográfico com Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Cartografia Forense & Triangulação de Antenas (BTS)
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
              LUANDA GIS • MCC 631
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Geolocalização das torres rádio-base de conexão celular sobrepostas aos registos EXIF GPS de fotografias extraídas.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCoverageCones(!showCoverageCones)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              showCoverageCones
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            {showCoverageCones ? "Cones de Rádio: ON" : "Cones de Rádio: OFF"}
          </button>

          <button
            onClick={() => {
              if (currentStep >= WAYPOINTS.length - 1) setCurrentStep(0);
              setIsPlaying(!isPlaying);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simular Trajetória</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Principal: Mapa SVG Interativo + Painel Telemetria HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Painel do Mapa Interativo (2 Colunas) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden shadow-2xl min-h-[460px] flex flex-col justify-between">
          {/* Fundo de Grade Cartográfica & Coordenadas */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]"></div>

          {/* Bússola e Coordenadas de Referência */}
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur">
            <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span className="text-[11px] font-mono text-slate-200">Luanda, Angola (WGS 84)</span>
          </div>

          <div className="absolute top-4 right-4 z-20 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur text-[11px] font-mono text-amber-400">
            Escala: 1 : 25.000
          </div>

          {/* SVG Map Canvas */}
          <svg viewBox="0 0 800 500" className="w-full h-[460px] z-10">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
              </linearGradient>

              {/* Padrão de setor de rádio */}
              <radialGradient id="sectorGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Linhas de contorno da costa / Baía de Luanda estilizada */}
            <path
              d="M 120 480 Q 280 380 400 300 T 560 160 T 700 80"
              fill="none"
              stroke="#1e293b"
              strokeWidth="38"
              strokeLinecap="round"
              opacity="0.4"
            />
            <text x="680" y="60" fill="#334155" fontSize="11" fontFamily="monospace" fontWeight="bold">
              OCÉANO ATLÂNTICO / BAÍA DE LUANDA
            </text>
            <text x="140" y="460" fill="#334155" fontSize="10" fontFamily="monospace">
              ZONA SUL: TALATONA
            </text>
            <text x="560" y="140" fill="#334155" fontSize="10" fontFamily="monospace">
              ZONA NORTE: ILHA DO CABO
            </text>

            {/* Cones de Cobertura Azimute das Torres Celulares */}
            {showCoverageCones &&
              BTS_STATIONS.map((bts) => {
                // Cálculo de cone de setor
                const radius = bts.coverageKm * 40;
                const rad = (bts.azimuthDeg - 90) * (Math.PI / 180);
                const halfBeam = (bts.beamwidthDeg / 2) * (Math.PI / 180);
                const x1 = bts.x + radius * Math.cos(rad - halfBeam);
                const y1 = bts.y + radius * Math.sin(rad - halfBeam);
                const x2 = bts.x + radius * Math.cos(rad + halfBeam);
                const y2 = bts.y + radius * Math.sin(rad + halfBeam);

                const conePath = `M ${bts.x} ${bts.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

                return (
                  <g key={`cone-${bts.id}`}>
                    <path
                      d={conePath}
                      fill="url(#sectorGlow)"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      opacity="0.6"
                    />
                    <circle cx={bts.x} cy={bts.y} r={radius} fill="none" stroke="#334155" strokeWidth="0.8" opacity="0.3" />
                  </g>
                );
              })}

            {/* Trajetória Forense Vetorial Reconstituída */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
              />
            )}

            {/* Torres Celulares BTS */}
            {BTS_STATIONS.map((bts) => (
              <g
                key={bts.id}
                onClick={() => handleBtsClick(bts)}
                className="cursor-pointer group"
                transform={`translate(${bts.x}, ${bts.y})`}
              >
                <circle
                  r="18"
                  fill="#0f172a"
                  stroke={selectedBts?.id === bts.id ? "#f59e0b" : "#475569"}
                  strokeWidth="2"
                  className="transition-all group-hover:scale-110"
                />
                <circle r="6" fill="#f59e0b" className="animate-pulse" />
                <path d="M -6 -12 L 0 -18 L 6 -12" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text
                  x="22"
                  y="4"
                  fill="#f8fafc"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="drop-shadow"
                >
                  {bts.code}
                </text>
                <text x="22" y="15" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                  {bts.operator} • Sector {bts.sector} ({bts.azimuthDeg}°)
                </text>
              </g>
            ))}

            {/* Waypoints Georreferenciados ao Longo da Trajetória */}
            {WAYPOINTS.slice(0, currentStep + 1).map((wp, idx) => {
              const isSelected = activeWaypoint.id === wp.id;
              return (
                <g
                  key={wp.id}
                  onClick={() => handleWaypointClick(wp, idx)}
                  className="cursor-pointer group"
                  transform={`translate(${wp.x}, ${wp.y})`}
                >
                  <circle
                    r={isSelected ? "14" : "9"}
                    fill={isSelected ? "#10b981" : "#f59e0b"}
                    stroke="#020617"
                    strokeWidth="2.5"
                    className="transition-all"
                  />
                  {isSelected && (
                    <circle
                      r="22"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      className="animate-ping opacity-75"
                    />
                  )}
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#020617"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {idx + 1}
                  </text>
                  {/* Tooltip inline */}
                  <text
                    x="0"
                    y="-15"
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="drop-shadow"
                  >
                    {wp.time}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Barra Inferior com Slider de Reconstituição Temporal */}
          <div className="z-20 bg-slate-900/95 border-t border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                Passo {currentStep + 1} de {WAYPOINTS.length}: <strong>{activeWaypoint.time}</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-1/2">
              <input
                type="range"
                min="0"
                max={WAYPOINTS.length - 1}
                value={currentStep}
                onChange={(e) => {
                  setCurrentStep(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="text-right">
              <span className="text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-emerald-400 font-bold">
                {activeWaypoint.type}
              </span>
            </div>
          </div>
        </div>

        {/* HUD Lateral de Telemetria Forense & Detalhes da BTS (1 Coluna) */}
        <div className="space-y-4">
          {/* Card: Ponto Ativo da Trajetória */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Waypoint de Movimentação
                </h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                PASSO #{currentStep + 1}
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Título do Evento:</span>
                <span className="text-white font-bold">{activeWaypoint.title}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Detalhe / Metadados:</span>
                <span className="text-slate-300 text-[11px] leading-relaxed">{activeWaypoint.detail}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Latitude:</span>
                  <span className="text-amber-400">{activeWaypoint.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Longitude:</span>
                  <span className="text-amber-400">{activeWaypoint.lng.toFixed(6)}</span>
                </div>
              </div>
              {activeWaypoint.btsCode && (
                <div className="p-2 bg-slate-950 border border-slate-800 rounded text-[11px] flex justify-between items-center text-slate-300">
                  <span>Antena Vinculada:</span>
                  <span className="text-amber-400 font-bold">{activeWaypoint.btsCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Telemetria da BTS Selecionada */}
          {selectedBts && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Telemetria da Antena (BTS)
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {selectedBts.signalDbm} dBm
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Identificador Celular (CGI):</span>
                  <span className="text-white font-bold">{selectedBts.code}</span>
                  <span className="text-[10px] text-slate-400 block">{selectedBts.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Operadora:</span>
                    <span className="text-slate-300">{selectedBts.operator}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Raio Estimado:</span>
                    <span className="text-slate-300">{selectedBts.coverageKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">LAC (Area Code):</span>
                    <span className="text-slate-300">{selectedBts.lac}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CID (Cell ID):</span>
                    <span className="text-slate-300">{selectedBts.cid}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Azimute / Sector:</span>
                    <span className="text-amber-400">Sector {selectedBts.sector} ({selectedBts.azimuthDeg}°)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Abertura do Feixe:</span>
                    <span className="text-amber-400">{selectedBts.beamwidthDeg}°</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400">
                  <p className="leading-tight">
                    * Triangulação baseada no cálculo de avanço temporal (Timing Advance) e nível de sinal recebido (RSSI/RSRP).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
