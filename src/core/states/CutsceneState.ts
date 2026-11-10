import cenas from '../../../data/cenas.json';
import { el } from '../../ui/dom';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { DialogueState } from './DialogueState';
import { EndOfPartState } from './EndOfPartState';

/**
 * Um passo de cutscene (data/cenas.json):
 *   { "evento": "eclipse" }       efeito na área (luz, Coração de Aether...)
 *   { "esperar": 1.5 }            pausa em segundos
 *   { "dialogo": "id" }           diálogo de data/dialogos.json
 *   { "flag": "x" }               marca uma flag (faz NPCs aparecerem, por exemplo)
 *   { "clarao": true }            clarão branco na tela
 *   { "batalha": "mob" }          batalha de história
 *   { "fim": "parte-1" }          tela de fim de parte
 */
export interface CutsceneStep {
  evento?: string;
  esperar?: number;
  dialogo?: string;
  flag?: string;
  clarao?: boolean;
  batalha?: string;
  fim?: string;
}

const SCENES = cenas as Record<string, CutsceneStep[]>;

/** O que a cutscene pede ao mundo. */
export interface CutsceneHost {
  event(name: string): void;
  /** Atualiza o que depende de flags (NPCs que aparecem ou somem). */
  refresh(): void;
  /** Abre uma batalha de história; a cutscene continua quando ela fechar. */
  battle(mobId: string): void;
}

/**
 * Cutscene: executa os passos em ordem. Diálogos e batalhas entram por
 * cima na pilha; quando saem, a cutscene volta ao topo e segue.
 */
export class CutsceneState implements GameState {
  readonly name = 'Cena';
  readonly overlay = true;
  private readonly steps: CutsceneStep[];
  private index = -1;
  private wait = 0;
  private waitingChild = false;
  private readonly bars: HTMLDivElement;
  private readonly flash: HTMLDivElement;

  constructor(
    private readonly ctx: GameContext,
    sceneId: string,
    private readonly host: CutsceneHost,
  ) {
    const steps = SCENES[sceneId];
    if (!steps) throw new Error(`Cena não encontrada em cenas.json: ${sceneId}`);
    this.steps = steps;
    // Faixas pretas de cinema em cima e embaixo.
    this.bars = el('div', 'cinema-bars');
    this.flash = el('div', 'cinema-flash');
  }

  enter(): void {
    this.ctx.ui.append(this.bars, this.flash);
    void this.bars.offsetWidth;
    this.bars.classList.add('visible');
    this.next();
  }

  exit(): void {
    this.bars.remove();
    this.flash.remove();
  }

  resume(): void {
    if (this.waitingChild) {
      this.waitingChild = false;
      this.next();
    }
  }

  update(dt: number): void {
    if (this.waitingChild) return;
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.next();
    }
  }

  private next(): void {
    this.index++;
    const step = this.steps[this.index];
    if (!step) {
      this.ctx.states.pop();
      return;
    }
    if (step.evento) {
      this.host.event(step.evento);
      this.next();
    } else if (step.flag) {
      this.ctx.flags.set(step.flag);
      this.host.refresh();
      this.next();
    } else if (step.clarao) {
      this.flash.classList.remove('on');
      void this.flash.offsetWidth;
      this.flash.classList.add('on');
      this.wait = 0.6;
    } else if (step.esperar) {
      this.wait = step.esperar;
    } else if (step.dialogo) {
      this.waitingChild = true;
      this.ctx.states.push(new DialogueState(this.ctx, step.dialogo));
    } else if (step.batalha) {
      this.waitingChild = true;
      this.host.battle(step.batalha);
    } else if (step.fim) {
      this.waitingChild = true;
      this.ctx.states.push(new EndOfPartState(this.ctx, step.fim));
    } else {
      this.next();
    }
  }
}
