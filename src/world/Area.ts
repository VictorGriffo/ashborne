import type * as THREE from 'three';
import type { Condition } from '../systems/conditions';
import type { CollisionWorld } from './Collision';
import type { Interactable } from './Interactable';
import type { MapEnemy } from './MapEnemy';
import type { Npc } from './Npc';

/** Ponto de chegada numa área. `yaw` em radianos (0 = olhando para a câmera). */
export interface Spawn {
  x: number;
  z: number;
  yaw: number;
}

/** Região que leva a outra área quando o jogador entra nela. */
export interface Exit {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  to: string;
  spawn: string;
  /** Saída fechada até a condição valer; mostra a mensagem e devolve o Ryben. */
  lock?: Condition & { mensagem: string };
}

/** Uma área jogável: sala, clareira, mais tarde vila e territórios. */
export interface Area {
  readonly id: string;
  readonly name: string;
  /** Tudo o que a área desenha, incluindo as próprias luzes. */
  readonly root: THREE.Object3D;
  readonly collision: CollisionWorld;
  readonly spawns: Record<string, Spawn>;
  readonly exits: Exit[];
  readonly npcs: Npc[];
  /** Mobs visíveis no mapa. */
  readonly enemies: MapEnemy[];
  /** NPCs, baús e pontos de save. */
  readonly interactables: Interactable[];

  /** Efeito visual de quando o Ryben toca um ponto de save. */
  activateSavePoint?(id: string): void;

  /** Fundo e névoa da cena. */
  applyEnvironment(scene: THREE.Scene): void;
  /** Efeitos de cena (eclipse, clarão...), pedidos por uma cutscene. */
  cutsceneEvent?(name: string): void;
  /** Ajustes visuais durante uma batalha (ex.: árvores transparentes). */
  setBattleMode?(on: boolean): void;
  /** Animações só visuais (luzes, partículas, NPCs). */
  animate(dt: number, focus: THREE.Vector3): void;
}

/** Descobre a saída em que a posição está, se houver. */
export function exitAt(area: Area, x: number, z: number): Exit | undefined {
  return area.exits.find((e) => x >= e.minX && x <= e.maxX && z >= e.minZ && z <= e.maxZ);
}
