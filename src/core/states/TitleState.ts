import { formatPlayTime, readSave, type SaveData } from '../../systems/SaveGame';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import { enterMobileFullscreen } from '../../ui/TouchControls';
import type { GameContext } from '../GameContext';
import { continueGame, startNewGame } from '../session';
import type { GameState } from '../StateMachine';

/**
 * Tela de título, por cima da exploração congelada ao fundo.
 * Sem save: "Toque para começar" / "Pressione Enter".
 * Com save: menu com Continuar e Novo jogo.
 * No celular, o primeiro toque também abre a tela cheia na horizontal.
 */
export class TitleState implements GameState {
  readonly name = 'Título';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly save: SaveData | null;
  private menu?: MenuList;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {
    this.save = readSave();
    this.screen = el('div', 'screen title-screen');
    this.screen.append(el('h1', undefined, 'Ashborne'), el('p', 'tagline', 'Renascido das cinzas'), el('div', 'ember'));

    if (this.save) {
      const s = this.save;
      const items: MenuItem[] = [
        { label: 'Continuar', action: () => this.go(() => continueGame(ctx, s)) },
        { label: 'Novo jogo', action: () => this.go(() => startNewGame(ctx)) },
      ];
      this.menu = new MenuList(items);
      this.menu.el.classList.add('title-menu');
      const info = el(
        'p',
        'title-save',
        `${s.lugar} · NV ${s.jogador.nivel} · ${formatPlayTime(s.jogador.tempoDeJogo)}`,
      );
      this.screen.append(this.menu.el, info);
    } else {
      const prompt = el('button', 'prompt');
      prompt.type = 'button';
      prompt.tabIndex = -1;
      prompt.append(el('span', 'only-keys', 'Pressione Enter'), el('span', 'only-touch', 'Toque para começar'));
      this.screen.append(prompt);
      this.screen.addEventListener('click', () => ctx.input.trigger('confirm'));
    }
    this.screen.append(el('p', 'build', 'Protótipo M3'));
    this.screen.addEventListener('mousedown', (e) => e.preventDefault());
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
    if (this.menu) {
      this.menu.handle(this.ctx.input);
    } else if (this.ctx.input.pressed('confirm')) {
      this.go(() => startNewGame(this.ctx));
    }
  }

  private go(start: () => void): void {
    if (this.leaving) return;
    this.leaving = true;
    start();
  }

  private onPointer = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') void enterMobileFullscreen();
  };
}
