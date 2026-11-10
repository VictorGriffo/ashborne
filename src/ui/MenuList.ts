import type { Input } from '../core/Input';
import { el } from './dom';

export interface MenuItem {
  label: string;
  action: () => void;
}

/**
 * Lista vertical de opções que funciona com teclado, controle, mouse e toque.
 * Vai servir de base para o menu Lutar, Agir, Item e Poupar no M2.
 */
export class MenuList {
  readonly el: HTMLUListElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private index = 0;

  constructor(private readonly items: MenuItem[]) {
    this.el = el('ul', 'menu');
    items.forEach((item, i) => {
      const button = el('button', undefined, item.label);
      button.type = 'button';
      button.tabIndex = -1;
      // Não deixa o botão ganhar foco: o teclado é lido pela classe Input.
      button.addEventListener('mousedown', (e) => e.preventDefault());
      button.addEventListener('pointerenter', () => this.select(i));
      button.addEventListener('click', () => {
        this.select(i);
        this.activate();
      });
      const li = el('li');
      li.append(button);
      this.el.append(li);
      this.buttons.push(button);
    });
    this.select(0);
  }

  /** Opção selecionada. */
  get selectedIndex(): number {
    return this.index;
  }

  /** Troca o texto de uma opção (ex.: "Dificuldade: Aventura"). */
  setLabel(i: number, label: string): void {
    const button = this.buttons[i];
    if (button) button.textContent = label;
  }

  /** Lê a entrada de um passo de lógica. */
  handle(input: Input): void {
    if (input.pressed('up')) this.select((this.index - 1 + this.items.length) % this.items.length);
    if (input.pressed('down')) this.select((this.index + 1) % this.items.length);
    if (input.pressed('confirm')) this.activate();
  }

  private select(i: number): void {
    this.buttons[this.index]?.classList.remove('selected');
    this.index = i;
    this.buttons[i]?.classList.add('selected');
  }

  private activate(): void {
    this.items[this.index]?.action();
  }
}
