/**
 * Gerador pseudoaleatório com semente (mulberry32).
 * A mesma semente gera sempre o mesmo cenário, o que facilita testar.
 */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número entre `min` e `max`. */
export function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}
