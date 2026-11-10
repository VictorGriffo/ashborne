import type { SaveData } from '../systems/SaveGame';
import { START } from '../world/areas';
import type { GameContext } from './GameContext';
import { ExploreState } from './states/ExploreState';

/**
 * Começar e continuar um jogo. Chamadas pela tela de título: esvaziam a
 * pilha de estados (título, exploração antiga, cenas) e abrem uma
 * exploração nova, já com o estado certo.
 */
export function startNewGame(ctx: GameContext): void {
  ctx.player.reset();
  ctx.flags.reset();
  ctx.world.reset();
  ctx.states.resetTo(new ExploreState(ctx, START));
}

export function continueGame(ctx: GameContext, save: SaveData): void {
  ctx.player.load(save.jogador);
  ctx.flags.load(save.flags);
  ctx.world.load(save.mundo);
  ctx.states.resetTo(new ExploreState(ctx, { area: save.area, spawn: save.pontoDeSave }));
}
