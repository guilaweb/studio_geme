import { Metadata } from 'next';
import { generateSeoMetadata } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Soluções Integradas de Inteligência, Perícia Forense & Evidências',
    description: 'Conheça os módulos especializados da Profundidade: Gestão de Casos, Hashing SHA-256 e Cadeia de Custódia, Grafos de Relacionamentos, OSINT, Laboratório Forense e Assistência de IA (SI) com Human-in-the-Loop.',
    path: '/solucoes',
    keywords: [
        'sistema operacional de investigacao',
        'gestao de casos e dossies',
        'cadeia de custodia sha-256',
        'analise de vinculos e grafos',
        'inteligencia osint',
        'laboratorio forense digital',
        'relatorios periciais gcp'
    ],
});

export default function SolucoesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Soluções', item: '/solucoes' },
                ]}
            />
            {children}
        </>
    );
}
