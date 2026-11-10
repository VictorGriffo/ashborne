import { el } from '../ui/dom';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { Typewriter } from '../ui/Typewriter';

export const COMMANDS = ['Lutar', 'Agir', 'Item', 'Poupar'] as const;
export type Command = (typeof COMMANDS)[number];

/** Tamanho da caixa no modo texto, em pixels de tela. */
const TEXT_BOX_MAX_WIDTH = 620;
const TEXT_BOX_HEIGHT = 148;
/** Tempo da animação da caixa mudando de forma (igual ao CSS). */
export const BOX_MORPH_SECONDS = 0.3;

/**
 * Interface da batalha em HTML por cima do 3D: placa do inimigo,
 * balão de fala, caixa central (texto, listas ou a área de desvio),
 * status do Ryben e os quatro comandos.
 */
export class BattleUI {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly writer: Typewriter;

  private readonly enemyName: HTMLSpanElement;
  private readonly enemyBar: HTMLDivElement;
  private readonly bubble: HTMLDivElement;
  private readonly arena: HTMLDivElement;
  private readonly arenaText: HTMLParagraphElement;
  private readonly arenaList: HTMLDivElement;
  private readonly hpBar: HTMLDivElement;
  private readonly hpText: HTMLSpanElement;
  private readonly levelText: HTMLSpanElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly flashEl: HTMLDivElement;

  /** Pixels de canvas por unidade lógica (inclui a densidade da tela). */
  canvasScale = 1;
  list?: MenuList;
  selected = 0;

  constructor(callbacks: { onCommand: (i: number) => void; onTap: () => void }) {
    this.root = el('div', 'battle');

    // Topo: inimigo
    const plate = el('div', 'battle-enemy');
    this.enemyName = el('span', 'battle-enemy-name');
    const barTrack = el('div', 'hpbar enemy');
    this.enemyBar = el('div');
    barTrack.append(this.enemyBar);
    plate.append(this.enemyName, barTrack);
    this.bubble = el('div', 'battle-bubble');
    this.bubble.hidden = true;

    // Baixo: caixa, status e comandos
    const bottom = el('div', 'battle-bottom');
    this.arena = el('div', 'arena');
    this.arenaText = el('p', 'arena-text');
    this.arenaList = el('div', 'arena-list');
    this.canvas = el('canvas', 'arena-canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.arena.append(this.arenaText, this.arenaList, this.canvas);
    this.arena.addEventListener('mousedown', (e) => e.preventDefault());
    this.arena.addEventListener('click', () => {
      if (!this.list) callbacks.onTap();
    });
    this.writer = new Typewriter(this.arenaText);

    const stats = el('div', 'battle-stats');
    const name = el('span', 'battle-stats-name', 'Ryben');
    this.levelText = el('span', 'battle-stats-level');
    const hpLabel = el('span', 'battle-stats-label', 'Vida');
    const hpTrack = el('div', 'hpbar player');
    this.hpBar = el('div');
    hpTrack.append(this.hpBar);
    this.hpText = el('span', 'battle-stats-hp');
    stats.append(name, this.levelText, hpLabel, hpTrack, this.hpText);

    const commands = el('div', 'battle-commands');
    COMMANDS.forEach((label, i) => {
      const b = el('button', 'battle-command', label);
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => callbacks.onCommand(i));
      commands.append(b);
      this.buttons.push(b);
    });

    bottom.append(this.arena, stats, commands);
    this.flashEl = el('div', 'battle-flash');
    this.root.append(plate, this.bubble, bottom, this.flashEl);
    this.textMode();
  }

  // -- Inimigo e jogador --------------------------------------------------------

  setEnemy(name: string, hp: number, max: number): void {
    this.enemyName.textContent = name;
    this.setEnemyHp(hp, max);
  }

  setEnemyHp(hp: number, max: number): void {
    this.enemyBar.style.width = `${Math.max(0, (hp / max) * 100)}%`;
  }

  setPlayer(level: number, hp: number, max: number): void {
    this.levelText.textContent = `NV ${level}`;
    this.hpBar.style.width = `${Math.max(0, (hp / max) * 100)}%`;
    this.hpText.textContent = `${hp} / ${max}`;
    this.hpBar.parentElement!.classList.toggle('low', hp / max <= 0.3);
  }

  showBubble(text: string | null): void {
    this.bubble.hidden = !text;
    this.bubble.textContent = text ?? '';
  }

  // -- Comandos -----------------------------------------------------------------

  select(i: number): void {
    this.selected = (i + COMMANDS.length) % COMMANDS.length;
    this.buttons.forEach((b, k) => b.classList.toggle('selected', k === this.selected));
  }

  setCommandsActive(active: boolean): void {
    this.root.classList.toggle('commands-off', !active);
  }

  /** Destaca o Poupar quando o inimigo pode ser poupado. */
  setSpareReady(ready: boolean): void {
    this.buttons[3].classList.toggle('ready', ready);
  }

  // -- Caixa central ------------------------------------------------------------

  /** Caixa larga, para texto, listas e a barra de ataque. */
  textMode(): void {
    const w = Math.min(TEXT_BOX_MAX_WIDTH, window.innerWidth - 32);
    this.resizeArena(w, TEXT_BOX_HEIGHT);
    this.arena.classList.remove('dodge');
    this.canvasScale = (this.canvas.width / w) || 1;
  }

  /** Caixa da fase de desvio, proporcional ao tamanho lógico do padrão. */
  dodgeMode(logicalW: number, logicalH: number): void {
    const k = Math.min(2.6, Math.max(1.2, Math.min((window.innerWidth * 0.8) / logicalW, (window.innerHeight * 0.34) / logicalH)));
    this.resizeArena(logicalW * k, logicalH * k);
    this.arena.classList.add('dodge');
    this.canvasScale = k * Math.min(window.devicePixelRatio || 1, 2);
    this.clearList();
    this.arenaText.textContent = '';
  }

  /** Mostra (ou esconde) o canvas sobre a caixa. */
  showCanvas(visible: boolean): void {
    this.canvas.classList.toggle('visible', visible);
    if (!visible) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Tamanho do canvas em pixels de tela (sem a densidade). */
  get canvasCss(): { w: number; h: number } {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { w: this.canvas.width / dpr, h: this.canvas.height / dpr };
  }

  say(text: string): void {
    this.clearList();
    this.writer.set(text);
  }

  showList(items: MenuItem[]): MenuList {
    this.clearList();
    this.writer.set('');
    this.list = new MenuList(items);
    this.list.el.classList.add('arena-menu');
    this.arenaList.append(this.list.el);
    return this.list;
  }

  clearList(): void {
    this.list = undefined;
    this.arenaList.replaceChildren();
  }

  // -- Efeitos ------------------------------------------------------------------

  /** Número de dano (ou "ERROU") subindo num ponto da tela. */
  popup(text: string, x: number, y: number, kind: 'dano' | 'erro' | 'cura' = 'dano'): void {
    const pop = el('div', `battle-pop ${kind}`, text);
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    this.root.append(pop);
    window.setTimeout(() => pop.remove(), 1100);
  }

  flash(): void {
    this.flashEl.classList.remove('on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('on');
  }

  /** Tremida rápida da caixa quando a brasa é atingida. */
  shake(): void {
    this.arena.classList.remove('shake');
    void this.arena.offsetWidth;
    this.arena.classList.add('shake');
  }

  private resizeArena(cssW: number, cssH: number): void {
    this.arena.style.width = `${cssW}px`;
    this.arena.style.height = `${cssH}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
  }
}
