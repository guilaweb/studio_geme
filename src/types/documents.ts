import type { Timestamp } from 'firebase/firestore';

export type DocumentStatus = 'Rascunho' | 'Em Revisão' | 'Aprovado' | 'Obsoleto';

export interface DocumentVersion {
    version: number;
    url: string;
    size: number;
    createdAt: Timestamp;
    author: {
        uid: string;
        displayName: string;
    };
    notes?: string;
}


export interface ProjectFile {
    id: string;
    name: string;
    type: 'file';
    latestVersion: number;
    status: DocumentStatus;
    versions: DocumentVersion[];
    parentId: string | null; // id of the parent folder
}

export interface ProjectFolder {
    id: string;
    name: string;
    type: 'folder';
    createdAt: Timestamp;
    parentId: string | null;
}

export type DocumentListItem = ProjectFile | ProjectFolder;
