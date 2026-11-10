import { activeQuest } from '../../systems/Quests';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { InventoryState } from './InventoryState';
import { MapState } from './MapState';
import { TitleState } from './TitleState';

export interface PauseOptions {
  /**
   * Área atual. Com ela, o menu mostra Bolsa, Mapa e "Voltar ao título".
   * Sem ela (no meio de uma batalha), só Continuar e Dificuldade.
   */
  area?: string;
}

/** Menu de pausa, por cima da exploração ou da batalha. */
export class PauseState implements GameState {
  readonly name = 'Pausa';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly summary: HTMLParagraphElement;
  private readonly menu: MenuList;
  private readonly difficultyIndex: number;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    options: PauseOptions = {},
  ) {
    const items: MenuItem[] = [{ label: 'Continuar', action: () => this.close() }];
    const area = options.area;
    if (area) {
      items.push(
        { label: 'Bolsa', action: () => ctx.states.push(new InventoryState(ctx)) },
        { label: 'Mapa', action: () => ctx.states.push(new MapState(ctx, area)) },
      );
    }
    this.difficultyIndex = items.length;
    items.push({ label: '', action: () => this.cycleDifficulty(1) });
    if (area) {
      items.push({
        label: 'Voltar ao título',
        action: () => {
          if (this.close()) ctx.states.push(new TitleState(ctx));
        },
      });
    }
    this.menu = new MenuList(items);

    this.screen = el('div', 'screen pause-screen');
    const panel = el('div', 'panel');
    this.summary = el('p', 'pause-summary');
    const quest = activeQuest(ctx.flags);
    const objective = el('p', 'pause-objective', quest ? `✦ ${quest.step.texto}` : '');
    const note = el('p', 'pause-note', 'A dificuldade muda só as lutas, nunca a história nem os finais.');
    panel.append(el('h2', undefined, 'Pausado'), this.summary, objective, this.menu.el, note);
    this.screen.append(panel);
    this.refresh();
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen, 200);
  }

  /** Volta da Bolsa: a vida pode ter mudado. */
  resume(): void {
    this.refresh();
  }

  update(): void {
    const input = this.ctx.input;
    if (input.pressed('pause') || input.pressed('cancel')) {
      this.close();
      return;
    }
    if (this.menu.selectedIndex === this.difficultyIndex) {
      if (input.pressed('left')) this.cycleDifficulty(-1);
      if (input.pressed('right')) this.cycleDifficulty(1);
    }
    this.menu.handle(input);
  }

  private cycleDifficulty(step: number): void {
    this.ctx.player.cycleDifficulty(step);
    this.refresh();
  }

  private refresh(): void {
    const p = this.ctx.player;
    this.menu.setLabel(this.difficultyIndex, `Dificuldade: ‹ ${p.difficulty.nome} ›`);
    this.summary.textContent = `Ryben · NV ${p.level} · Vida ${p.hp}/${p.maxHp} · Laços ${p.lacos} · Brasas ${p.brasas}`;
  }

  /** Sai da pausa uma única vez, mesmo com clique e tecla no mesmo passo. */
  private close(): boolean {
    if (this.closed) return false;
    this.closed = true;
    this.ctx.states.pop();
    return true;
  }
}
