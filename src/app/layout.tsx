import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Providers } from "@/components/providers";
import "./globals.css";
import type { Metadata, Viewport } from 'next';
import { siteConfig, SITE_URL } from "@/lib/seo-config";
import { OrganizationJsonLd, SoftwareAppJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#050b14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${siteConfig.name} - Sistema Operacional Digital de Inteligência, Investigação e Evidências`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: SITE_URL }],
  generator: 'Next.js',
  keywords: siteConfig.keywords,
  referrer: 'origin-when-cross-origin',
  creator: siteConfig.name,
  publisher: siteConfig.legalName,
  category: 'security',
  classification: 'Sistema Operacional Digital de Inteligência, Investigação e Evidências',
  alternates: {
    canonical: SITE_URL,
    languages: {
      'pt-AO': SITE_URL,
      'pt': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    alternateLocale: siteConfig.alternateLocales,
    url: SITE_URL,
    title: `${siteConfig.name} - Sistema Operacional Digital de Inteligência, Investigação e Evidências`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Sistema Operacional Digital de Inteligência e Evidências`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Sistema Operacional de Inteligência, Investigação e Evidências`,
    description: siteConfig.description,
    site: "@profundidade",
    creator: "@profundidade",
    images: [`${SITE_URL}/twitter-image`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Core Structured Data */}
        <OrganizationJsonLd />
        <SoftwareAppJsonLd />
        <WebSiteJsonLd />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <Providers>
            {children}
          </Providers>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
