import type { DialogueChoice } from '../systems/Dialogue';
import { el, fadeIn, fadeOut } from './dom';
import { MenuList } from './MenuList';
import { Typewriter } from './Typewriter';

/**
 * Caixa de diálogo na parte de baixo da tela: nome de quem fala,
 * texto aparecendo letra por letra e, quando há, as escolhas.
 */
export class DialogueBox {
  readonly el: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly moreEl: HTMLDivElement;
  private readonly choicesEl: HTMLDivElement;
  private readonly writer: Typewriter;
  menu?: MenuList;

  /** @param onTap chamado ao clicar ou tocar na caixa, fora das escolhas */
  constructor(onTap: () => void) {
    this.el = el('div', 'dialogue');
    this.el.addEventListener('mousedown', (e) => e.preventDefault());
    this.el.addEventListener('click', () => {
      // Com escolhas na tela, só um clique numa opção conta (o menu cuida disso).
      if (!this.menu) onTap();
    });
    this.nameEl = el('div', 'dialogue-name');
    const textEl = el('p', 'dialogue-text');
    this.moreEl = el('div', 'dialogue-more');
    this.choicesEl = el('div', 'dialogue-choices');
    this.el.append(this.nameEl, textEl, this.choicesEl, this.moreEl);
    this.writer = new Typewriter(textEl);
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
    this.writer.set(text);
    this.clearChoices();
    this.moreEl.hidden = true;
  }

  /** A fala inteira já apareceu? */
  get finished(): boolean {
    return this.writer.finished;
  }

  /** Mostra o resto da fala de uma vez. */
  complete(): void {
    this.writer.complete();
  }

  /** Avança o efeito de digitação. */
  update(dt: number): void {
    this.writer.update(dt);
    this.moreEl.hidden = !this.writer.finished || this.menu !== undefined;
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
