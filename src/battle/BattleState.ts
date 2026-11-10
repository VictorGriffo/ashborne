import type { GameContext } from '../core/GameContext';
import { PauseState } from '../core/states/PauseState';
import type { GameState } from '../core/StateMachine';
import { createRandom, range } from '../core/random';
import { item } from '../systems/items';
import { fadeIn, fadeOut } from '../ui/dom';
import { BattleUI, BOX_MORPH_SECONDS, COMMANDS } from './BattleUI';
import { mob, pattern, type MobData } from './data';
import { DodgePhase } from './DodgePhase';
import { FightBar } from './FightBar';

export type BattleResult = 'vitoria' | 'poupado' | 'fuga' | 'derrota';

/** O que a batalha precisa do mundo 3D por trás dela. */
export interface BattleHost {
  /** Ponto da tela (px) sobre o inimigo, para os números de dano. */
  enemyScreenPoint(): { x: number; y: number };
  enemyHurt(): void;
  enemyDefeated(): void;
  enemySpared(): void;
  /** Chamado quando a interface da batalha fecha. */
  finish(result: BattleResult): void;
}

export interface BattleOptions {
  /** O Ryben chegou por trás: o primeiro turno do inimigo é mais lento. */
  surprise: boolean;
}

/** Fases da batalha. Só uma fica ativa por vez. */
type Phase =
  | { kind: 'text'; lines: string[]; index: number; next: () => void }
  | { kind: 'menu' }
  | { kind: 'list' }
  | { kind: 'fight'; bar: FightBar }
  | { kind: 'wait'; time: number; next: () => void }
  | { kind: 'dodge'; dodge: DodgePhase }
  | { kind: 'done' };

const SURPRISE_SLOWDOWN = 0.7;

/**
 * Batalha por turnos, por cima da exploração.
 *
 * Turno do Ryben: Lutar (barra de precisão), Agir (acalma o inimigo),
 * Item (cura) ou Poupar (encerra a luta se o inimigo estiver calmo).
 * Turno do inimigo: fase de desvio com a brasa dentro da caixa.
 */
export class BattleState implements GameState {
  readonly name = 'Batalha';
  readonly overlay = true;

