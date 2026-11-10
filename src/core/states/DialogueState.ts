import { DialogueRunner, type DialogueChoice } from '../../systems/Dialogue';
import { DialogueBox } from '../../ui/DialogueBox';
import { CHARACTERS } from '../../world/characters';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

/**
 * Conversa com um NPC, por cima da exploração congelada.
 * Confirmar completa a fala que está sendo digitada; de novo, avança.
 */
export class DialogueState implements GameState {
  readonly name = 'Diálogo';
  readonly overlay = true;
  private readonly runner: DialogueRunner;
  private readonly box: DialogueBox;
  private pendingChoices?: DialogueChoice[];
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    dialogueId: string,
    private readonly onEnd: () => void = () => {},
  ) {
    this.runner = new DialogueRunner(dialogueId, ctx.flags);
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

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
    this.onEnd();
  }
}
