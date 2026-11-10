import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { TitleState } from './TitleState';

export interface PauseOptions {
  /** Mostra "Voltar ao título" (escondido no meio de uma batalha). */
  canQuit: boolean;
}

/** Menu de pausa, por cima da exploração ou da batalha. */
export class PauseState implements GameState {
  readonly name = 'Pausa';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly summary: HTMLParagraphElement;
  private readonly menu: MenuList;
  private readonly difficultyIndex = 1;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    options: PauseOptions = { canQuit: true },
  ) {
    const items = [
      { label: 'Continuar', action: () => this.close() },
      { label: '', action: () => this.cycleDifficulty(1) },
    ];
    if (options.canQuit) {
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
    const note = el('p', 'pause-note', 'A dificuldade muda só as lutas, nunca a história nem os finais.');
    panel.append(el('h2', undefined, 'Pausado'), this.summary, this.menu.el, note);
    this.screen.append(panel);
    this.refresh();
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen, 200);
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
    this.summary.textContent = `Ryben · NV ${p.level} · Vida ${p.hp}/${p.maxHp} · Laços ${p.lacos} · XP ${p.xp} · Brasas ${p.brasas}`;
  }

  /** Sai da pausa uma única vez, mesmo com clique e tecla no mesmo passo. */
  private close(): boolean {
    if (this.closed) return false;
    this.closed = true;
    this.ctx.states.pop();
    return true;
  }
}
