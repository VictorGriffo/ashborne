import type { Flags } from './Flags';
import type { PlayerSave, PlayerState } from './PlayerState';
import type { WorldSave, WorldState } from './WorldState';

/** Mude ao alterar o formato de um jeito incompatível. */
const VERSION = 1;
const KEY = 'ashborne.save';

/** Um jogo salvo. Fica no localStorage do navegador. */
export interface SaveData {
  versao: number;
  salvoEm: string;
  /** Área e ponto de save onde o jogo continua. */
  area: string;
  pontoDeSave: string;
  /** Nome legível do lugar, para a tela de título. */
  lugar: string;
  jogador: PlayerSave;
  flags: string[];
  mundo: WorldSave;
}

export function buildSave(
  parts: { player: PlayerState; flags: Flags; world: WorldState },
  where: { area: string; savePoint: string; place: string },
): SaveData {
  return {
    versao: VERSION,
    salvoEm: new Date().toISOString(),
    area: where.area,
    pontoDeSave: where.savePoint,
    lugar: where.place,
    jogador: parts.player.serialize(),
    flags: parts.flags.list(),
    mundo: parts.world.serialize(),
  };
}

/** Lê o save, ou null se não houver ou se estiver corrompido. */
export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.versao === VERSION ? data : null;
  } catch {
    return null;
  }
}

/** Grava o save. Devolve false se o navegador recusar (modo privado, sem espaço). */
export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** "1:05" ou "12:34:56" a partir de segundos. */
export function formatPlayTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
