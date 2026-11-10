import { el } from './dom';

const SHOW_MS = 2600;
const FADE_MS = 300;

/**
 * Aviso curto no alto da tela ("Recebido: 2× Erva-lume", "Missão atualizada").
 * Vários avisos seguidos entram em fila.
 */
export class Toast {
  private readonly root: HTMLDivElement;
  private readonly queue: string[] = [];
  private busy = false;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'toast-area');
    parent.append(this.root);
  }

  show(text: string): void {
    this.queue.push(text);
    if (!this.busy) this.next();
  }

  private next(): void {
    const text = this.queue.shift();
    if (text === undefined) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const item = el('div', 'toast', text);
    this.root.append(item);
    void item.offsetWidth;
    item.classList.add('visible');
    window.setTimeout(() => {
      item.classList.remove('visible');
      window.setTimeout(() => {
        item.remove();
        this.next();
      }, FADE_MS);
    }, SHOW_MS);
  }
}
