import { el, fadeIn, fadeOut } from '../../ui/dom';
import { enterMobileFullscreen } from '../../ui/TouchControls';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

/**
 * Tela de título. Fica por cima da exploração, que aparece congelada ao fundo.
 * Enter, espaço, o botão A, um clique ou um toque começam o jogo.
 * No celular, o primeiro toque também abre a tela cheia na horizontal.
 */
export class TitleState implements GameState {
  readonly name = 'Título';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {
    this.screen = el('div', 'screen title-screen');
    const prompt = el('button', 'prompt');
    prompt.type = 'button';
    prompt.tabIndex = -1;
    prompt.append(el('span', 'only-keys', 'Pressione Enter'), el('span', 'only-touch', 'Toque para começar'));
    this.screen.append(
      el('h1', undefined, 'Ashborne'),
      el('p', 'tagline', 'Renascido das cinzas'),
      el('div', 'ember'),
      prompt,
      el('p', 'build', 'Protótipo M2'),
    );
    this.screen.addEventListener('mousedown', (e) => e.preventDefault());
    this.screen.addEventListener('click', () => ctx.input.trigger('confirm'));
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
    // Captura: o toque no botão A também conta, mesmo ele parando a propagação.
    window.addEventListener('pointerdown', this.onPointer, true);
  }

  exit(): void {
    window.removeEventListener('pointerdown', this.onPointer, true);
    fadeOut(this.screen);
  }

  update(): void {
    if (this.leaving) return;
    if (this.ctx.input.pressed('confirm')) {
      this.leaving = true;
      this.ctx.states.pop();
    }
  }

  private onPointer = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') void enterMobileFullscreen();
  };
}
