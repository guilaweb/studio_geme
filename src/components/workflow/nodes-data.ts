'use client';

import { Zap, Play, GitBranch } from 'lucide-react';

export const NODE_CATEGORIES = ['Gatilhos', 'Ações', 'Lógica'];

export const NODES_DATA = [
  {
    type: 'trigger',
    label: 'Gatilho',
    description: 'Inicia o workflow quando um evento acontece.',
    category: 'Gatilhos',
    icon: Zap,
  },
  {
    type: 'action',
    label: 'Ação',
    description: 'Executa uma tarefa específica (ex: enviar email).',
    category: 'Ações',
    icon: Play,
  },
  {
    type: 'if',
    label: 'Condição (IF)',
    description: 'Divide o fluxo com base numa condição (se/senão).',
    category: 'Lógica',
    icon: GitBranch,
  },
];
