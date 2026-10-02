
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, serverTimestamp, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FolderPlus, File, Folder, FileUp, FolderUp, Upload, GitBranch, History, Download } from 'lucide-react';
import { type DocumentListItem, type ProjectFile, type ProjectFolder, type DocumentVersion, type DocumentStatus } from '@/types/documents';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';


interface DocumentsTabProps {
    projectId: string;
    userRole: UserRole | null;
    onFvsSelect?: (file: ProjectFile) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function DocumentsTab({ projectId, userRole, onFvsSelect }: DocumentsTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [items, setItems] = useState<DocumentListItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<ProjectFolder | null>(null);
    const [path, setPath] = useState<ProjectFolder[]>([]);
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
    
    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const parentId = currentFolder ? currentFolder.id : null;

        const q = query(
            collection(db, 'projects', projectId, 'documents'),
            where('parentId', '==', parentId),
            orderBy('type', 'desc'), // folders first
            orderBy('name', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as DocumentListItem));
            setItems(fetchedItems);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching documents: ", error);
            toast({ title: 'Erro ao carregar documentos', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, currentFolder, toast]);

    const handleCreateFolder = async () => {
        if (!canEdit) return;
        if (!newFolderName.trim()) {
            toast({ title: 'Nome da pasta é obrigatório', variant: 'destructive' });
            return;
        }
        setIsCreatingFolder(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'documents'), {
                name: newFolderName,
                type: 'folder',
                parentId: currentFolder ? currentFolder.id : null,
                createdAt: serverTimestamp(),
            });
            setNewFolderName('');
            setIsFolderDialogOpen(false);
            toast({ title: 'Pasta criada com sucesso!' });
        } catch (error) {
            console.error("Error creating folder: ", error);
            toast({ title: 'Erro ao criar pasta', variant: 'destructive' });
        } finally {
            setIsCreatingFolder(false);
        }
    };
    
    const uploadFile = async (file: File, existingFile?: ProjectFile) => {
        if (!canEdit || !user) return;
        
        setIsUploading(true);
        toast({ title: `A carregar ${file.name}...` });

        try {
            const storagePath = `projects/${projectId}/documents/${currentFolder?.id || 'root'}/${file.name}`;
            const storageRef = ref(storage, storagePath);
            
            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);

            const newVersion: DocumentVersion = {
                version: existingFile ? existingFile.latestVersion + 1 : 1,
                url: downloadURL,
                size: file.size,
                createdAt: serverTimestamp() as Timestamp,
                author: { uid: user.uid, displayName: user.displayName || user.email! },
            };

            if (existingFile) {
                // Upload a new version of an existing file
                const docRef = doc(db, 'projects', projectId, 'documents', existingFile.id);
                await updateDoc(docRef, {
                    versions: arrayUnion(newVersion),
                    latestVersion: newVersion.version,
                    status: 'Rascunho' // Reset status on new version
                });
                toast({ title: 'Nova versão carregada!', description: `${file.name} foi atualizado para a versão ${newVersion.version}.` });
                 // Refresh selected file view
                const updatedDoc = (await getDoc(docRef)).data() as ProjectFile;
                setSelectedFile({ ...updatedDoc, id: docRef.id });
            } else {
                // Upload a new file
                await addDoc(collection(db, 'projects', projectId, 'documents'), {
                    name: file.name,
                    type: 'file',
                    status: 'Rascunho',
                    latestVersion: 1,
                    versions: [newVersion],
                    parentId: currentFolder ? currentFolder.id : null,
                });
                toast({ title: 'Ficheiro carregado com sucesso!' });
            }

        } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            toast({ title: `Erro no upload de ${file.name}`, variant: 'destructive' });
        } finally {
             setIsUploading(false);
        }
    };


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const existingFile = items.find(item => item.type === 'file' && item.name === file.name) as ProjectFile | undefined;
        
        if (existingFile) {
            // Confirm if user wants to upload a new version
            if (confirm(`Já existe um documento com o nome "${file.name}". Deseja carregar como uma nova versão?`)) {
                await uploadFile(file, existingFile);
            }
        } else {
            await uploadFile(file);
        }

        if(fileInputRef.current) fileInputRef.current.value = "";
    };
    
    const handleItemClick = (item: DocumentListItem) => {
        if (item.type === 'folder') {
            setCurrentFolder(item);
            setPath(prev => [...prev, item]);
            setSelectedFile(null);
        } else {
            setSelectedFile(item);
        }
    };

    const handleBreadcrumbClick = (folder: ProjectFolder | null, index: number) => {
        setCurrentFolder(folder);
        setPath(prev => prev.slice(0, index + 1));
        setSelectedFile(null);
    };

    const handleStatusChange = async (fileId: string, newStatus: DocumentStatus) => {
        if (!canEdit) return;
        try {
            const docRef = doc(db, 'projects', projectId, 'documents', fileId);
            await updateDoc(docRef, { status: newStatus });
            toast({ title: `Estado do documento atualizado para "${newStatus}".` });
             // Refresh selected file view
            const updatedDoc = (await getDoc(docRef)).data() as ProjectFile;
            setSelectedFile({ ...updatedDoc, id: docRef.id });
        } catch (error) {
            toast({ title: 'Erro ao atualizar estado', variant: 'destructive' });
        }
    };

    const getStatusVariant = (status: DocumentStatus) => {
        switch(status) {
            case 'Aprovado': return 'default';
            case 'Em Revisão': return 'secondary';
            case 'Rascunho': return 'outline';
            case 'Obsoleto': return 'destructive';
            default: return 'outline';
        }
    }


    const renderFileDetails = () => {
        if (!selectedFile) return null;
        const latestVersion = selectedFile.versions?.find(v => v.version === selectedFile.latestVersion);
        if (!latestVersion) return null;

        return (
             <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="truncate">{selectedFile.name}</CardTitle>
                        <div className="flex items-center gap-2">
                           <Badge variant={getStatusVariant(selectedFile.status)}>
                               {selectedFile.status}
                           </Badge>
                           <Badge variant="secondary">Versão {selectedFile.latestVersion}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {canEdit && (
                            <div className="space-y-2">
                                <Label>Alterar Estado</Label>
                                <Select value={selectedFile.status} onValueChange={(s) => handleStatusChange(selectedFile.id, s as DocumentStatus)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Rascunho">Rascunho</SelectItem>
                                        <SelectItem value="Em Revisão">Em Revisão</SelectItem>
                                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                                        <SelectItem value="Obsoleto">Obsoleto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                         <Button asChild className="w-full">
                            <a href={latestVersion.url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4"/> Fazer Download (v{selectedFile.latestVersion})
                            </a>
                        </Button>
                        {selectedFile.name.endsWith('.md') && (
                            <Button variant="outline" className="w-full" onClick={() => onFvsSelect?.(selectedFile)}>
                                Abrir como Checklist (FVS)
                            </Button>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Versões</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {selectedFile.versions.slice().reverse().map(version => (
                                <div key={version.version} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                    <div>
                                        <p className="font-semibold">Versão {version.version}</p>
                                        <p className="text-xs text-muted-foreground">por {version.author.displayName} em {version.createdAt ? format((version.createdAt as Timestamp).toDate(), 'dd/MM/yyyy') : ''}</p>
                                    </div>
                                    <Button asChild variant="ghost" size="sm">
                                        <a href={version.url} target="_blank" rel="noopener noreferrer">
                                            Download
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap gap-2 justify-between items-start">
                        <div>
                            <CardTitle>Gestor de Documentos</CardTitle>
                            <CardDescription>Armazene e organize todos os documentos do projeto com controlo de versões.</CardDescription>
                        </div>
                        {canEdit && (
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline">
                                    {isUploading ? <Loader2 className="animate-spin mr-2"/> : <FileUp className="mr-2" />}
                                    Carregar Ficheiro
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} aria-label="Carregar Ficheiros" />

                                <DialogTrigger asChild>
                                    <Button>
                                        <FolderPlus className="mr-2" />
                                        Criar Pasta
                                    </Button>
                                </DialogTrigger>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                             <div className="flex items-center text-sm text-muted-foreground mb-4">
                                <div onClick={() => { setCurrentFolder(null); setPath([]); setSelectedFile(null); }} className="cursor-pointer hover:underline">Documentos</div>
                                {path.map((folder, index) => (
                                    <div key={folder.id} className="flex items-center">
                                        <span className="mx-2">/</span>
                                        <span onClick={() => { handleBreadcrumbClick(folder, index); setSelectedFile(null); }} className="cursor-pointer hover:underline">{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {loading ? (
                                <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                            ) : (
                                <div className="border rounded-md min-h-[300px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Versão</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Data de Modificação</TableHead>
                                            <TableHead className="text-right">Tamanho</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">Esta pasta está vazia.</TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map(item => {
                                                const isFile = item.type === 'file';
                                                const latestVersion = isFile ? (item as ProjectFile).versions?.find(v => v.version === (item as ProjectFile).latestVersion) : null;
                                                return (
                                                <TableRow key={item.id} onClick={() => handleItemClick(item)} className="cursor-pointer" data-state={selectedFile?.id === item.id ? 'selected' : ''}>
                                                    <TableCell className="flex items-center gap-2 font-medium hover:underline">
                                                        {item.type === 'folder' ? <Folder className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-muted-foreground" />}
                                                        {item.name}
                                                    </TableCell>
                                                    <TableCell className="text-center">{isFile ? `v${(item as ProjectFile).latestVersion}` : '--'}</TableCell>
                                                     <TableCell>
                                                        {isFile && <Badge variant={getStatusVariant((item as ProjectFile).status)}>{(item as ProjectFile).status}</Badge>}
                                                    </TableCell>
                                                    <TableCell>{latestVersion?.createdAt ? format((latestVersion.createdAt as Timestamp).toDate(), 'dd/MM/yyyy') : ((item as any).createdAt ? format(((item as any).createdAt as Timestamp).toDate(), 'dd/MM/yyyy') : '--')}</TableCell>
                                                    <TableCell className="text-right">{isFile && latestVersion ? formatBytes(latestVersion.size) : '--'}</TableCell>
                                                </TableRow>
                                            )})
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </div>
                        {renderFileDetails()}
                     </div>
                </CardContent>
            </Card>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Nova Pasta</DialogTitle>
                    <DialogDescription>
                        Insira o nome da nova pasta.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="folder-name" className="text-right">
                        Nome
                        </Label>
                        <Input
                            id="folder-name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="col-span-3"
                            placeholder="Ex: Plantas de Arquitetura"
                            disabled={isCreatingFolder}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateFolder} disabled={isCreatingFolder}>
                        {isCreatingFolder ? <Loader2 className="animate-spin mr-2"/> : <FolderPlus className="mr-2" />}
                        Criar Pasta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { DocumentsTab };
