import { el } from './dom';

/**
 * Painel de depuração (F3): FPS, pilha de estados e o que mais for registrado.
 * Aparece sozinho no modo de desenvolvimento.
 */
export class DebugHud {
  private readonly root: HTMLDivElement;
  private readonly fields = new Map<string, string>();
  private frames = 0;
  private elapsed = 0;
  private fps = 0;

  constructor(parent: HTMLElement, visible: boolean) {
    this.root = el('div', 'debug-hud');
    this.root.hidden = !visible;
    parent.append(this.root);
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;
  }

  set(label: string, value: string): void {
    this.fields.set(label, value);
  }

  /** Chamado uma vez por quadro. Atualiza o texto 4 vezes por segundo. */
  frame(frameDt: number): void {
    this.frames++;
    this.elapsed += frameDt;
    if (this.elapsed < 0.25) return;
    this.fps = Math.round(this.frames / this.elapsed);
    this.frames = 0;
    this.elapsed = 0;
    if (this.root.hidden) return;

    const lines = [`FPS      ${this.fps}`];
    for (const [label, value] of this.fields) lines.push(`${label.padEnd(8)} ${value}`);
    this.root.textContent = lines.join('\n');
  }
}
