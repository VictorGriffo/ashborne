import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { TitleState } from './TitleState';

/** Menu de pausa, por cima da exploração. */
export class PauseState implements GameState {
  readonly name = 'Pausa';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly menu: MenuList;
  private closed = false;

  constructor(private readonly ctx: GameContext) {
    this.menu = new MenuList([
      { label: 'Continuar', action: () => this.close() },
      {
        label: 'Voltar ao título',
        action: () => {
          if (this.close()) ctx.states.push(new TitleState(ctx));
        },
      },
    ]);

    this.screen = el('div', 'screen pause-screen');
    const panel = el('div', 'panel');
    panel.append(el('h2', undefined, 'Pausado'), this.menu.el);
    this.screen.append(panel);
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
    this.menu.handle(input);
  }

  /** Sai da pausa uma única vez, mesmo com clique e tecla no mesmo passo. */
  private close(): boolean {
    if (this.closed) return false;
    this.closed = true;
    this.ctx.states.pop();
    return true;
  }
}
