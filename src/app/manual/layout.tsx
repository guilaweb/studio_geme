import { Metadata } from 'next';
import { generateSeoMetadata, SITE_URL } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Manual Oficial do Utilizador e Guias Operacionais | Profundidade',
    description: 'Documentação técnica e manual passo-a-passo para utilização de todos os módulos da Profundidade: Gestão de Casos, Hashing SHA-256 de Evidências, Cadeia de Custódia, Grafos, OSINT e Sistema de Inteligência (SI).',
    path: '/manual',
    keywords: [
        'manual do utilizador profundidade',
        'documentacao software investigacao forense',
        'guia tecnico cadeia de custodia',
        'procedimentos operacionais inteligencia gcp'
    ],
});

export default function ManualLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const techArticleSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'Manual do Utilizador da Plataforma Profundidade',
        description: 'Instruções completas para gestão de casos, custódia de evidências, grafos e inteligência analítica.',
        url: `${SITE_URL}/manual`,
        image: `${SITE_URL}/opengraph-image`,
        author: {
            '@type': 'Organization',
            name: 'Profundidade',
        },
        inLanguage: 'pt-AO',
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Manual do Utilizador', item: '/manual' },
                ]}
            />
            {children}
        </>
    );
}
