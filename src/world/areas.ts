import camposDeLinne from '../../data/areas/campos-de-linne.json';
import estrada from '../../data/areas/estrada.json';
import patio from '../../data/areas/patio.json';
import salaoDaGuarda from '../../data/areas/salao-da-guarda.json';
import santuario from '../../data/areas/santuario.json';
import vila from '../../data/areas/vila.json';
import vilaRuinas from '../../data/areas/vila-ruinas.json';
import type { Assets } from '../render/Assets';
import type { Area } from './Area';
import { characterModels } from './characters';
import { ClearingArea } from './ClearingArea';
import { OutdoorArea, type OutdoorData } from './OutdoorArea';
import { RoomArea, type RoomData } from './RoomArea';

/** Salas montadas com peças do kit KayKit. */
const ROOMS: Record<string, RoomData> = {
  'salao-da-guarda': salaoDaGuarda as RoomData,
};

/** Áreas ao ar livre descritas em JSON. */
const OUTDOORS: Record<string, OutdoorData> = {
  vila: vila as unknown as OutdoorData,
  patio: patio as unknown as OutdoorData,
  estrada: estrada as unknown as OutdoorData,
  santuario: santuario as unknown as OutdoorData,
  'vila-ruinas': vilaRuinas as unknown as OutdoorData,
  'campos-de-linne': camposDeLinne as unknown as OutdoorData,
};

/** Áreas feitas em código: nome e pontos de save, para o mapa e a viagem rápida. */
const CODE_AREAS: Record<string, { name: string; savePoints: Record<string, string> }> = {
  clareira: { name: 'Clareira do Altar', savePoints: { 'altar-da-clareira': 'Altar de Aether' } },
};

/** Onde um jogo novo começa: na porta de casa, com a Maren. */
export const START = { area: 'vila', spawn: 'casa' };

/** Onde a Parte 2 começa: na estrada, diante da vila em ruínas. */
export const START_PART_TWO = { area: 'vila-ruinas', spawn: 'chegada', cena: 'salto' };

/** Para onde o Ryben é levado quando perde uma batalha (por parte). */
export const RESCUE = { area: 'salao-da-guarda', spawn: 'inicio' };
export const RESCUE_PART_TWO = { area: 'vila-ruinas', spawn: 'acampamento' };

/** O personagem controlado pelo jogador. */
export const PLAYER_CHARACTER = 'ryben';

/** Todos os modelos que as áreas e o jogador usam. */
export function requiredModels(): string[] {
  return [
    ...characterModels(PLAYER_CHARACTER),
    ...Object.values(ROOMS).flatMap((room) => RoomArea.requiredModels(room)),
    ...Object.values(OUTDOORS).flatMap((area) => OutdoorArea.requiredModels(area)),
  ];
}

/** Monta uma área pelo id. Os modelos precisam estar carregados. */
export function createArea(id: string, assets: Assets): Area {
  if (id === 'clareira') return new ClearingArea();
  if (ROOMS[id]) return new RoomArea(ROOMS[id], assets);
  if (OUTDOORS[id]) return new OutdoorArea(OUTDOORS[id], assets);
  throw new Error(`Área desconhecida: ${id}`);
}

export function areaName(id: string): string {
  return ROOMS[id]?.nome ?? OUTDOORS[id]?.nome ?? CODE_AREAS[id]?.name ?? id;
}

/** Todos os pontos de save do jogo: id → área e nome. */
export function allSavePoints(): Array<{ id: string; area: string; name: string }> {
  const list: Array<{ id: string; area: string; name: string }> = [];
  const fromJson = (area: string, items: Array<{ tipo: string; id: string; nome?: string }> | undefined) => {
    for (const it of items ?? []) if (it.tipo === 'save') list.push({ id: it.id, area, name: it.nome ?? it.id });
  };
  for (const [area, room] of Object.entries(ROOMS)) fromJson(area, room.interativos);
  for (const [area, data] of Object.entries(OUTDOORS)) fromJson(area, data.interativos);
  for (const [area, info] of Object.entries(CODE_AREAS)) {
    for (const [id, name] of Object.entries(info.savePoints)) list.push({ id, area, name });
  }
  return list;
}

/** Área de um ponto de save. */
export function savePointArea(id: string): string | undefined {
  return allSavePoints().find((p) => p.id === id)?.area;
}
