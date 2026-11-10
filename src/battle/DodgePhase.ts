import type { Vec2 } from '../core/Input';
import type { PatternData, WaveData } from './data';

/** Projétil da fase de desvio, em unidades lógicas da caixa. */
interface Bullet {
  /** Posição sem o balanço lateral. */
  baseX: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  sway: number;
  phase: number;
  age: number;
  lilac: boolean;
}

export interface DodgeOptions {
  /** Multiplicador de velocidade (dificuldade, ataque surpresa). */
  speed: number;
  soulSpeed: number;
  soulRadius: number;
  invulnerable: number;
  rand: () => number;
}

/** Tempo para a caixa mudar de forma antes dos projéteis começarem. */
const WARMUP = 0.45;
/** Margem fora da caixa em que o projétil ainda existe. */
const MARGIN = 24;
/** Tamanho do desenho da brasa em relação ao raio de acerto. */
const SOUL_DRAW_SIZE = 1.9;

/**
 * Turno do inimigo: o jogador controla a brasa dentro de uma caixa e
 * desvia dos projéteis. Lógica em passo fixo; o desenho é separado.
 * Coordenadas lógicas: (0, 0) no canto de cima, y cresce para baixo.
 */
export class DodgePhase {
  readonly width: number;
  readonly height: number;
  readonly soul: { x: number; y: number };
  private readonly bullets: Bullet[] = [];
  private readonly nextSpawn: number[];
  private time = -WARMUP;
  private invulnerable = 0;

  constructor(
    readonly pattern: PatternData,
    private readonly opts: DodgeOptions,
  ) {
    [this.width, this.height] = pattern.caixa;
    this.soul = { x: this.width / 2, y: this.height * 0.7 };
    this.nextSpawn = pattern.ondas.map((w) => w.de);
  }

  get finished(): boolean {
    return this.time >= this.pattern.duracao;
  }

  /** Fração do turno que já passou, de 0 a 1. */
  get progress(): number {
    return Math.max(0, this.time) / this.pattern.duracao;
  }

