/** Abaixo disso, o golpe erra. */
const MISS_BELOW = 0.1;

/**
 * Golpe do Lutar: um cursor atravessa a barra e o jogador aperta
 * confirmar quando ele passa pelo meio. Quanto mais perto, mais dano.
 */
export class FightBar {
  private time = 0;
  private stoppedAt?: number;

  /** @param duration segundos para o cursor atravessar a barra */
  constructor(private readonly duration: number) {}

  /** Posição do cursor, de 0 a 1. */
  get cursor(): number {
    return Math.min(1, (this.stoppedAt ?? this.time) / this.duration);
  }

  get done(): boolean {
    return this.stoppedAt !== undefined || this.time >= this.duration;
  }

  /** Precisão de 0 a 1, ou 0 se errou. Só faz sentido depois de `done`. */
  get accuracy(): number {
    if (this.stoppedAt === undefined) return 0;
    const a = 1 - Math.abs(this.cursor - 0.5) * 2;
    return a < MISS_BELOW ? 0 : a;
  }

  update(dt: number, confirm: boolean): void {
    if (this.done) return;
    if (confirm) {
      this.stoppedAt = this.time;
      return;
    }
    this.time += dt;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, clock: number): void {
    ctx.clearRect(0, 0, width, height);
    const pad = width * 0.06;
    const barW = width - pad * 2;
    const barH = Math.min(46, height * 0.42);
    const y = (height - barH) / 2;

    // Faixas: das bordas (fraco) ao meio (forte).
    const grad = ctx.createLinearGradient(pad, 0, pad + barW, 0);
    grad.addColorStop(0, 'rgba(22, 50, 74, 0.9)');
    grad.addColorStop(0.42, 'rgba(46, 125, 91, 0.9)');
    grad.addColorStop(0.5, 'rgba(127, 224, 208, 0.95)');
    grad.addColorStop(0.58, 'rgba(46, 125, 91, 0.9)');
    grad.addColorStop(1, 'rgba(22, 50, 74, 0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(pad, y, barW, barH);
    ctx.strokeStyle = 'rgba(230, 238, 247, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, y, barW, barH);

    // Marca do centro
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(pad + barW / 2 - 1, y - 6, 2, barH + 12);

    // Cursor: brasa vertical
    const x = pad + barW * this.cursor;
    const flash = this.stoppedAt !== undefined && Math.floor(clock * 14) % 2 === 0;
    ctx.fillStyle = flash ? '#ffffff' : '#e2704a';
    ctx.shadowColor = 'rgba(226, 112, 74, 0.9)';
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 3, y - 10, 6, barH + 20);
    ctx.shadowBlur = 0;
  }
}
