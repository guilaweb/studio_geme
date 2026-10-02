'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, HardDrive } from 'lucide-react';
import { countPendingDrafts } from '@/lib/offline-drafts';

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingDrafts(countPendingDrafts());

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    const handleDraftsUpdate = () => {
      setPendingDrafts(countPendingDrafts());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('profundidade_drafts_updated', handleDraftsUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('profundidade_drafts_updated', handleDraftsUpdate);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <aside aria-label="Aviso de conectividade" className="sticky top-0 z-50 bg-emerald-600 text-white text-xs px-3 py-1.5 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-2 mx-auto font-medium">
          <Wifi className="h-3.5 w-3.5" />
          <span>Ligação restabelecida. Operações sincronizadas com sucesso.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Aviso de conectividade" className="sticky top-0 z-50 bg-amber-600 text-white text-xs px-3 py-1.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">Modo Campo / Offline:</span>
        <span className="truncate">Os registos estão a ser salvos localmente neste telemóvel.</span>
      </div>
      {pendingDrafts > 0 && (
        <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full text-[10px] shrink-0 font-bold ml-2">
          <HardDrive className="h-3 w-3" />
          {pendingDrafts} pendente{pendingDrafts > 1 ? 's' : ''}
        </span>
      )}
    </aside>
  );
}