  /** Avança um passo. Devolve true se a brasa foi atingida. */
  update(dt: number, move: Vec2): boolean {
    this.time += dt;
    const { soulSpeed, soulRadius } = this.opts;
    const s = this.soul;
    // O desenho da brasa é maior que a área de acerto; a margem usa o desenho.
    const margin = soulRadius * SOUL_DRAW_SIZE;
    s.x = clamp(s.x + move.x * soulSpeed * dt, margin, this.width - margin);
    s.y = clamp(s.y - move.y * soulSpeed * dt, margin * 1.3, this.height - margin);

    if (this.time >= 0) this.spawnWaves();

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.baseX += b.vx * dt;
      b.y += b.vy * dt;
      b.x = b.baseX + Math.sin(b.age * 2.4 + b.phase) * b.sway;
      const out =
        b.x < -MARGIN || b.x > this.width + MARGIN || b.y < -MARGIN * 2 || b.y > this.height + MARGIN;
      if (out) this.bullets.splice(i, 1);
    }

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
      return false;
    }
    for (const b of this.bullets) {
      const dx = b.x - s.x;
      const dy = b.y - s.y;
      const r = b.r + soulRadius;
      if (dx * dx + dy * dy < r * r) {
        this.invulnerable = this.opts.invulnerable;
        return true;
      }
    }
    return false;
  }

  /** Desenha a caixa. `scale` converte unidades lógicas em pixels do canvas. */
  draw(ctx: CanvasRenderingContext2D, scale: number, clock: number): void {
    const w = this.width * scale;
    const h = this.height * scale;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(scale, scale);

    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bullets) drawDrop(ctx, b);
    ctx.globalCompositeOperation = 'source-over';

    // Pisca enquanto está invencível.
    const blink = this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0;
    if (!blink) drawEmber(ctx, this.soul.x, this.soul.y, this.opts.soulRadius, clock);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------

  private spawnWaves(): void {
    this.pattern.ondas.forEach((wave, i) => {
      // Na dificuldade mais rápida, as ondas também ficam um pouco mais densas.
      const interval = wave.intervalo / Math.sqrt(this.opts.speed);
      while (this.time >= this.nextSpawn[i] && this.nextSpawn[i] <= wave.ate) {
        this.emit(wave);
        this.nextSpawn[i] += interval;
      }
    });
  }

  private emit(w: WaveData): void {
    const rand = this.opts.rand;
    const v = w.velocidade * this.opts.speed;
    const r = w.raio;

    switch (w.tipo) {
      case 'chuva': {
        const x = r + rand() * (this.width - 2 * r);
        this.add(x, -r, 0, v, r, w.balanco ?? 0);
        break;
      }
      case 'cortina': {
        const gap = w.vao ?? 30;
        const step = w.espaco ?? 14;
        const center = gap / 2 + rand() * (this.width - gap);
        for (let x = step / 2; x < this.width; x += step) {
          if (Math.abs(x - center) < gap / 2) continue;
          this.add(x, -r, 0, v, r, 0);
        }
        break;
      }
      case 'leque': {
        const [ox, oy] = w.origem ?? [0.5, 0];
        const x0 = ox * this.width;
        const y0 = oy * this.height - r;
        const base = w.mirar ? Math.atan2(this.soul.y - y0, this.soul.x - x0) : Math.PI / 2;
        const n = Math.max(1, w.quantidade ?? 3);
        const spread = ((w.abertura ?? 60) * Math.PI) / 180;
        for (let k = 0; k < n; k++) {
          const a = n === 1 ? base : base + (k / (n - 1) - 0.5) * spread;
          this.add(x0, y0, Math.cos(a) * v, Math.sin(a) * v, r, 0);
        }
        break;
      }
      case 'mira': {
        // Nasce numa borda (cima, esquerda ou direita) e vai reto na direção da brasa.
        const side = Math.floor(rand() * 3);
        const x0 = side === 0 ? rand() * this.width : side === 1 ? -r : this.width + r;
        const y0 = side === 0 ? -r : rand() * this.height * 0.6;
        const a = Math.atan2(this.soul.y - y0, this.soul.x - x0);
        this.add(x0, y0, Math.cos(a) * v, Math.sin(a) * v, r, 0);
        break;
      }
    }
  }

  private add(x: number, y: number, vx: number, vy: number, r: number, sway: number): void {
    const rand = this.opts.rand;
    this.bullets.push({
      baseX: x,
      x,
      y,
      vx,
      vy,
      r,
      sway,
      phase: rand() * Math.PI * 2,
      age: 0,
      lilac: rand() < 0.3,
    });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Gota de Aether: brilho suave em volta e um núcleo claro. */
function drawDrop(ctx: CanvasRenderingContext2D, b: Bullet): void {
  const color = b.lilac ? '185, 166, 255' : '127, 224, 208';
  ctx.fillStyle = `rgba(${color}, 0.22)`;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 2, 0, Math.PI * 2);
  ctx.fill();

  // Formato de gota: frente redonda, rabo apontando para trás do movimento.
  const a = Math.atan2(b.vy, b.vx);
  ctx.fillStyle = `rgb(${color})`;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, a - Math.PI / 2, a + Math.PI / 2);
  ctx.lineTo(b.x - Math.cos(a) * b.r * 2.2, b.y - Math.sin(a) * b.r * 2.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(240, 255, 252, 0.9)';
  ctx.beginPath();
  ctx.arc(b.x + Math.cos(a) * b.r * 0.2, b.y + Math.sin(a) * b.r * 0.2, b.r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A brasa: o símbolo do jogador, uma chama pequena que pulsa. */
function drawEmber(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, clock: number): void {
  const pulse = 1 + Math.sin(clock * 8) * 0.08;
  const s = r * SOUL_DRAW_SIZE * pulse;

  const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
  glow.addColorStop(0, 'rgba(255, 150, 90, 0.55)');
  glow.addColorStop(1, 'rgba(226, 112, 74, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, s * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Chama: losango com a ponta de cima mais alta.
  ctx.fillStyle = '#e2704a';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.35);
  ctx.quadraticCurveTo(x + s * 0.95, y - s * 0.1, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.95, y - s * 0.1, x, y - s * 1.35);
  ctx.fill();

  ctx.fillStyle = '#ffd08a';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.55);
  ctx.quadraticCurveTo(x + s * 0.45, y + s * 0.15, x, y + s * 0.6);
  ctx.quadraticCurveTo(x - s * 0.45, y + s * 0.15, x, y - s * 0.55);
  ctx.fill();
}
