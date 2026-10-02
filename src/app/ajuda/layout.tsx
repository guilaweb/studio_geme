import { Metadata } from 'next';
import { generateSeoMetadata } from '@/lib/seo-config';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = generateSeoMetadata({
    title: 'Centro de Ajuda & Perguntas Frequentes (FAQ) | Profundidade',
    description: 'Guia prático e respostas às perguntas mais frequentes sobre a plataforma Profundidade: criação de casos, cálculo de hash SHA-256 de evidências, cadeia de custódia, grafos de entidades e IA com Human-in-the-Loop.',
    path: '/ajuda',
    keywords: [
        'como usar profundidade',
        'ajuda software investigacao forense',
        'tutorial cadeia de custodia digital',
        'hashing sha-256 evidencias gcp',
        'grafos de relacionamentos inteligencia'
    ],
});

const helpFaqs = [
    {
        question: 'O que é a plataforma Profundidade e para quem se destina?',
        answer: 'A Profundidade é um Sistema Operacional Digital de Inteligência, Investigação e Evidências sobre Google Cloud Platform, concebido para órgãos de segurança pública, gabinetes de perícia forense, departamentos de compliance, escritórios jurídicos e agências de investigação.',
    },
    {
        question: 'Como funciona a garantia de integridade das evidências (SHA-256)?',
        answer: 'No momento exato do upload de qualquer ficheiro ou documento, o sistema calcula o resumo criptográfico SHA-256, regista metadados imutáveis e armazena o ficheiro no Google Cloud Storage. O sistema impede a substituição silenciosa de ficheiros, criando sempre novas versões rastreadas.',
    },
    {
        question: 'Como é mantida a Cadeia de Custódia?',
        answer: 'Cada movimentação, visualização, download ou transferência de evidência é associada à identificação do custodiante, motivo legal, carimbo temporal e hash da prova, assegurando conformidade com normas forenses e admitibilidade probatória perante os tribunais.',
    },
    {
        question: 'Como funciona o Sistema de Inteligência (SI) e o princípio Human-in-the-Loop?',
        answer: 'A SI atua como camada de assistência analítica para sumarização de relatórios, extração de entidades e sugestão de correlações. Todo o resultado automatizado é explicitamente identificado como inferência probabilística e requer validação humana formal de um investigador para ser admitido.',
    },
    {
        question: 'Como é garantido o isolamento entre organizações (Multi-Tenancy)?',
        answer: 'A arquitetura implementa isolamento estrito ao nível do backend e das queries da base de dados PostgreSQL. É absolutamente impossível que a Organização A aceda a casos, evidências ou logs da Organização B.',
    },
];

export default function AjudaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <FaqJsonLd faqs={helpFaqs} />
            <BreadcrumbJsonLd
                items={[
                    { name: 'Centro de Ajuda', item: '/ajuda' },
                ]}
            />
            {children}
        </>
    );
}
