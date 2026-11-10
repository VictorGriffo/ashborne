import type { DialogueChoice } from '../systems/Dialogue';
import { el, fadeIn, fadeOut } from './dom';
import { MenuList } from './MenuList';

/** Letras por segundo do efeito de máquina de escrever. */
const CHARS_PER_SECOND = 45;
/** Pausa extra depois de pontuação, em segundos. */
const PUNCTUATION_PAUSE: Record<string, number> = { '.': 0.18, '!': 0.18, '?': 0.18, ',': 0.08, '…': 0.25 };

/**
 * Caixa de diálogo na parte de baixo da tela: nome de quem fala,
 * texto aparecendo letra por letra e, quando há, as escolhas.
 */
export class DialogueBox {
  readonly el: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly textEl: HTMLParagraphElement;
  private readonly moreEl: HTMLDivElement;
  private readonly choicesEl: HTMLDivElement;

  private full = '';
  private shown = 0;
  private wait = 0;
  menu?: MenuList;

  constructor() {
    this.el = el('div', 'dialogue');
    this.nameEl = el('div', 'dialogue-name');
    this.textEl = el('p', 'dialogue-text');
    this.moreEl = el('div', 'dialogue-more');
    this.choicesEl = el('div', 'dialogue-choices');
    this.el.append(this.nameEl, this.textEl, this.choicesEl, this.moreEl);
  }

  show(parent: HTMLElement): void {
    fadeIn(parent, this.el);
  }

  hide(): void {
    fadeOut(this.el, 250);
  }

  /** Começa uma nova fala. */
  say(speaker: string, text: string): void {
    this.nameEl.textContent = speaker;
    this.full = text;
    this.shown = 0;
    this.wait = 0;
    this.textEl.textContent = '';
    this.clearChoices();
    this.moreEl.hidden = true;
  }

  /** A fala inteira já apareceu? */
  get finished(): boolean {
    return this.shown >= this.full.length;
  }

  /** Mostra o resto da fala de uma vez. */
  complete(): void {
    this.shown = this.full.length;
    this.textEl.textContent = this.full;
  }

  /** Avança o efeito de digitação. */
  update(dt: number): void {
    if (this.finished) {
      this.moreEl.hidden = this.menu !== undefined;
      return;
    }
    this.wait -= dt;
    while (this.wait <= 0 && !this.finished) {
      const ch = this.full[this.shown++];
      this.wait += 1 / CHARS_PER_SECOND + (PUNCTUATION_PAUSE[ch] ?? 0);
    }
    this.textEl.textContent = this.full.slice(0, this.shown);
  }

  /** Mostra as escolhas como um menu. */
  showChoices(choices: DialogueChoice[], onChoose: (index: number) => void): void {
    this.clearChoices();
    this.menu = new MenuList(choices.map((c, i) => ({ label: c.texto, action: () => onChoose(i) })));
    this.choicesEl.append(this.menu.el);
    this.moreEl.hidden = true;
  }

  private clearChoices(): void {
    this.menu = undefined;
    this.choicesEl.replaceChildren();
  }
}
