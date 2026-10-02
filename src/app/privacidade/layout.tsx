import { Metadata } from 'next';
import { generateSeoMetadata } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Política de Privacidade e Proteção de Dados',
    description: 'Conheça o compromisso da Profundidade com a privacidade, segurança da informação e tratamento de dados dos nossos utilizadores em conformidade com as leis vigentes.',
    path: '/privacidade',
    keywords: ['politica de privacidade profundidade', 'seguranca de dados software obras'],
});

export default function PrivacidadeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Política de Privacidade', item: '/privacidade' },
                ]}
            />
            {children}
        </>
    );
}
