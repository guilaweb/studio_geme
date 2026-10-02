import React from 'react';
import { siteConfig, SITE_URL } from '@/lib/seo-config';

interface BreadcrumbItem {
    name: string;
    item: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface ArticleProps {
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
    keywords?: string[];
    wordCount?: number;
}

/**
 * Organization Schema (schema.org/Organization)
 */
export function OrganizationJsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        alternateName: siteConfig.alternateNames,
        url: SITE_URL,
        logo: {
            '@type': 'ImageObject',
            '@id': `${SITE_URL}/#logo`,
            url: `${SITE_URL}/icon.svg`,
            caption: siteConfig.name,
            width: 512,
            height: 512,
        },
        image: `${SITE_URL}/opengraph-image`,
        description: siteConfig.description,
        email: siteConfig.email,
        telephone: siteConfig.phone,
        address: {
            '@type': 'PostalAddress',
            streetAddress: siteConfig.address.streetAddress,
            addressLocality: siteConfig.address.addressLocality,
            addressRegion: siteConfig.address.addressRegion,
            postalCode: siteConfig.address.postalCode,
            addressCountry: siteConfig.address.addressCountry,
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: siteConfig.geo.latitude,
            longitude: siteConfig.geo.longitude,
        },
        sameAs: Object.values(siteConfig.socialLinks),
        areaServed: [
            { '@type': 'Country', name: 'Angola' },
            { '@type': 'Country', name: 'Portugal' },
            { '@type': 'Country', name: 'Moçambique' },
            { '@type': 'Country', name: 'Cabo Verde' },
        ],
        contactPoint: [
            {
                '@type': 'ContactPoint',
                telephone: siteConfig.phone,
                contactType: 'customer support',
                email: siteConfig.email,
                areaServed: 'AO',
                availableLanguage: ['Portuguese', 'English'],
            },
            {
                '@type': 'ContactPoint',
                telephone: siteConfig.phone,
                contactType: 'sales',
                email: siteConfig.email,
                areaServed: 'AO',
                availableLanguage: ['Portuguese', 'English'],
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

/**
 * SoftwareApplication Schema (schema.org/SoftwareApplication)
 */
export function SoftwareAppJsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: siteConfig.name,
        operatingSystem: 'All (Cloud Web SaaS, PWA, Mobile, Desktop)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Construction and Mining Project Management',
        softwareVersion: '2.5',
        description: siteConfig.description,
        url: SITE_URL,
        publisher: {
            '@id': `${SITE_URL}/#organization`,
        },
        offers: [
            {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'AOA',
                name: 'Plano Gratuito de Experimentação',
                description: 'Acesso às ferramentas fundamentais de gestão de obras e diário de obras digital.',
            },
            {
                '@type': 'Offer',
                price: '50000',
                priceCurrency: 'AOA',
                name: 'Plano Profissional',
                description: 'EAP avançada, controlo de custos, análise EVM, medições e gestão de recursos.',
            },
            {
                '@type': 'Offer',
                name: 'Plano Enterprise',
                description: 'Ilimitado, múltiplos estaleiros, módulos de mineração, estradas e telecomunicações.',
            },
        ],
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '142',
            bestRating: '5',
            worstRating: '1',
        },
        featureList: [
            'Estrutura Analítica do Projeto (EAP / WBS) com Caminho Crítico',
            'Diário de Obras Digital (RDO) com Registo Fotográfico e Assinaturas',
            'Análise de Valor Agregado (EVM) e Controlo de Custos em Tempo Real',
            'Gestão de Autos de Medição e Certificados de Pagamento',
            'Controlo de Betão, Slump Test e Rastreabilidade de Amassaduras',
            'Inspeção de Armaduras e Verificação de Desenhos Técnicos',
            'Topografia, Perfis Transversais e Longitudinais de Estradas',
            'Controlo de Produção e Rastreabilidade Mineira (Processo de Kimberley)',
            'Monitorização de Ativos de Energia e Redes de Telecomunicações',
            'Portal do Cliente e Fiscalização com Partilha Segura de Relatórios'
        ],
        screenshot: `${SITE_URL}/opengraph-image`,
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

/**
 * WebSite Schema with Sitelinks Searchbox (schema.org/WebSite)
 */
export function WebSiteJsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: siteConfig.name,
        alternateName: siteConfig.alternateNames,
        description: siteConfig.description,
        publisher: {
            '@id': `${SITE_URL}/#organization`,
        },
        inLanguage: 'pt-AO',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

/**
 * BreadcrumbList Schema (schema.org/BreadcrumbList)
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Início',
                item: SITE_URL,
            },
            ...items.map((it, idx) => ({
                '@type': 'ListItem',
                position: idx + 2,
                name: it.name,
                item: it.item.startsWith('http') ? it.item : `${SITE_URL}${it.item.startsWith('/') ? it.item : `/${it.item}`}`,
            })),
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

/**
 * FAQPage Schema (schema.org/FAQPage)
 */
export function FaqJsonLd({ faqs }: { faqs: FaqItem[] }) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

/**
 * Article Schema (schema.org/BlogPosting)
 */
export function ArticleJsonLd({
    title,
    description,
    url,
    imageUrl,
    datePublished,
    dateModified,
    authorName = 'Equipa Profundidade',
    keywords = [],
    wordCount,
}: ArticleProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': url,
        },
        headline: title,
        description: description,
        image: imageUrl ? [imageUrl] : [`${SITE_URL}/opengraph-image`],
        datePublished: datePublished,
        dateModified: dateModified || datePublished,
        author: {
            '@type': 'Person',
            name: authorName,
        },
        publisher: {
            '@id': `${SITE_URL}/#organization`,
        },
        inLanguage: 'pt-AO',
        keywords: keywords.join(', '),
        ...(wordCount && { wordCount }),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
