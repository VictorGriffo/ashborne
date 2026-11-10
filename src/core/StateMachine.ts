/**
 * Máquina de estados em pilha.
 *
 * Só o estado do topo recebe `update`. Estados marcados como `overlay`
 * (título, pausa, mais tarde a batalha) deixam o estado de baixo continuar
 * sendo desenhado: a exploração aparece congelada atrás do menu de pausa.
 *
 * Trocas pedidas durante um `update` só acontecem no fim dele, para nenhum
 * estado sair da pilha no meio da própria lógica.
 */
export interface GameState {
  /** Nome legível, usado na depuração. */
  readonly name: string;
  /** Se true, o estado de baixo também é desenhado. */
  readonly overlay?: boolean;

  /** Entrou na pilha. */
  enter?(): void;
  /** Saiu da pilha. */
  exit?(): void;
  /** Outro estado foi empilhado por cima. */
  pause?(): void;
  /** Voltou a ser o topo. */
  resume?(): void;
  /** A janela perdeu o foco enquanto este estado era o topo. */
  focusLost?(): void;

  update(dt: number): void;
  render?(alpha: number, frameDt: number): void;
}

export class StateMachine {
  private readonly stack: GameState[] = [];
  private readonly queue: Array<() => void> = [];
  private updating = false;

  get top(): GameState | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Nomes da pilha, de baixo para cima. */
  names(): string[] {
    return this.stack.map((s) => s.name);
  }

  push(state: GameState): void {
    this.schedule(() => {
      this.top?.pause?.();
      this.stack.push(state);
      state.enter?.();
    });
  }

  pop(): void {
    this.schedule(() => {
      const leaving = this.stack.pop();
      leaving?.exit?.();
      this.top?.resume?.();
    });
  }

  /** Troca o topo por outro estado, sem acordar o de baixo. */
  replace(state: GameState): void {
    this.schedule(() => {
      const leaving = this.stack.pop();
      leaving?.exit?.();
      this.stack.push(state);
      state.enter?.();
    });
  }

  update(dt: number): void {
    this.updating = true;
    try {
      this.top?.update(dt);
    } finally {
      this.updating = false;
      this.flush();
    }
  }

  render(alpha: number, frameDt: number): void {
    let first = this.stack.length - 1;
    while (first > 0 && this.stack[first].overlay) first--;
    for (let i = Math.max(first, 0); i < this.stack.length; i++) {
      this.stack[i].render?.(alpha, frameDt);
    }
  }

  focusLost(): void {
    this.schedule(() => this.top?.focusLost?.());
  }

  private schedule(action: () => void): void {
    if (this.updating) this.queue.push(action);
    else action();
  }

  private flush(): void {
    while (this.queue.length > 0) this.queue.shift()!();
  }
}
