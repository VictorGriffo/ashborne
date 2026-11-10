import type { Flags } from './Flags';

/**
 * Condição por flags, usada nos JSON:
 *   "se": "flag" ou ["a", "b"]      → todas precisam estar marcadas
 *   "naoSe": "flag" ou ["a", "b"]   → nenhuma pode estar marcada
 */
export interface Condition {
  se?: string | string[];
  naoSe?: string | string[];
}

const asList = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function check(flags: Flags, c: Condition | undefined): boolean {
  if (!c) return true;
  return asList(c.se).every((f) => flags.has(f)) && !asList(c.naoSe).some((f) => flags.has(f));
}

/** Todas as flags de uma lista (ou uma só) estão marcadas? */
export function allSet(flags: Flags, v: string | string[]): boolean {
  return asList(v).every((f) => flags.has(f));
}
