import dialogues from '../../data/dialogos.json';
import type { Flags } from './Flags';

/**
 * Formato de data/dialogos.json.
 *
 * Cada diálogo tem nós. Um nó tem quem fala e uma ou mais falas. Depois das
 * falas, o nó oferece escolhas, aponta o próximo nó (`ir`) ou termina.
 * `inicio` escolhe o primeiro nó pela primeira condição verdadeira.
 */
export interface DialogueChoice {
  texto: string;
  ir: string;
}

export interface DialogueNode {
  quem: string;
  falas: string[];
  escolhas?: DialogueChoice[];
  ir?: string;
  /** Flags marcadas quando o nó termina. */
  marcar?: string[];
  /** Itens e Brasas entregues quando o nó termina. */
  recompensa?: Reward;
}

export interface Reward {
  itens?: Record<string, number>;
  brasas?: number;
}

/** Quem percorre um diálogo: o da história (JSON) ou uma mensagem simples. */
export interface DialogueSource {
  readonly step: DialogueStep;
  advance(): void;
  choose(index: number): void;
}

export interface DialogueStart {
  /** Flag que precisa estar marcada. Sem `se`, a regra sempre vale. */
  se?: string;
  no: string;
}

export interface DialogueData {
  inicio: DialogueStart[];
  nos: Record<string, DialogueNode>;
}

const DIALOGUES = dialogues as Record<string, DialogueData>;

/** O que a caixa de diálogo deve mostrar agora. */
export type DialogueStep =
  | { kind: 'line'; speaker: string; text: string }
  | { kind: 'choice'; speaker: string; text: string; choices: DialogueChoice[] }
  | { kind: 'end' };

/** Percorre um diálogo, uma fala por vez. Não sabe nada de tela nem de teclado. */
export class DialogueRunner implements DialogueSource {
  private readonly data: DialogueData;
  private node: DialogueNode | undefined;
  private line = 0;

  constructor(
    readonly id: string,
    private readonly flags: Flags,
    private readonly onReward: (reward: Reward) => void = () => {},
  ) {
    const data = DIALOGUES[id];
    if (!data) throw new Error(`Diálogo não encontrado: ${id}`);
    this.data = data;
    const start = data.inicio.find((s) => !s.se || flags.has(s.se));
    this.enter(start?.no);
  }

  /** Passo atual. */
  get step(): DialogueStep {
    const node = this.node;
    if (!node) return { kind: 'end' };
    const text = node.falas[this.line] ?? '';
    const isLast = this.line >= node.falas.length - 1;
    if (isLast && node.escolhas?.length) {
      return { kind: 'choice', speaker: node.quem, text, choices: node.escolhas };
    }
    return { kind: 'line', speaker: node.quem, text };
  }

  /** Avança para a próxima fala (ou próximo nó). */
  advance(): void {
    const node = this.node;
    if (!node) return;
    if (this.line < node.falas.length - 1) {
      this.line++;
      return;
    }
    if (node.escolhas?.length) return; // espera uma escolha
    this.finishNode(node);
    this.enter(node.ir);
  }

  /** Escolhe uma opção do nó atual. */
  choose(index: number): void {
    const node = this.node;
    const choice = node?.escolhas?.[index];
    if (!node || !choice) return;
    this.finishNode(node);
    this.enter(choice.ir);
  }

  private finishNode(node: DialogueNode): void {
    for (const flag of node.marcar ?? []) this.flags.set(flag);
    if (node.recompensa) this.onReward(node.recompensa);
  }

  private enter(id: string | undefined): void {
    this.line = 0;
    if (id === undefined) {
      this.node = undefined;
      return;
    }
    this.node = this.data.nos[id];
    if (!this.node) throw new Error(`Nó "${id}" não existe no diálogo ${this.id}`);
  }
}

/** Mensagem simples, sem personagem (baú aberto, item encontrado...). */
export class MessageSource implements DialogueSource {
  private index = 0;

  constructor(private readonly lines: string[]) {}

  get step(): DialogueStep {
    const text = this.lines[this.index];
    return text === undefined ? { kind: 'end' } : { kind: 'line', speaker: '', text };
  }

  advance(): void {
    this.index++;
  }

  choose(): void {}
}
