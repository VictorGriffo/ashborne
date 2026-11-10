/** Letras por segundo do efeito de máquina de escrever. */
const CHARS_PER_SECOND = 45;
/** Pausa extra depois de pontuação, em segundos. */
const PUNCTUATION_PAUSE: Record<string, number> = { '.': 0.18, '!': 0.18, '?': 0.18, ',': 0.08, '…': 0.25 };

/** Mostra um texto letra por letra dentro de um elemento. */
export class Typewriter {
  private full = '';
  private shown = 0;
  private wait = 0;

  constructor(
    private readonly el: HTMLElement,
    private readonly cps = CHARS_PER_SECOND,
  ) {}

  /** Começa um texto novo. */
  set(text: string): void {
    this.full = text;
    this.shown = 0;
    this.wait = 0;
    this.el.textContent = '';
  }

  get text(): string {
    return this.full;
  }

  get finished(): boolean {
    return this.shown >= this.full.length;
  }

  /** Mostra o resto de uma vez. */
  complete(): void {
    this.shown = this.full.length;
    this.el.textContent = this.full;
  }

  update(dt: number): void {
    if (this.finished) return;
    this.wait -= dt;
    while (this.wait <= 0 && !this.finished) {
      const ch = this.full[this.shown++];
      this.wait += 1 / this.cps + (PUNCTUATION_PAUSE[ch] ?? 0);
    }
    this.el.textContent = this.full.slice(0, this.shown);
  }
}
