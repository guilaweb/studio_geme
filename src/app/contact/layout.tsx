import { Metadata } from 'next';
import { generateSeoMetadata, siteConfig, SITE_URL } from '@/lib/seo-config';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Fale Connosco | Demonstrações & Suporte Técnico Confidencial',
    description: 'Entre em contacto com a equipa da Profundidade. Solicite uma demonstração técnica confidencial, esclareça dúvidas sobre implantação multi-tenant ou obtenha suporte pericial.',
    path: '/contact',
    keywords: [
        'contactos profundidade',
        'demonstracao software investigacao',
        'suporte plataforma forense gcp',
        'falar com especialistas de inteligencia'
    ],
});

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const contactPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        '@id': `${SITE_URL}/contact/#webpage`,
        url: `${SITE_URL}/contact`,
        name: 'Contactar a Profundidade',
        description: 'Canais de atendimento ao cliente, suporte e demonstrações comerciais.',
        mainEntity: {
            '@type': 'Organization',
            name: siteConfig.name,
            telephone: siteConfig.phone,
            email: siteConfig.email,
            address: {
                '@type': 'PostalAddress',
                streetAddress: siteConfig.address.streetAddress,
                addressLocality: siteConfig.address.addressLocality,
                addressRegion: siteConfig.address.addressRegion,
                addressCountry: siteConfig.address.addressCountry,
            },
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
            />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Contacto', item: '/contact' },
                ]}
            />
            {children}
        </>
    );
}
