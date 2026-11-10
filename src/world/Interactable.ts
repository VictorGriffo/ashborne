import type * as THREE from 'three';
import type { Condition } from '../systems/conditions';
import type { Reward } from '../systems/Dialogue';
import type { Spawn } from './Area';
import type { Npc } from './Npc';

interface Base {
  /** Centro do objeto no chão (coordenadas do mundo). */
  position: THREE.Vector3;
  /** Raio do objeto; o alcance para interagir soma o raio do Ryben e uma folga. */
  radius: number;
  /** Só aparece quando as flags batem. */
  condition?: Condition;
}

/** Algo com que o Ryben interage apertando A / Enter. */
export type Interactable =
  | (Base & { kind: 'npc'; npc: Npc })
  | (Base & { kind: 'bau'; id: string; contents: Reward })
  | (Base & { kind: 'save'; id: string; name: string; spawn: Spawn })
  | (Base & { kind: 'examinar'; id: string; label: string; lines: string[]; marcar?: string[]; acao?: string });

/** Texto do aviso sobre o objeto. */
export function promptLabel(target: Interactable): string {
  switch (target.kind) {
    case 'npc':
      return 'Falar';
    case 'bau':
      return 'Abrir';
    case 'save':
      return 'Tocar no Aether';
    case 'examinar':
      return target.label;
  }
}

/** Altura do aviso acima do chão. */
export function promptHeight(target: Interactable): number {
  return target.kind === 'npc' ? 2.1 : target.kind === 'save' ? 1.9 : 1.3;
}

/** Flag de baú já aberto. */
export function chestFlag(id: string): string {
  return `bau-aberto:${id}`;
}
