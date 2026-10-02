'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/investigacao');
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070d18] text-white">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 text-primary">
          <Shield className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">PROFUNDIDADE</h2>
          <p className="text-xs text-slate-400">Sistema Operacional Digital de Inteligência & Evidências</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>A redirecionar para a consola operacional de investigação...</span>
        </div>
      </div>
    </div>
  );
}
