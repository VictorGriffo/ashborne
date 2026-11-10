import { el, fadeIn, fadeOut } from '../../ui/dom';
import { requiredModels } from '../../world/areas';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { ExploreState } from './ExploreState';
import { TitleState } from './TitleState';

/** Carrega os modelos e depois abre a exploração com o título por cima. */
export class BootState implements GameState {
  readonly name = 'Carregando';
  private readonly screen: HTMLDivElement;
  private readonly bar: HTMLDivElement;

  constructor(private readonly ctx: GameContext) {
    this.screen = el('div', 'screen loading-screen');
    const track = el('div', 'loading-bar');
    this.bar = el('div');
    track.append(this.bar);
    this.screen.append(el('div', 'label', 'Carregando'), track);
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
    this.ctx.assets
      .load(requiredModels(), (f) => (this.bar.style.width = `${Math.round(f * 100)}%`))
      .then(() => {
        this.ctx.states.replace(new ExploreState(this.ctx));
        this.ctx.states.push(new TitleState(this.ctx));
      })
      .catch((err: unknown) => {
        console.error(err);
        this.screen.append(
          el('p', 'error', 'Não foi possível carregar os modelos. Verifique a conexão e recarregue a página.'),
        );
      });
  }

  exit(): void {
    fadeOut(this.screen);
  }

  update(): void {}
}
