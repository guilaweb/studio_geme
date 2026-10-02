import { Metadata } from 'next';
import { generateSeoMetadata } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Termos e Condições de Serviço',
    description: 'Termos e condições gerais de utilização dos serviços e produtos de software disponibilizados pela plataforma Profundidade.',
    path: '/termos',
    keywords: ['termos de servico profundidade', 'condicoes de utilizacao software engenharia'],
});

export default function TermosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Termos de Serviço', item: '/termos' },
                ]}
            />
            {children}
        </>
    );
}
