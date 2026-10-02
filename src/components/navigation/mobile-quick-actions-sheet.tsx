'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  BookOpen, 
  AlertTriangle, 
  Ruler, 
  UserCheck, 
  Briefcase, 
  Plus, 
  X, 
  Loader2, 
  MapPin, 
  Check, 
  Sparkles 
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { compressImageForMobile } from '@/lib/image-compressor';
import { saveOfflineDraft } from '@/lib/offline-drafts';
import { getBrowserLocation, type GeoLocationResult } from '@/lib/geo-utils';

interface MobileQuickActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileQuickActionsSheet({ open, onOpenChange }: MobileQuickActionsSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Sub-modal state for direct mobile photo capture
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Photo capture state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoCategory, setPhotoCategory] = useState<'Avanço Físico' | 'Qualidade' | 'Segurança HSEQ' | 'Geral'>('Avanço Físico');
  const [isUploading, setIsUploading] = useState(false);
  const [geoState, setGeoState] = useState<GeoLocationResult | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user projects for association
  useEffect(() => {
    if (!open || !user) return;
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(collection(db, 'projects'));
        const projs = snap.docs.map(d => ({ id: d.id, name: d.data().name || 'Obra' }));
        setProjects(projs);
        if (projs.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projs[0].id);
        }
      } catch (err) {
        console.warn('Could not load projects for quick action:', err);
      }
    };
    fetchProjects();
  }, [open, user, selectedProjectId]);

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image automatically to save mobile data
    try {
      const compressed = await compressImageForMobile(file, { maxWidth: 1600, quality: 0.8 });
      setPhotoFile(compressed);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);

      // Auto-fetch location if available
      setLoadingGeo(true);
      getBrowserLocation().then(res => {
        setGeoState(res);
        setLoadingGeo(false);
      });
    } catch (err) {
      console.error('Compression error:', err);
      setPhotoFile(file);
    }
  };

  const handleSavePhotoIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !selectedProjectId) {
      toast({ title: 'Dados incompletos', description: 'Tire uma fotografia e selecione a obra.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    const selProj = projects.find(p => p.id === selectedProjectId);
    const projName = selProj?.name || 'Obra';

    // If offline, save draft locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      saveOfflineDraft({
        type: 'photo',
        projectId: selectedProjectId,
        projectName: projName,
        title: photoCaption || 'Foto de Campo',
        data: {
          category: photoCategory,
          caption: photoCaption,
          photoPreview,
          geo: geoState?.formattedCoordinates || null,
        }
      });
      toast({
        title: 'Guardado Offline no Smartphone',
        description: 'Fotografia guardada no telemóvel. Será sincronizada assim que tiver ligação.',
      });
      setIsUploading(false);
      resetPhotoModal();
      onOpenChange(false);
      return;
    }

    try {
      const photoPath = `projects/${selectedProjectId}/photos/${Date.now()}_${photoFile.name}`;
      const storageRef = ref(storage, photoPath);
      await uploadBytes(storageRef, photoFile);
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'projects', selectedProjectId, 'annotations'), {
        text: photoCaption || `Registo Fotográfico de Campo (${photoCategory})`,
        status: 'Aberta',
        type: photoCategory,
        priority: photoCategory === 'Segurança HSEQ' ? 'Alta' : 'Média',
        author: user?.displayName || 'Utilizador Móvel',
        createdAt: serverTimestamp(),
        photoUrls: [{ url: downloadUrl, name: photoFile.name }],
        locationText: geoState?.formattedCoordinates || null,
        coords: geoState ? { x: geoState.latitude, y: geoState.longitude, z: 0 } : null,
      });

      toast({
        title: 'Fotografia Registada!',
        description: `Fotografia associada à obra "${projName}" com sucesso.`,
      });
      resetPhotoModal();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao guardar', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetPhotoModal = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCaption('');
    setActiveAction(null);
    setGeoState(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-4 pb-8 pt-4">
        {activeAction === 'photo' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Fotografia Rápida de Campo</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)}>
                Voltar
              </Button>
            </div>

            <form onSubmit={handleSavePhotoIncident} className="space-y-3">
              <div>
                <Label className="text-xs">Projeto / Obra</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-10 text-sm mt-1">
                    <SelectValue placeholder="Selecione a obra..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Classificação</Label>
                <Select value={photoCategory} onValueChange={(val: any) => setPhotoCategory(val)}>
                  <SelectTrigger className="h-10 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Avanço Físico">Avanço Físico / Produção</SelectItem>
                    <SelectItem value="Qualidade">Inspeção de Qualidade</SelectItem>
                    <SelectItem value="Segurança HSEQ">Segurança no Trabalho (HSEQ)</SelectItem>
                    <SelectItem value="Geral">Registo Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Camera Trigger */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCapturePhoto}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border aspect-video max-h-48 bg-muted flex items-center justify-center">
                    <img src={photoPreview} alt="Preview de Campo" className="object-cover w-full h-full" />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 text-xs shadow-md"
                    >
                      Alterar Foto
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-dashed border-2 flex flex-col items-center justify-center gap-2 rounded-xl text-primary hover:bg-primary/5"
                  >
                    <Camera className="h-8 w-8" />
                    <span className="font-semibold text-sm">Tirar Fotografia com a Câmara</span>
                    <span className="text-[11px] text-muted-foreground">Otimização automática para poupar dados</span>
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs">Legenda ou Ocorrência</Label>
                <Textarea
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Ex: Execução de armadura do pilar P4, conforme pranchas..."
                  className="text-sm resize-none mt-1"
                  rows={2}
                />
              </div>

              {geoState && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/50 p-2 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{geoState.formattedCoordinates || 'Coordenadas GPS registadas'}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isUploading || !photoFile}
                className="w-full h-11 text-base font-bold bg-primary text-primary-foreground shadow-md gap-2"
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Guardar Registo Fotográfico
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base font-headline font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Ações Rápidas de Investigação
              </SheetTitle>
              <SheetDescription className="text-xs">
                Selecione a diligência ou registo a efetuar agora:
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* 1. Evidência Fotográfica */}
              <button
                type="button"
                onClick={() => setActiveAction('photo')}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-primary/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 mb-2">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Registar Evidência</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Foto e hash SHA-256</span>
              </button>

              {/* 2. Dossiê & Notas */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/investigacao');
                }}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-emerald-500/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 mb-2">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Dossiê & Notas</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Notas de diligência</span>
              </button>

              {/* 3. Vínculo / Grafo */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/investigacao#grafo');
                }}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-purple-500/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 mb-2">
                  <Ruler className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Grafos & Vínculos</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Mapear ligações</span>
              </button>

              {/* 4. Achado / Finding */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/investigacao?action=novo_achado');
                }}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-destructive/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive mb-2">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Registar Achado</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Finding pericial</span>
              </button>

              {/* 5. Executar SI */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/investigacao#si');
                }}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-violet-500/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 mb-2">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Inteligência SI</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">IA com validação</span>
              </button>

              {/* 6. Novo Caso */}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/investigacao?action=novo_caso');
                }}
                className="flex flex-col items-start p-3.5 rounded-xl border bg-card hover:bg-primary/5 border-indigo-500/20 text-left transition-all shadow-xs touch-target-44 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 mb-2">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Novo Caso</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Abrir investigação</span>
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
