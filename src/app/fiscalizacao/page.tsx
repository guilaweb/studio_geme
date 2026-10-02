'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function FiscalizacaoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/investigacao#custodia');
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070d18] text-white">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">Perícia & Custódia Forense</h2>
          <p className="text-xs text-slate-400">Cadeia de Custódia e Verificação de Integridade SHA-256</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span>A redirecionar para a custódia probatória...</span>
        </div>
      </div>
    </div>
  );
}
