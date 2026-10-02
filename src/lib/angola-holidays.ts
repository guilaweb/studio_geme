/**
 * Calendário Oficial de Feriados Nacionais da República de Angola
 * Lei dos Feriados Nacionais e Datas de Celebração Nacional
 */

export interface AngolaHoliday {
  day: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  name: string;
  description: string;
}

export const ANGOLA_FIXED_HOLIDAYS: AngolaHoliday[] = [
  { day: 1, month: 0, name: 'Ano Novo', description: 'Celebração Universal do Ano Novo' },
  { day: 4, month: 1, name: 'Início da Luta Armada', description: 'Dia do Início da Luta Armada de Libertação Nacional (1961)' },
  { day: 8, month: 2, name: 'Dia da Mulher', description: 'Dia Internacional da Mulher' },
  { day: 4, month: 3, name: 'Dia da Paz', description: 'Dia da Paz e da Reconciliação Nacional (Acordos de Paz de 2002)' },
  { day: 1, month: 4, name: 'Dia do Trabalhador', description: 'Dia Mundial do Trabalhador' },
  { day: 17, month: 8, name: 'Dia do Herói Nacional', description: 'Dia do Fundador da Nação e do Herói Nacional (Dr. António Agostinho Neto)' },
  { day: 2, month: 10, name: 'Dia de Finados', description: 'Dia dos Finados' },
  { day: 11, month: 10, name: 'Independência Nacional', description: 'Dia da Proclamação da Independência Nacional (1975)' },
  { day: 25, month: 11, name: 'Natal e Família', description: 'Dia de Natal e da Família' },
];

/**
 * Verifica se uma data específica corresponde a um feriado oficial em Angola.
 */
export function getAngolaHoliday(date: Date): { name: string; description: string } | null {
  const d = date.getDate();
  const m = date.getMonth();

  const holiday = ANGOLA_FIXED_HOLIDAYS.find((h) => h.day === d && h.month === m);
  if (holiday) {
    return { name: holiday.name, description: holiday.description };
  }

  return null;
}

/**
 * Retorna true se a data for um feriado oficial em Angola.
 */
export function isAngolaHoliday(date: Date): boolean {
  return getAngolaHoliday(date) !== null;
}

/**
 * Retorna true se o dia for útil para obras (exclui domingo e feriados oficiais).
 * Em obras de construção e mineração em Angola, o sábado frequentemente conta como meio-dia ou dia útil de turno.
 */
export function isWorkingDay(date: Date, includeSaturday = true): boolean {
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0) return false;
  if (!includeSaturday && dayOfWeek === 6) return false;
  return !isAngolaHoliday(date);
}
