import salaoDaGuarda from '../../data/areas/salao-da-guarda.json';
import type { Assets } from '../render/Assets';
import type { Area } from './Area';
import { characterModels } from './characters';
import { ClearingArea } from './ClearingArea';
import { RoomArea, type RoomData } from './RoomArea';

/** Salas descritas em JSON, por id. */
const ROOMS: Record<string, RoomData> = {
  'salao-da-guarda': salaoDaGuarda as RoomData,
};

/** Áreas feitas em código: nome e pontos de save, para o mapa e a viagem rápida. */
const CODE_AREAS: Record<string, { name: string; savePoints: Record<string, string> }> = {
  clareira: { name: 'Clareira do Altar', savePoints: { 'altar-da-clareira': 'Altar de Aether' } },
};

/** Onde um jogo novo começa. */
export const START = { area: 'salao-da-guarda', spawn: 'inicio' };

/** O personagem controlado pelo jogador. */
export const PLAYER_CHARACTER = 'ryben';

/** Todos os modelos que as áreas atuais e o jogador usam. */
export function requiredModels(): string[] {
  return [
    ...characterModels(PLAYER_CHARACTER),
    ...Object.values(ROOMS).flatMap((room) => RoomArea.requiredModels(room)),
  ];
}

/** Monta uma área pelo id. Os modelos precisam estar carregados. */
export function createArea(id: string, assets: Assets): Area {
  if (id === 'clareira') return new ClearingArea();
  const room = ROOMS[id];
  if (!room) throw new Error(`Área desconhecida: ${id}`);
  return new RoomArea(room, assets);
}

export function areaName(id: string): string {
  return ROOMS[id]?.nome ?? CODE_AREAS[id]?.name ?? id;
}

/** Todos os pontos de save do jogo: id → área e nome. */
export function allSavePoints(): Array<{ id: string; area: string; name: string }> {
  const list: Array<{ id: string; area: string; name: string }> = [];
  for (const [area, room] of Object.entries(ROOMS)) {
    for (const it of room.interativos ?? []) if (it.tipo === 'save') list.push({ id: it.id, area, name: it.nome });
  }
  for (const [area, info] of Object.entries(CODE_AREAS)) {
    for (const [id, name] of Object.entries(info.savePoints)) list.push({ id, area, name });
  }
  return list;
}

/** Área de um ponto de save. */
export function savePointArea(id: string): string | undefined {
  return allSavePoints().find((p) => p.id === id)?.area;
}
