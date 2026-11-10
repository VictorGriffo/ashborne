import personagens from '../../data/personagens.json';
import type { CharacterData } from '../render/CharacterModel';

/** Personagens de data/personagens.json, por id. */
export const CHARACTERS = personagens as Record<string, CharacterData>;

export function character(id: string): CharacterData {
  const data = CHARACTERS[id];
  if (!data) throw new Error(`Personagem não encontrado em personagens.json: ${id}`);
  return data;
}

/** Modelos que precisam estar carregados para montar um personagem. */
export function characterModels(id: string): string[] {
  const data = character(id);
  return [data.modelo, ...(data.itens ?? []).map((i) => i.modelo)];
}
