/**
 * Game loop com passo fixo.
 *
 * A lógica (update) roda sempre com o mesmo dt, o que deixa movimento,
 * colisão e, mais tarde, os padrões de ataque iguais em qualquer monitor.
 * O desenho (render) roda uma vez por quadro e recebe `alpha`, a fração
 * do passo seguinte, para interpolar posições e evitar tremidas em telas
 * de 120 Hz ou mais.
 */
export interface LoopCallbacks {
  /** Lógica do jogo. `dt` é sempre o passo fixo, em segundos. */
  update(dt: number): void;
  /** Desenho. `alpha` vai de 0 a 1; `frameDt` é o tempo real do quadro. */
  render(alpha: number, frameDt: number): void;
}

export class GameLoop {
  readonly step: number;
  private accumulator = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  /**
   * @param hz passos de lógica por segundo
   * @param maxFrame maior intervalo aceito entre quadros, em segundos.
   *   Evita a "espiral da morte" quando a aba volta depois de um tempo parada.
   */
  constructor(
    private readonly callbacks: LoopCallbacks,
    hz = 60,
    private readonly maxFrame = 0.25,
  ) {
    this.step = 1 / hz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const frameDt = Math.min((now - this.last) / 1000, this.maxFrame);
    this.last = now;
    this.accumulator += frameDt;

    while (this.accumulator >= this.step) {
      this.callbacks.update(this.step);
      this.accumulator -= this.step;
    }

    this.callbacks.render(this.accumulator / this.step, frameDt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
