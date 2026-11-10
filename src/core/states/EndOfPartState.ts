import { el, fadeIn } from '../../ui/dom';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { startPartTwo } from '../session';
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
    aviso: 'Parte 2: Exílio',
  },
  'final-cinzas': {
    linhas: [
      'O Coração de Aether foi selado.',
      'Os sete selos brilham no céu, e a magia antiga dorme de novo.',
      'Ryben se tornou cinzas. Aetheria se tornou aurora.',
      'Dizem que, nas manhãs claras, o vento tem o riso de um garoto de quinze anos.',
    ],
    titulo: 'Final: Cinzas',
    aviso: 'Obrigado por jogar Ashborne. Há outro final, onde Ryben vive.',
  },
  'final-renascido': {
    linhas: [
      'O Coração de Aether foi selado, e Ryben sobreviveu.',
      'Os sete selos e os Laços de uma vida seguraram o que sozinho ele não aguentaria.',
      'A vila foi reconstruída, e Aetheria ensinou as cinzas a florir.',
      'Ryben, renascido, ainda deve cinco Brasas ao Kael.',
    ],
    titulo: 'Final: Renascido',
    aviso: 'Obrigado por jogar Ashborne. Você encontrou o final mais raro.',
  },
  'final-ruina': {
    linhas: [
      'O Coração de Aether se abriu nas mãos de Vaelor.',
      'A magia antiga se espalhou, sem selos, sem dono, sem piedade.',
      'Ninguém ficou ao lado de Ryben quando mais precisou.',
      'Aetheria aprendeu o nome do medo.',
    ],
    titulo: 'Final: Ruína',
    aviso: 'Obrigado por jogar Ashborne. Vale a pena criar mais Laços e tentar de novo.',
  },
};

const FINAIS = new Set(['final-cinzas', 'final-renascido', 'final-ruina']);

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
    private readonly id: string,
  ) {
    const text = TEXTS[this.id] ?? TEXTS['parte-1'];
    this.screen = el('div', 'screen end-screen');
    const box = el('div', 'end-lines');
    for (const line of text.linhas) {
      const p = el('p', 'end-line', line);
      this.lines.push(p);
      box.append(p);
    }
    this.footer = el('div', 'end-footer');
    const button = el('button', 'prompt', 'Continuar');
    button.type = 'button';
    button.tabIndex = -1;
    button.addEventListener('click', () => this.close());
    this.footer.append(el('h2', undefined, text.titulo), el('p', 'end-note', text.aviso), button);
    this.screen.append(box, this.footer);
    this.screen.addEventListener('click', () => ctx.input.trigger('confirm'));
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
    if (!FINAIS.has(this.id)) this.ctx.flags.set('parte-1-concluida');
    else this.ctx.flags.set(this.id);
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
    // Depois de um final, volta ao título; depois da Parte 1, a Parte 2 começa com o jogo salvo.
    if (FINAIS.has(this.id)) this.ctx.states.resetTo(new TitleState(this.ctx));
    else startPartTwo(this.ctx);
  }
}
