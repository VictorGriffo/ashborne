import { el, fadeIn, fadeOut } from '../../ui/dom';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

/**
 * Tela de título. Fica por cima da exploração, que aparece congelada ao fundo.
 * Enter, espaço, o botão A do controle ou um clique começam o jogo.
 */
export class TitleState implements GameState {
  readonly name = 'Título';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {
    this.screen = el('div', 'screen title-screen');
    const prompt = el('button', 'prompt', 'Pressione Enter');
    prompt.type = 'button';
    prompt.tabIndex = -1;
    this.screen.append(
      el('h1', undefined, 'Ashborne'),
      el('p', 'tagline', 'Renascido das cinzas'),
      el('div', 'ember'),
      prompt,
      el('p', 'build', 'Protótipo M0'),
    );
    this.screen.addEventListener('mousedown', (e) => e.preventDefault());
    this.screen.addEventListener('click', () => ctx.input.trigger('confirm'));
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen);
  }

  update(): void {
    if (this.leaving) return;
    if (this.ctx.input.pressed('confirm')) {
      this.leaving = true;
      this.ctx.states.pop();
    }
  }
}
