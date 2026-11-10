import type { SaveData } from '../systems/SaveGame';
import { START } from '../world/areas';
import type { GameContext } from './GameContext';
import { ExploreState } from './states/ExploreState';

/**
 * Começar e continuar um jogo. As duas funções são chamadas pela tela de
 * título, que está por cima da exploração: tiram o título e trocam a
 * exploração por uma nova, já com o estado certo.
 */
export function startNewGame(ctx: GameContext): void {
  ctx.player.reset();
  ctx.flags.reset();
  ctx.world.reset();
  ctx.states.pop();
  ctx.states.replace(new ExploreState(ctx, START));
}

export function continueGame(ctx: GameContext, save: SaveData): void {
  ctx.player.load(save.jogador);
  ctx.flags.load(save.flags);
  ctx.world.load(save.mundo);
  ctx.states.pop();
  ctx.states.replace(new ExploreState(ctx, { area: save.area, spawn: save.pontoDeSave }));
}
