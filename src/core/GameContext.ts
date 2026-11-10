import type config from '../../data/config.json';
import type { Assets } from '../render/Assets';
import type { Renderer } from '../render/Renderer';
import type { Flags } from '../systems/Flags';
import type { PlayerState } from '../systems/PlayerState';
import type { WorldState } from '../systems/WorldState';
import type { DebugHud } from '../ui/DebugHud';
import type { Input } from './Input';
import type { StateMachine } from './StateMachine';

export type GameConfig = typeof config;

/** O que todo estado recebe para conversar com o resto do jogo. */
export interface GameContext {
  readonly config: GameConfig;
  readonly renderer: Renderer;
  readonly input: Input;
  readonly states: StateMachine;
  readonly assets: Assets;
  /** Marcadores de progresso da história. */
  readonly flags: Flags;
  /** Vida, nível, inventário, Laços, experiência, Brasas e dificuldade. */
  readonly player: PlayerState;
  /** Áreas descobertas, pontos de save visitados e estado dos mobs. */
  readonly world: WorldState;
  /** Camada HTML por cima do canvas, para menus e textos. */
  readonly ui: HTMLElement;
  readonly debug: DebugHud;
  /** Aviso curto no alto da tela. */
  toast(text: string): void;
}
