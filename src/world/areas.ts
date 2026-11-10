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

/** Onde o jogo começa. */
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
