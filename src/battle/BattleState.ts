import type { GameContext } from '../core/GameContext';
import { PauseState } from '../core/states/PauseState';
import type { GameState } from '../core/StateMachine';
import { createRandom, range } from '../core/random';
import { item } from '../systems/items';
import { knownSpells, spell } from '../systems/spells';
import { fadeIn, fadeOut } from '../ui/dom';
import type { MenuItem } from '../ui/MenuList';
import { BattleUI, BOX_MORPH_SECONDS, COMMANDS } from './BattleUI';
import { mob, pattern, type MobData } from './data';
import { DodgePhase } from './DodgePhase';
import { FightBar } from './FightBar';

/** "roteiro": batalha de história que acaba sozinha (a derrota obrigatória para o Vaelor). */
export type BattleResult = 'vitoria' | 'poupado' | 'fuga' | 'derrota' | 'roteiro';

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
  /** Efeitos de magia ativos (duram o próximo turno do inimigo, ou vários, no caso da cura). */
  private fx: { shield?: number; veil?: number; slow?: number; regen?: { amount: number; turns: number } } = {};
  /** A Brasa Renascida só revive uma vez por batalha. */
  private revived = false;
  /** Multiplicador do dano no turno inimigo atual (Raiz Firme). */
  private turnShield = 1;
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
    this.ui.dispose();
    fadeOut(this.ui.root, 350);
  }

  focusLost(): void {
    this.ctx.states.push(new PauseState(this.ctx));
  }

  update(dt: number): void {
    const input = this.ctx.input;
    this.clock += dt;
    this.ui.writer.update(dt);

    // P ou Start pausam; Esc fica para "voltar" dentro da batalha.
    if (input.pressed('pause') && !input.pressed('cancel')) {
      this.ctx.states.push(new PauseState(this.ctx));
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
      // O Aether volta devagar: 1 por turno.
      if (this.ctx.player.gainAether(1) > 0) this.refreshPlayer();
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
    // Na batalha de história, o inimigo não cai (a derrota do Ryben é obrigatória).
    this.enemyHp = Math.max(this.data.roteiro ? 1 : 0, this.enemyHp - damage);
    this.ui.setEnemyHp(this.enemyHp, this.data.vida);
    this.ui.popup(String(damage), p.x, p.y, 'dano');
    this.host.enemyHurt();
  }

  private openActs(): void {
    this.ui.setCommandsActive(false);
    const items: MenuItem[] = this.data.agir.map((act) => ({
      label: act.nome,
      action: () => this.doAct(act.calma, act.texto, act.textoCalmo),
    }));
    // Com algum selo restaurado, "Magia" abre a lista de magias (dentro do Agir).
    if (knownSpells((f) => this.ctx.flags.has(f)).length > 0) {
      items.push({ label: `Magia ▸  ${this.ctx.player.aether}/${this.ctx.player.maxAether}`, action: () => this.openSpells() });
    }
    this.ui.showList(items);
    this.phase = { kind: 'list' };
  }

  /** Aplica uma ação de Agir: muda a calma e mostra o texto. */
  private doAct(calma: number, texto: string[], textoCalmo?: string[]): void {
    const before = this.calm;
    this.calm = Math.max(0, this.calm + calma);
    const lines = this.spareable && textoCalmo ? textoCalmo : texto;
    const becameCalm = this.spareable && before < this.data.calmaParaPoupar;
    const extra = becameCalm ? [`${this.The} parece calmo o bastante. Você pode poupá-lo agora.`] : [];
    this.ui.setSpareReady(this.spareable);
    this.showText([...lines, ...extra], () => this.afterPlayerAction());
  }

  private openSpells(): void {
    const player = this.ctx.player;
    const ids = knownSpells((f) => this.ctx.flags.has(f));
    this.ui.showList([
      ...ids.map((id) => {
        const s = spell(id);
        return {
          label: `${s.nome} · ${s.custo}`,
          action: () => this.castSpell(id),
        };
      }),
      { label: `Voltar (Aether ${player.aether}/${player.maxAether})`, action: () => this.openActs() },
    ]);
    this.phase = { kind: 'list' };
  }

  /** Lança uma magia: gasta Aether e aplica o efeito de acordo com o tipo. */
  private castSpell(id: string): void {
    const s = spell(id);
    const player = this.ctx.player;
    if (this.data.roteiro && s.efeito === 'dano') {
      this.showText(['O Aether não responde. Algo o prende.'], () => this.playerTurn(false));
      return;
    }
    if (!player.spendAether(s.custo)) {
      this.showText(['Aether insuficiente.'], () => this.playerTurn(false));
      return;
    }
    this.refreshPlayer();
    const lines = [s.texto];
    switch (s.efeito) {
      case 'escudo':
        this.fx.shield = s.valor;
        lines.push('O dano do próximo ataque inimigo cai pela metade.');
        break;
      case 'cura-gradual':
        this.fx.regen = { amount: s.valor, turns: s.turnos ?? 3 };
        lines.push(`Você vai recuperar ${s.valor} de vida por turno, durante ${s.turnos ?? 3} turnos.`);
        break;
      case 'veu':
        this.fx.veil = s.valor;
        lines.push('Os projéteis do próximo turno ficam menores.');
        break;
      case 'lentidao':
        this.fx.slow = s.valor;
        lines.push(`${this.The} fica lento. Os ataques do próximo turno vão devagar.`);
        break;
      case 'calma': {
        const before = this.calm;
        this.calm += s.valor;
        this.ui.setSpareReady(this.spareable);
        lines.push(`${this.The} respira mais devagar.`);
        if (this.spareable && before < this.data.calmaParaPoupar) lines.push('Você pode poupá-lo agora.');
        break;
      }
      case 'dano': {
        const damage = Math.max(1, Math.round(player.attack * s.valor) - this.data.defesa);
        this.enemyHp = Math.max(this.data.roteiro ? 1 : 0, this.enemyHp - damage);
        this.ui.setEnemyHp(this.enemyHp, this.data.vida);
        const p = this.host.enemyScreenPoint();
        this.ui.popup(String(damage), p.x, p.y, 'dano');
        this.host.enemyHurt();
        lines.push(`${damage} de dano.`);
        break;
      }
    }
    this.showText(lines, () => this.afterPlayerAction());
  }

  private openItems(): void {
    const player = this.ctx.player;
    const healing = [...player.inventory.entries()].filter(([id]) => ['cura', 'aether'].includes(item(id).tipo));
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
          if (data.tipo === 'aether') {
            const got = player.useAetherItem(id) ?? 0;
            this.refreshPlayer();
            this.showText(
              [data.usar ?? `Você usa ${data.nome}.`, got > 0 ? `Você recuperou ${got} de Aether.` : 'Seu Aether já estava cheio.'],
              () => this.afterPlayerAction(),
            );
            return;
          }
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
              [this.data.recusaPoupar ?? `Você tenta poupar ${this.the}, mas ele ainda está nervoso demais.`],
              () => this.afterPlayerAction(),
            );
        },
      },
      {
        label: 'Fugir',
        action: () => {
          if (this.data.chefe || this.data.roteiro) {
            this.showText(['Não dá para fugir agora!'], () => this.playerTurn(false));
          } else {
            this.showText(['Você recua devagar e escapa.'], () => this.close('fuga'));
          }
        },
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
    // Batalha de história: depois de N turnos, acaba do jeito que o roteiro manda.
    const script = this.data.roteiro;
    if (script && this.turn >= script.turnos) {
      this.ui.showBubble(null);
      this.showText(script.fim, () => this.close('roteiro'));
      return;
    }
    this.turn++;
    const calm = this.spareable;
    this.ui.setCommandsActive(false);
    this.ui.showBubble(pick(this.rand, calm ? this.data.falasCalmo : this.data.falas));

    const pat = pattern(pick(this.rand, calm ? this.data.ataquesCalmo : this.data.ataques));
    const cfg = this.ctx.config.batalha;
    let speed = this.ctx.player.difficulty.velocidade;
    if (this.options.surprise && this.turn === 1) speed *= SURPRISE_SLOWDOWN;
    if (this.fx.slow) speed *= this.fx.slow;

    // Florescer: cura no começo do turno enquanto durar.
    if (this.fx.regen) {
      const healed = this.ctx.player.heal(this.fx.regen.amount / this.ctx.player.difficulty.cura);
      if (healed > 0) {
        const p = this.host.enemyScreenPoint();
        this.ui.popup(`+${healed}`, p.x, p.y + 120, 'cura');
      }
      this.refreshPlayer();
      if (--this.fx.regen.turns <= 0) this.fx.regen = undefined;
    }

    const dodge = new DodgePhase(pat, {
      speed,
      soulSpeed: cfg.velocidadeAlma,
      soulRadius: cfg.raioAlma,
      invulnerable: cfg.invencivel,
      rand: this.rand,
      radiusScale: this.fx.veil ?? 1,
    });
    // Escudo, véu e lentidão duram só este turno do inimigo.
    this.turnShield = this.fx.shield ?? 1;
    this.fx.shield = this.fx.veil = this.fx.slow = undefined;
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
      this.ctx.player.takeHit(this.data.ataque, this.turnShield);
      // Na batalha de história, o Ryben não cai antes da hora.
      if (this.data.roteiro && this.ctx.player.hp <= 0) this.ctx.player.hp = 1;
      // Brasa Renascida: revive uma vez por batalha, com metade da vida.
      if (this.ctx.player.hp <= 0 && !this.revived && this.ctx.player.itemCount('brasa-renascida') > 0) {
        this.revived = true;
        this.ctx.player.hp = Math.ceil(this.ctx.player.maxHp / 2);
        const p = this.host.enemyScreenPoint();
        this.ui.popup('BRASA RENASCIDA', p.x, p.y + 100, 'cura');
      }
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
      player.brasas += brasas;
      const ups = player.gainXp(xp);
      this.host.enemyDefeated();
      lines = [
        this.data.aoVencer ?? `${this.The} se desfaz em brilho.`,
        `Você ganhou ${xp} de experiência e ${plural(brasas, 'Brasa', 'Brasas')}.`,
        ...ups.map(
          (u) => `Ryben subiu para o nível ${u.level}! Vida máxima ${u.maxHp}, força ${u.strength}, defesa ${u.defense}.`,
        ),
      ];
      this.refreshPlayer();
    } else {
      const { lacos, brasas, xp = 0 } = this.data.recompensaPoupar;
      player.lacos += lacos;
      player.brasas += brasas;
      const ups = xp > 0 ? player.gainXp(xp) : [];
      this.host.enemySpared();
      lines = [
        `Você poupou ${this.the}.`,
        this.data.aoPoupar,
        `Você ganhou ${plural(lacos, 'Laço', 'Laços')}${xp > 0 ? `, ${xp} de experiência` : ''} e ${plural(brasas, 'Brasa', 'Brasas')}.`,
        ...ups.map(
          (u) => `Ryben subiu para o nível ${u.level}! Vida máxima ${u.maxHp}, força ${u.strength}, defesa ${u.defense}.`,
        ),
      ];
      this.refreshPlayer();
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
    const hasMagic = knownSpells((f) => this.ctx.flags.has(f)).length > 0;
    this.ui.setPlayer(p.level, p.hp, p.maxHp, hasMagic ? { cur: p.aether, max: p.maxAether } : undefined);
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
