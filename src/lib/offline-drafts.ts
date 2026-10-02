/**
 * Gestão de Rascunhos Locais Offline para Operações de Campo (Mobile First)
 * Permite guardar registos do diário de obra, ocorrências, medições e notas
 * no armazenamento local do smartphone quando a ligação à internet é fraca ou inexistente,
 * sincronizando quando a ligação é restabelecida.
 */

export interface OfflineDraft {
  id: string;
  type: 'daily_report' | 'incident' | 'measurement' | 'task' | 'photo';
  projectId: string;
  projectName?: string;
  title: string;
  data: any;
  createdAt: string;
  synced: boolean;
}

const STORAGE_KEY = 'profundidade_offline_drafts_v1';

export function getOfflineDrafts(): OfflineDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Erro ao ler rascunhos offline:', e);
    return [];
  }
}

export function saveOfflineDraft(draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'synced'>): OfflineDraft {
  const drafts = getOfflineDrafts();
  const newDraft: OfflineDraft = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  drafts.unshift(newDraft);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('profundidade_drafts_updated', { detail: drafts }));
  } catch (e) {
    console.error('Erro ao guardar rascunho offline:', e);
  }
  return newDraft;
}

export function removeOfflineDraft(draftId: string): void {
  const drafts = getOfflineDrafts().filter(d => d.id !== draftId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new CustomEvent('profundidade_drafts_updated', { detail: drafts }));
  } catch (e) {
    console.error('Erro ao remover rascunho offline:', e);
  }
}

export function countPendingDrafts(): number {
  return getOfflineDrafts().filter(d => !d.synced).length;
}
