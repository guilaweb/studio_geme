import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profundidade.app';

export const siteConfig = {
    name: 'Profundidade',
    legalName: 'Profundidade - Sistema Operacional de Inteligência e Evidências, Lda.',
    alternateNames: [
        'Profundidade OS',
        'Profundidade Inteligência',
        'Profundidade Investigação',
        'Profundidade Evidências'
    ],
    tagline: 'Sistema Operacional Digital de Inteligência, Investigação e Evidências sobre Google Cloud Platform',
    description: 'O sistema operacional digital corporativo para inteligência, investigação pericial e cadeia de custódia de evidências desenvolvido sobre Google Cloud Platform (GCP). Gestão de casos, cadeia de custódia com hash SHA-256 imediato, grafos de relacionamentos societários, Sistema de Inteligência (SI) e isolamento 100% multi-tenant.',
    url: SITE_URL,
    locale: 'pt_AO',
    alternateLocales: ['pt_PT', 'en_US'],
    logoUrl: `${SITE_URL}/icon.svg`,
    ogImageUrl: `${SITE_URL}/opengraph-image`,
    email: 'contacto@profundidade.app',
    phone: '+244 923 000 000',
    address: {
        streetAddress: 'Talatona, Luanda Sul',
        addressLocality: 'Luanda',
        addressRegion: 'Luanda',
        postalCode: '1000',
        addressCountry: 'AO',
        addressCountryName: 'Angola',
    },
    geo: {
        latitude: -8.8383,
        longitude: 13.2344,
    },
    socialLinks: {
        linkedin: 'https://www.linkedin.com/company/profundidade',
        x: 'https://x.com/profundidade',
        facebook: 'https://www.facebook.com/profundidade.app',
        youtube: 'https://www.youtube.com/@profundidade',
        instagram: 'https://www.instagram.com/profundidade.app',
    },
    keywords: [
        // Inteligência e Investigação
        'sistema operacional digital inteligência',
        'software de investigação e perícia',
        'cadeia de custódia de evidências sha-256',
        'gestão de casos investigativos',
        'grafo de vínculos e relacionamentos societários',
        'análise forense digital angola',
        'sistema de inteligência si gcp',
        'auditoria de conformidade e integridade',
        'dossiê pericial digital',
        'plataforma multi-tenant segura',
        'google cloud platform inteligência',
        'rastreabilidade forense imutável',
        'software investigativo luanda angola'
    ],
    pricing: {
        currency: 'AOA',
        freeTrialDays: 14,
        startingPrice: 0,
    },
};

export interface PageSeoProps {
    title: string;
    description?: string;
    path?: string;
    ogImage?: string;
    keywords?: string[];
    noIndex?: boolean;
    type?: 'website' | 'article';
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
}

export function generateSeoMetadata({
    title,
    description = siteConfig.description,
    path = '',
    ogImage,
    keywords = [],
    noIndex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors,
}: PageSeoProps): Metadata {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const pageUrl = `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`;
    const image = ogImage || `${SITE_URL}/opengraph-image`;
    const combinedKeywords = Array.from(new Set([...keywords, ...siteConfig.keywords.slice(0, 15)]));

    return {
        title: title,
        description: description,
        keywords: combinedKeywords,
        metadataBase: new URL(SITE_URL),
        alternates: {
            canonical: pageUrl,
            languages: {
                'pt-AO': pageUrl,
                'pt': pageUrl,
                'x-default': pageUrl,
            },
        },
        robots: noIndex
            ? {
                  index: false,
                  follow: false,
              }
            : {
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
        openGraph: {
            type: type,
            locale: siteConfig.locale,
            alternateLocale: siteConfig.alternateLocales,
            url: pageUrl,
            title: title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`,
            description: description,
            siteName: siteConfig.name,
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: title,
                    type: 'image/png',
                },
            ],
            ...(type === 'article' && {
                publishedTime: publishedTime,
                modifiedTime: modifiedTime,
                authors: authors || [siteConfig.name],
            }),
        },
        twitter: {
            card: 'summary_large_image',
            title: title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`,
            description: description,
            site: '@profundidade',
            creator: '@profundidade',
            images: [image],
        },
    };
}
