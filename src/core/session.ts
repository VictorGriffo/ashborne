import { buildSave, writeSave, type SaveData } from '../systems/SaveGame';
import { areaName, START, START_PART_TWO } from '../world/areas';
import type { GameContext } from './GameContext';
import { ExploreState } from './states/ExploreState';

/**
 * Começa a Parte 2: o salto de nove anos. O Ryben volta no nível 8, sem as
 * magias, com a Capa do Exílio; o mundo é o mesmo, transformado. Salva sozinho
 * para o jogador poder continuar dali.
 */
export function startPartTwo(ctx: GameContext): void {
  ctx.player.startPartTwo();
  ctx.flags.set('parte-2');
  ctx.world.reset();
  ctx.states.resetTo(new ExploreState(ctx, START_PART_TWO));
  writeSave(
    buildSave(ctx, {
      area: START_PART_TWO.area,
      savePoint: START_PART_TWO.spawn,
      place: areaName(START_PART_TWO.area),
    }),
  );
}

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
