import { Metadata } from 'next';
import { generateSeoMetadata, siteConfig, SITE_URL } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Sobre a Profundidade | Sistema Operacional de Inteligência e Evidências',
    description: 'Conheça a missão e arquitetura da Profundidade. Construímos a infraestrutura digital soberana para inteligência operacional, investigações forenses e cadeia de custódia sobre Google Cloud Platform.',
    path: '/sobre',
    keywords: [
        'sobre a profundidade',
        'sistema operacional de inteligencia',
        'software de investigacao forense',
        'cadeia de custodia digital gcp',
        'plataforma analitica de inteligencia'
    ],
});

export default function SobreLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const aboutPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        '@id': `${SITE_URL}/sobre/#webpage`,
        url: `${SITE_URL}/sobre`,
        name: 'Sobre a Profundidade',
        description: 'A história, missão e tecnologia por detrás da plataforma Profundidade.',
        mainEntity: {
            '@id': `${SITE_URL}/#organization`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Sobre Nós', item: '/sobre' },
                ]}
            />
            {children}
        </>
    );
}
