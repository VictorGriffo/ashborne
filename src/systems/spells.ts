import magias from '../../data/magias.json';

export type SpellEffect = 'escudo' | 'cura-gradual' | 'veu' | 'dano' | 'lentidao' | 'calma';

/** Formato de data/magias.json. */
export interface SpellData {
  nome: string;
  /** Número do selo que concede a magia. */
  selo: number;
  elemento: string;
  custo: number;
  efeito: SpellEffect;
  valor: number;
  turnos?: number;
  descricao: string;
  texto: string;
}

export const SPELLS = Object.fromEntries(Object.entries(magias).filter(([id]) => !id.startsWith('_'))) as Record<
  string,
  SpellData
>;

export function spell(id: string): SpellData {
  const data = SPELLS[id];
  if (!data) throw new Error(`Magia não encontrada em magias.json: ${id}`);
  return data;
}

/** Flag marcada quando um selo é restaurado. */
export function sealFlag(n: number): string {
  return `selo-${n}`;
}

/** Magias que o Ryben conhece, pelos selos restaurados. */
export function knownSpells(hasFlag: (flag: string) => boolean): string[] {
  return Object.entries(SPELLS)
    .filter(([, s]) => hasFlag(sealFlag(s.selo)))
    .sort((a, b) => a[1].selo - b[1].selo)
    .map(([id]) => id);
}
