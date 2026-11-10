import { el } from '../../ui/dom';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

/**
 * Escurece a tela, executa a troca (de área, por exemplo) e clareia de novo.
 * É a forma mais simples das "cutscenes para trocar de área" do design.
 */
export class TransitionState implements GameState {
  readonly name = 'Transição';
  readonly overlay = true;
  private readonly curtain: HTMLDivElement;
  private time = 0;
  private phase: 'out' | 'hold' | 'in' = 'out';

  constructor(
    private readonly ctx: GameContext,
    private readonly swap: () => void,
    private readonly duration = 0.35,
    private readonly holdTime = 0.12,
  ) {
    this.curtain = el('div', 'fade');
    this.curtain.style.opacity = '0';
  }

  enter(): void {
    this.ctx.ui.append(this.curtain);
  }

  exit(): void {
    this.curtain.remove();
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'out') {
      this.curtain.style.opacity = String(Math.min(1, this.time / this.duration));
      if (this.time >= this.duration) {
        this.swap();
        this.phase = 'hold';
        this.time = 0;
      }
    } else if (this.phase === 'hold') {
      if (this.time >= this.holdTime) {
        this.phase = 'in';
        this.time = 0;
      }
    } else {
      this.curtain.style.opacity = String(Math.max(0, 1 - this.time / this.duration));
      if (this.time >= this.duration) this.ctx.states.pop();
    }
  }
}
