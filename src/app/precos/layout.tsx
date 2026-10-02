import { Metadata } from 'next';
import { generateSeoMetadata, SITE_URL } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Planos e Preços Transparentes para Departamentos de Inteligência e Perícia',
    description: 'Escolha o plano ideal para a sua organização ou agência de investigação. Comece com gestão de casos e escale para custódia SHA-256 em GCP, análise de grafos e módulos de inteligência analítica.',
    path: '/precos',
    keywords: [
        'precos software investigacao',
        'software cadeia de custodia precos',
        'plataforma osint pericial angola',
        'gestao de casos forenses precos',
        'subscricao software de inteligencia'
    ],
});

export default function PrecosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Profundidade - Sistema Operacional de Inteligência e Evidências',
        description: 'Plataforma SaaS para gestão de casos, custódia de evidências SHA-256 e investigação forense.',
        image: `${SITE_URL}/opengraph-image`,
        brand: {
            '@type': 'Brand',
            name: 'Profundidade',
        },
        offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'AOA',
            lowPrice: '0',
            highPrice: '150000',
            offerCount: '3',
            offers: [
                {
                    '@type': 'Offer',
                    name: 'Plano Grátis (Experimentação)',
                    price: '0',
                    priceCurrency: 'AOA',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE_URL}/precos`,
                },
                {
                    '@type': 'Offer',
                    name: 'Plano Pro',
                    price: '50000',
                    priceCurrency: 'AOA',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE_URL}/precos`,
                },
                {
                    '@type': 'Offer',
                    name: 'Plano Enterprise',
                    price: '150000',
                    priceCurrency: 'AOA',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE_URL}/precos`,
                },
            ],
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Planos e Preços', item: '/precos' },
                ]}
            />
            {children}
        </>
    );
}
