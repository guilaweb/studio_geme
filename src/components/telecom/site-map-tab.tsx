'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    MapPin, 
    ExternalLink, 
    Compass, 
    Navigation, 
    Search, 
    Mountain, 
    TowerControl, 
    Radio, 
    Layers, 
    Share2, 
    Copy 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { TelecomSite } from '@/types/telecom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SiteMapTabProps {
    sites: TelecomSite[];
}

// Convert decimal degrees to DMS format (Degrees Minutes Seconds)
const toDMS = (degrees: number, isLatitude: boolean) => {
    const absolute = Math.abs(degrees);
    const deg = Math.floor(absolute);
    const minutesNotTruncated = (absolute - deg) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    let direction = '';
    if (isLatitude) {
        direction = degrees >= 0 ? 'N' : 'S';
    } else {
        direction = degrees >= 0 ? 'E' : 'W';
    }

    return `${deg}°${minutes}'${seconds}"${direction}`;
};

export default function SiteMapTab({ sites }: SiteMapTabProps) {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [provinceFilter, setProvinceFilter] = useState('Todas');
    const [selectedSite, setSelectedSite] = useState<TelecomSite | null>(sites.length > 0 ? sites[0] : null);

    const filteredSites = useMemo(() => {
        return sites.filter(s => {
            const matchesSearch = searchTerm === '' ||
                s.siteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.municipality && s.municipality.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesProv = provinceFilter === 'Todas' || s.province === provinceFilter;

            return matchesSearch && matchesProv;
        });
    }, [sites, searchTerm, provinceFilter]);

    const provinces = useMemo(() => {
        return Array.from(new Set(sites.map(s => s.province))).sort();
    }, [sites]);

    const handleCopyCoordinates = (site: TelecomSite) => {
        const text = `${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}`;
        navigator.clipboard.writeText(text);
        toast({ title: 'Coordenadas copiadas!', description: text });
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <Compass className="h-5 w-5 text-primary" /> Georreferenciação & Gestão de Coordenadas de Rede
                        </CardTitle>
                        <CardDescription>
                            Localização geográfica precisa de cada site, elevação altimétrica e deep-links para sistemas SIG e navegação.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Procurar site por código, nome ou localização geográfica..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 bg-background"
                            />
                        </div>
                        <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                            <SelectTrigger className="w-[160px] h-9 bg-background">
                                <SelectValue placeholder="Província" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todas">Todas Províncias</SelectItem>
                                {provinces.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Interactive Geolocation Cards & Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sites List Panel */}
                        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                            {filteredSites.length === 0 ? (
                                <div className="text-center py-12 border rounded-lg text-muted-foreground text-xs">
                                    Nenhum site com coordenadas encontrado.
                                </div>
                            ) : (
                                filteredSites.map(site => {
                                    const isSelected = selectedSite?.id === site.id;
                                    return (
                                        <div
                                            key={site.id}
                                            onClick={() => setSelectedSite(site)}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all text-xs space-y-1.5",
                                                isSelected 
                                                    ? "bg-primary/10 border-primary shadow-sm" 
                                                    : "bg-card hover:bg-muted/40 border-border"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TowerControl className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                                                    <span className="font-mono font-bold text-foreground">{site.siteId}</span>
                                                </div>
                                                <Badge 
                                                    variant={site.status === 'Ativo' ? 'default' : 'secondary'} 
                                                    className={cn("text-[9px] py-0", site.status === 'Ativo' && "bg-emerald-600 text-white")}
                                                >
                                                    {site.status}
                                                </Badge>
                                            </div>

                                            <p className="font-semibold text-foreground truncate">{site.name}</p>
                                            
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>{site.province} {site.municipality && `• ${site.municipality}`}</span>
                                                <span className="font-mono">{site.type}</span>
                                            </div>

                                            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/50">
                                                <span>{toDMS(site.latitude, true)} {toDMS(site.longitude, false)}</span>
                                                {site.towerHeightMeters && <span>Torre: {site.towerHeightMeters}m</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Selected Site Geospatial Inspector Panel */}
                        <div className="lg:col-span-2 space-y-4">
                            {selectedSite ? (
                                <div className="border rounded-xl p-5 bg-card space-y-6 shadow-sm">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold font-mono text-primary">{selectedSite.siteId}</span>
                                                <Badge variant="outline" className="text-xs">{selectedSite.type}</Badge>
                                                <Badge 
                                                    className={cn(
                                                        "text-xs",
                                                        selectedSite.status === 'Ativo' ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                                                    )}
                                                >
                                                    {selectedSite.status}
                                                </Badge>
                                            </div>
                                            <h3 className="text-base font-semibold text-foreground mt-1">{selectedSite.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Operadora / Tenant: <strong>{selectedSite.operator || 'Partilhado'}</strong>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleCopyCoordinates(selectedSite)}
                                                className="h-8 text-xs"
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Coords
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                asChild
                                                className="h-8 text-xs shadow-sm bg-primary text-primary-foreground"
                                            >
                                                <a 
                                                    href={`https://www.google.com/maps?q=${selectedSite.latitude},${selectedSite.longitude}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                >
                                                    <Navigation className="h-3.5 w-3.5 mr-1.5" /> Abrir no Google Maps
                                                </a>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Geodetic Parameters Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div className="p-3 bg-muted/40 rounded-lg border">
                                            <span className="text-muted-foreground block text-[11px]">Latitude Decimal</span>
                                            <span className="font-mono font-bold text-sm text-foreground">{selectedSite.latitude.toFixed(6)}</span>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg border">
                                            <span className="text-muted-foreground block text-[11px]">Longitude Decimal</span>
                                            <span className="font-mono font-bold text-sm text-foreground">{selectedSite.longitude.toFixed(6)}</span>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg border">
                                            <span className="text-muted-foreground block text-[11px]">Formato DMS</span>
                                            <span className="font-mono font-bold text-xs text-foreground block truncate">
                                                {toDMS(selectedSite.latitude, true)} {toDMS(selectedSite.longitude, false)}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg border">
                                            <span className="text-muted-foreground block text-[11px]">Altitude Terreno</span>
                                            <span className="font-mono font-bold text-sm text-foreground">
                                                {selectedSite.altitudeMeters ? `${selectedSite.altitudeMeters} msnm` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Technical Specification Summary */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                <TowerControl className="h-4 w-4 text-primary" /> Infraestrutura de Suporte
                                            </span>
                                            <div className="space-y-1 text-muted-foreground">
                                                <p>Altura da Estrutura: <strong className="text-foreground">{selectedSite.towerHeightMeters ? `${selectedSite.towerHeightMeters} metros` : 'Não informada'}</strong></p>
                                                <p>Tipo de Estrutura: <strong className="text-foreground">{selectedSite.type}</strong></p>
                                                <p>Alimentação Elétrica: <strong className="text-foreground">{selectedSite.powerType || 'Rede (ENDE)'}</strong></p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-primary" /> Localização & Endereço
                                            </span>
                                            <div className="space-y-1 text-muted-foreground">
                                                <p>Província: <strong className="text-foreground">{selectedSite.province}</strong></p>
                                                <p>Município: <strong className="text-foreground">{selectedSite.municipality || 'Não especificado'}</strong></p>
                                                <p>Ponto de Referência: <strong className="text-foreground">{selectedSite.address || 'Sem endereço detalhado'}</strong></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equipments Summary in Site */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Radio className="h-3.5 w-3.5 text-primary" /> Equipamentos Instalados ({selectedSite.equipments?.length || 0})
                                            </span>
                                        </div>

                                        {!selectedSite.equipments || selectedSite.equipments.length === 0 ? (
                                            <div className="p-3 bg-muted/20 rounded border text-xs text-muted-foreground text-center">
                                                Nenhum equipamento RF/TX associado a este site. Aceda à aba de Equipamentos para cadastrar antenas e rádio.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {selectedSite.equipments.map(eq => (
                                                    <div key={eq.id} className="p-2 bg-muted/30 rounded border text-xs flex items-center justify-between">
                                                        <div>
                                                            <span className="font-semibold block">{eq.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{eq.category} {eq.frequencyBand && `• ${eq.frequencyBand}`}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px]">
                                                            {eq.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-80 border rounded-xl text-muted-foreground text-xs">
                                    Selecione um site na lista à esquerda para inspecionar os parâmetros geodésicos.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
