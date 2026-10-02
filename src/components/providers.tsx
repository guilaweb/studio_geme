'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { TenantProvider } from '@/contexts/tenant-context';
import { Toaster } from '@/components/ui/toaster';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { OfflineStatusBanner } from '@/components/navigation/offline-status-banner';
import { installSafeDatePrototypes } from '@/lib/date-utils';
import type { ReactNode } from 'react';

// Guarantee that RangeError: Invalid time value can never occur in client-side runtime
installSafeDatePrototypes();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <TenantProvider>
          <OfflineStatusBanner />
          {children}
          <MobileBottomNav />
          <Toaster />
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

