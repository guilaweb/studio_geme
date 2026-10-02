import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} - Sistema Operacional Digital de Inteligência, Investigação e Evidências`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#050b14',
    theme_color: '#0066ff',
    lang: 'pt',
    dir: 'ltr',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
