import { el, fadeIn } from '../../ui/dom';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { TitleState } from './TitleState';

const TEXTS: Record<string, { linhas: string[]; titulo: string; aviso: string }> = {
  'parte-1': {
    linhas: [
      'O Coração de Aether se partiu.',
      'Os sete selos caíram, um a um, como estrelas apagando.',
      'A Rainha Elyen não sobreviveu àquela noite.',
      'E Ryben... desapareceu.',
      'Nove anos depois...',
    ],
    titulo: 'Fim da Parte 1',
    aviso: 'A Parte 2, Exílio, começa no próximo marco (M5).',
  },
};

/** Segundos entre uma linha e outra. */
const LINE_DELAY = 2.4;

/**
 * Tela de fim de parte: linhas aparecendo devagar sobre o preto,
 * depois o título e a volta para a tela inicial.
 */
export class EndOfPartState implements GameState {
  readonly name = 'Fim de parte';
  private readonly screen: HTMLDivElement;
  private readonly lines: HTMLParagraphElement[] = [];
  private readonly footer: HTMLDivElement;
  private time = 0;
  private shown = 0;
  private done = false;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    id: string,
  ) {
    const text = TEXTS[id] ?? TEXTS['parte-1'];
    this.screen = el('div', 'screen end-screen');
    const box = el('div', 'end-lines');
    for (const line of text.linhas) {
      const p = el('p', 'end-line', line);
      this.lines.push(p);
      box.append(p);
    }
    this.footer = el('div', 'end-footer');
    const button = el('button', 'prompt', 'Voltar ao título');
    button.type = 'button';
    button.tabIndex = -1;
    button.addEventListener('click', () => this.close());
    this.footer.append(el('h2', undefined, text.titulo), el('p', 'end-note', text.aviso), button);
    this.screen.append(box, this.footer);
    this.screen.addEventListener('click', () => ctx.input.trigger('confirm'));
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
    this.ctx.flags.set('parte-1-concluida');
  }

  exit(): void {
    this.screen.remove();
  }

  update(dt: number): void {
    this.time += dt;
    // Confirmar adianta a próxima linha.
    if (this.ctx.input.pressed('confirm')) {
      if (this.done) return this.close();
      this.time = this.shown * LINE_DELAY;
    }
    while (!this.done && this.time >= this.shown * LINE_DELAY + 0.6) {
      if (this.shown < this.lines.length) {
        this.lines[this.shown++].classList.add('visible');
      } else {
        this.footer.classList.add('visible');
        this.done = true;
      }
    }
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    // Volta ao título por cima de tudo; o título troca a pilha ao começar ou continuar.
    this.ctx.states.push(new TitleState(this.ctx));
  }
}
