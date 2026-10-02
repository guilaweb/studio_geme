import { ManualPart, ManualChapter } from './types';
import { PART_1_CHAPTERS } from './part-1-intro';
import { PART_2_CHAPTERS } from './part-2-perfis';
import { PART_3_CHAPTERS } from './part-3-guias-projetos';
import { PART_4_CHAPTERS } from './part-4-casos-praticos';
import { PART_5_CHAPTERS } from './part-5-relatorios';
import { PART_6_CHAPTERS } from './part-6-seguranca';
import { PART_7_CHAPTERS } from './part-7-problemas';
import { PART_8_CHAPTERS } from './part-8-referencia';

export * from './types';

export const USER_PROFILES_LIST = [
  'Todos',
  'Super Administrador',
  'Administrador da Organização',
  'Diretor / Administrador de Projetos',
  'Gestor de Obra / Gerente de Projeto',
  'Engenheiro / Técnico de Planeamento',
  'Orçamentista / Responsável de Custos',
  'Engenheiro de Campo / Fiscal de Obra',
  'Topógrafo',
  'Responsável de Mineração',
  'Gestor de Frotas / Equipamentos',
  'Responsável de Compras / Logística',
  'Almoxarife / Gestor de Stock',
  'Responsável HSEQ',
  'Responsável Financeiro',
  'Responsável de Documentação',
  'Trabalhador / Operador de Campo',
  'Cliente / Dono da Obra',
];

export const ALL_MANUAL_PARTS: ManualPart[] = [
  {
    id: 'part-1',
    number: 'PARTE I',
    title: 'Introdução à Plataforma',
    description: 'Sobre o Profundidade, objetivos, áreas de atuação, primeiros passos e 15 conceitos fundamentais.',
    iconName: 'BookOpen',
    chapters: PART_1_CHAPTERS,
  },
  {
    id: 'part-2',
    number: 'PARTE II',
    title: 'Perfis de Utilizador (17 Perfis)',
    description: 'Objetivos, rotinas, acessos e alçadas detalhadas para cada função na organização.',
    iconName: 'Users',
    chapters: PART_2_CHAPTERS,
  },
  {
    id: 'part-3',
    number: 'PARTE III',
    title: 'Guias por Tipo de Projeto',
    description: 'Instruções especializadas para Construção Civil, Mineração, Vias/Estradas e Topografia.',
    iconName: 'Layers',
    chapters: PART_3_CHAPTERS,
  },
  {
    id: 'part-4',
    number: 'PARTE IV',
    title: 'Casos Práticos Completos',
    description: 'Projetos passo a passo: Obra de Pintura em 16 Passos, Edifícios, Estradas e Mineração.',
    iconName: 'Briefcase',
    chapters: PART_4_CHAPTERS,
  },
  {
    id: 'part-5',
    number: 'PARTE V',
    title: 'Relatórios e Indicadores',
    description: 'Matemática do EVA (IDC/IDP), Curvas S, previsões no término EAC e dossiers executivos.',
    iconName: 'BarChart3',
    chapters: PART_5_CHAPTERS,
  },
  {
    id: 'part-6',
    number: 'PARTE VI',
    title: 'Administração e Segurança',
    description: 'Matriz RBAC, trancamento probatório com hash SHA-256, auditoria e salvaguarda decenal.',
    iconName: 'ShieldCheck',
    chapters: PART_6_CHAPTERS,
  },
  {
    id: 'part-7',
    number: 'PARTE VII',
    title: 'Resolução de Problemas',
    description: 'Matriz padronizada: Problema → Causa → Solução → Procedimento → Resultado esperado.',
    iconName: 'Wrench',
    chapters: PART_7_CHAPTERS,
  },
  {
    id: 'part-8',
    number: 'PARTE VIII',
    title: 'Referência Rápida',
    description: 'Atalhos de teclado, glossário técnico de engenharia e checklists operacionais por função.',
    iconName: 'BookMarked',
    chapters: PART_8_CHAPTERS,
  },
];

export const ALL_MANUAL_CHAPTERS: ManualChapter[] = [
  ...PART_1_CHAPTERS,
  ...PART_2_CHAPTERS,
  ...PART_3_CHAPTERS,
  ...PART_4_CHAPTERS,
  ...PART_5_CHAPTERS,
  ...PART_6_CHAPTERS,
  ...PART_7_CHAPTERS,
  ...PART_8_CHAPTERS,
];
