import { DialogueRunner, MessageSource, type DialogueChoice, type DialogueSource, type Reward } from '../../systems/Dialogue';
import { item } from '../../systems/items';
import { DialogueBox } from '../../ui/DialogueBox';

const itemName = (id: string) => item(id).nome;
import { CHARACTERS } from '../../world/characters';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

/**
 * Conversa com um NPC (id em data/dialogos.json) ou mensagem simples
 * (lista de falas), por cima da exploração congelada.
 * Confirmar completa a fala que está sendo digitada; de novo, avança.
 */
export class DialogueState implements GameState {
  readonly name = 'Diálogo';
  readonly overlay = true;
  private readonly runner: DialogueSource;
  private readonly box: DialogueBox;
  private pendingChoices?: DialogueChoice[];
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    source: string | string[],
    /** Chamado ao fechar, com a ação pedida pelo diálogo (batalha, loja, cena), se houver. */
    private readonly onEnd: (action?: string) => void = () => {},
  ) {
    this.runner =
      typeof source === 'string'
        ? new DialogueRunner(source, ctx.flags, (r) => this.giveReward(r))
        : new MessageSource(source);
    // Clique ou toque na caixa vale o mesmo que confirmar.
    this.box = new DialogueBox(() => ctx.input.trigger('confirm'));
  }

  enter(): void {
    this.box.show(this.ctx.ui);
    this.present();
  }

  exit(): void {
    this.box.hide();
  }

  update(dt: number): void {
    if (this.closed) return;
    const input = this.ctx.input;
    this.box.update(dt);

    if (this.box.menu) {
      this.box.menu.handle(input);
      return;
    }

    if (input.pressed('confirm') || input.pressed('cancel')) {
      if (!this.box.finished) {
        this.box.complete();
      } else if (!this.pendingChoices) {
        this.runner.advance();
        this.present();
        return;
      }
    }

    // As escolhas só aparecem depois que a pergunta terminou de ser escrita.
    if (this.box.finished && this.pendingChoices) {
      this.box.showChoices(this.pendingChoices, (i) => {
        this.runner.choose(i);
        this.present();
      });
    }
  }

  private present(): void {
    const step = this.runner.step;
    if (step.kind === 'end') {
      this.close();
      return;
    }
    const speaker = CHARACTERS[step.speaker]?.nome ?? step.speaker;
    this.box.say(speaker, step.text);
    this.pendingChoices = step.kind === 'choice' ? step.choices : undefined;
  }

  /** Entrega a recompensa de um nó. O aviso aparece como a próxima fala. */
  private giveReward(reward: Reward): void {
    const parts: string[] = [];
    for (const [id, n] of Object.entries(reward.itens ?? {})) {
      this.ctx.player.addItem(id, n);
      parts.push(`${n}× ${itemName(id)}`);
    }
    if (reward.brasas) {
      this.ctx.player.brasas += reward.brasas;
      parts.push(`${reward.brasas} Brasas`);
    }
    if (parts.length) this.ctx.toast(`Recebido: ${parts.join(', ')}`);
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
    this.onEnd(this.runner.action);
  }
}