  private readonly data: MobData;
  private readonly ui: BattleUI;
  private readonly rand = createRandom(Date.now() & 0xffff);
  private phase: Phase = { kind: 'done' };
  private enemyHp: number;
  private calm = 0;
  private turn = 0;
  private clock = 0;
  /** Texto de clima que aparece com o menu no começo de cada turno. */
  private flavor = '';
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    mobId: string,
    private readonly host: BattleHost,
    private readonly options: BattleOptions,
  ) {
    this.data = mob(mobId);
    this.enemyHp = this.data.vida;
    this.ui = new BattleUI({
      onCommand: (i) => this.onCommandClick(i),
      onTap: () => ctx.input.trigger('confirm'),
    });
  }

  private get spareable(): boolean {
    return this.calm >= this.data.calmaParaPoupar;
  }

  /** Nome com artigo, para o meio da frase: "o Brotinho de Aether". */
  private get the(): string {
    return `${this.data.artigo} ${this.data.nome}`;
  }

  /** Nome com artigo, para o começo da frase: "O Brotinho de Aether". */
  private get The(): string {
    return capitalize(this.the);
  }

  // -- Ciclo de vida ------------------------------------------------------------

  enter(): void {
    fadeIn(this.ctx.ui, this.ui.root);
    this.ui.flash();
    this.ui.setEnemy(this.data.nome, this.enemyHp, this.data.vida);
    this.refreshPlayer();
    this.ui.select(0);
    const intro = [this.data.encontro];
    if (this.options.surprise) intro.push(this.data.surpresa);
    this.showText(intro, () => this.playerTurn());
  }

  exit(): void {
    fadeOut(this.ui.root, 350);
  }

  focusLost(): void {
    this.ctx.states.push(new PauseState(this.ctx, { canQuit: false }));
  }

  update(dt: number): void {
    const input = this.ctx.input;
    this.clock += dt;
    this.ui.writer.update(dt);

    // P ou Start pausam; Esc fica para "voltar" dentro da batalha.
    if (input.pressed('pause') && !input.pressed('cancel')) {
      this.ctx.states.push(new PauseState(this.ctx, { canQuit: false }));
      return;
    }

    const phase = this.phase;
    switch (phase.kind) {
      case 'text':
        if (input.pressed('confirm') || input.pressed('cancel')) {
          if (!this.ui.writer.finished) this.ui.writer.complete();
          else this.nextLine(phase);
        }
        break;

      case 'menu':
        if (input.pressed('left')) this.ui.select(this.ui.selected - 1);
        if (input.pressed('right')) this.ui.select(this.ui.selected + 1);
        if (input.pressed('confirm')) this.choose(this.ui.selected);
        break;

      case 'list':
        if (input.pressed('cancel')) this.playerTurn(false);
        else this.ui.list?.handle(input);
        break;

      case 'fight':
        phase.bar.update(dt, input.pressed('confirm'));
        if (phase.bar.done) this.resolveFight(phase.bar);
        break;

      case 'wait':
        phase.time -= dt;
        if (phase.time <= 0) phase.next();
        break;

      case 'dodge':
        this.updateDodge(phase.dodge, dt);
        break;

      case 'done':
        break;
    }
  }

  render(): void {
    const { ctx, canvasScale } = this.ui;
    if (this.phase.kind === 'dodge') {
      this.phase.dodge.draw(ctx, canvasScale, this.clock);
    } else if (this.phase.kind === 'fight') {
      const c = this.ui.canvas;
      this.phase.bar.draw(ctx, c.width, c.height, this.clock);
    }
  }

  // -- Turno do Ryben -----------------------------------------------------------

  /** Volta ao menu principal. `fresh` sorteia um novo texto de clima. */
  private playerTurn(fresh = true): void {
    if (fresh) {
      const pool = this.spareable ? this.data.textosCalmo : this.data.textos;
      this.flavor = pick(this.rand, pool);
    }
    this.ui.textMode();
    this.ui.showCanvas(false);
    this.ui.setCommandsActive(true);
    this.ui.setSpareReady(this.spareable);
    this.ui.say(this.flavor);
    if (!fresh) this.ui.writer.complete();
    this.phase = { kind: 'menu' };
  }

  private onCommandClick(i: number): void {
    if (this.phase.kind !== 'menu' && this.phase.kind !== 'list') return;
    this.ui.select(i);
    this.choose(i);
  }

  private choose(i: number): void {
    switch (COMMANDS[i]) {
      case 'Lutar':
        return this.startFight();
      case 'Agir':
        return this.openActs();
      case 'Item':
        return this.openItems();
      case 'Poupar':
        return this.openMercy();
    }
  }

  private startFight(): void {
    this.ui.clearList();
    this.ui.say('');
    this.ui.setCommandsActive(false);
    this.ui.showCanvas(true);
    this.phase = { kind: 'fight', bar: new FightBar(this.ctx.config.batalha.barraDeAtaque) };
  }

  private resolveFight(bar: FightBar): void {
    const p = this.host.enemyScreenPoint();
    const accuracy = bar.accuracy;
    this.phase = { kind: 'wait', time: 0.85, next: () => this.afterPlayerAction() };

    if (accuracy <= 0) {
      this.ui.popup('ERROU', p.x, p.y, 'erro');
      return;
    }
    const player = this.ctx.player;
    const raw = player.attack * (0.5 + accuracy) * range(this.rand, 0.9, 1.1);
    const damage = Math.max(1, Math.round(raw) - this.data.defesa);
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.ui.setEnemyHp(this.enemyHp, this.data.vida);
    this.ui.popup(String(damage), p.x, p.y, 'dano');
    this.host.enemyHurt();
  }

  private openActs(): void {
    this.ui.setCommandsActive(false);
    this.ui.showList(
      this.data.agir.map((act) => ({
        label: act.nome,
        action: () => {
          this.calm = Math.max(0, this.calm + act.calma);
          const lines = this.spareable && act.textoCalmo ? act.textoCalmo : act.texto;
          const becameCalm = this.spareable && act.calma > 0 && this.calm - act.calma < this.data.calmaParaPoupar;
          const extra = becameCalm ? [`${this.The} parece calmo o bastante. Você pode poupá-lo agora.`] : [];
          this.ui.setSpareReady(this.spareable);
          this.showText([...lines, ...extra], () => this.afterPlayerAction());
        },
      })),
    );
    this.phase = { kind: 'list' };
  }

  private openItems(): void {
    const player = this.ctx.player;
    const healing = [...player.inventory.entries()].filter(([id]) => item(id).tipo === 'cura');
    if (healing.length === 0) {
      this.ui.setCommandsActive(false);
      this.showText(['Sua bolsa está vazia.'], () => this.playerTurn(false));
      return;
    }
    this.ui.setCommandsActive(false);
    this.ui.showList(
      healing.map(([id, count]) => ({
        label: `${item(id).nome}  ×${count}`,
        action: () => {
          const data = item(id);
          player.consume(id);
          const healed = player.heal(data.cura ?? 0);
          this.refreshPlayer();
          const p = this.host.enemyScreenPoint();
          if (healed > 0) this.ui.popup(`+${healed}`, p.x, p.y + 120, 'cura');
          const result = healed > 0 ? `Você recuperou ${healed} de vida.` : 'Sua vida já estava cheia.';
          this.showText([data.usar ?? `Você usa ${data.nome}.`, result], () => this.afterPlayerAction());
        },
      })),
    );
    this.phase = { kind: 'list' };
  }

  private openMercy(): void {
    this.ui.setCommandsActive(false);
    this.ui.showList([
      {
        label: this.spareable ? 'Poupar ✦' : 'Poupar',
        action: () => {
          if (this.spareable) this.win('poupado');
          else
            this.showText(
              [`Você tenta poupar ${this.the}, mas ele ainda está nervoso demais.`],
              () => this.afterPlayerAction(),
            );
        },
      },
      {
        label: 'Fugir',
        action: () => this.showText(['Você recua devagar e escapa.'], () => this.close('fuga')),
      },
    ]);
    this.phase = { kind: 'list' };
  }

  private afterPlayerAction(): void {
    if (this.enemyHp <= 0) this.win('vitoria');
    else this.enemyTurn();
  }

  // -- Turno do inimigo ---------------------------------------------------------

  private enemyTurn(): void {
    this.turn++;
    const calm = this.spareable;
    this.ui.setCommandsActive(false);
    this.ui.showBubble(pick(this.rand, calm ? this.data.falasCalmo : this.data.falas));

    const pat = pattern(pick(this.rand, calm ? this.data.ataquesCalmo : this.data.ataques));
    const cfg = this.ctx.config.batalha;
    let speed = this.ctx.player.difficulty.velocidade;
    if (this.options.surprise && this.turn === 1) speed *= SURPRISE_SLOWDOWN;

    const dodge = new DodgePhase(pat, {
      speed,
      soulSpeed: cfg.velocidadeAlma,
      soulRadius: cfg.raioAlma,
      invulnerable: cfg.invencivel,
      rand: this.rand,
    });
    this.ui.dodgeMode(dodge.width, dodge.height);
    // O canvas aparece quando a caixa termina de encolher.
    window.setTimeout(() => {
      if (this.phase.kind === 'dodge') this.ui.showCanvas(true);
    }, BOX_MORPH_SECONDS * 1000);
    this.phase = { kind: 'dodge', dodge };
  }

  private updateDodge(dodge: DodgePhase, dt: number): void {
    const hit = dodge.update(dt, this.ctx.input.moveVector());
    if (hit) {
      this.ctx.player.takeHit(this.data.ataque);
      this.refreshPlayer();
      this.ui.shake();
      if (this.ctx.player.hp <= 0) {
        this.lose();
        return;
      }
    }
    if (dodge.finished) {
      this.ui.showBubble(null);
      this.playerTurn();
    }
  }

  // -- Fim ----------------------------------------------------------------------

  private win(how: 'vitoria' | 'poupado'): void {
    const player = this.ctx.player;
    let lines: string[];
    if (how === 'vitoria') {
      const { xp, brasas } = this.data.recompensa;
      player.xp += xp;
      player.brasas += brasas;
      this.host.enemyDefeated();
      lines = [
        `${this.The} se desfaz em brilho.`,
        `Você ganhou ${xp} de experiência e ${plural(brasas, 'Brasa', 'Brasas')}.`,
      ];
    } else {
      const { lacos, brasas } = this.data.recompensaPoupar;
      player.lacos += lacos;
      player.brasas += brasas;
      this.host.enemySpared();
      lines = [
        `Você poupou ${this.the}.`,
        `+${plural(lacos, 'Laço', 'Laços')} e ${plural(brasas, 'Brasa', 'Brasas')}.`,
      ];
    }
    this.ui.showBubble(null);
    this.ui.setCommandsActive(false);
    this.showText(lines, () => this.close(how));
  }

  private lose(): void {
    this.ui.showBubble(null);
    this.ui.textMode();
    this.ui.showCanvas(false);
    this.showText(
      ['Ryben cai de joelhos. A visão escurece...', 'Ainda não é o fim. Não pode ser.'],
      () => this.close('derrota'),
    );
  }

  private close(result: BattleResult): void {
    if (this.closed) return;
    this.closed = true;
    this.phase = { kind: 'done' };
    this.ctx.states.pop();
    this.host.finish(result);
  }

  // -- Texto ------------------------------------------------------------------------

  private showText(lines: string[], next: () => void): void {
    this.ui.textMode();
    this.ui.showCanvas(false);
    this.ui.setCommandsActive(false);
    this.phase = { kind: 'text', lines, index: 0, next };
    this.ui.say(lines[0] ?? '');
  }

  private nextLine(phase: Extract<Phase, { kind: 'text' }>): void {
    phase.index++;
    if (phase.index < phase.lines.length) this.ui.say(phase.lines[phase.index]);
    else phase.next();
  }

  private refreshPlayer(): void {
    const p = this.ctx.player;
    this.ui.setPlayer(p.level, p.hp, p.maxHp);
  }
}

function pick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
