import config from '../../data/config.json';
import { Assets } from '../render/Assets';
import { Renderer } from '../render/Renderer';
import { Flags } from '../systems/Flags';
import { PlayerState } from '../systems/PlayerState';
import { DebugHud } from '../ui/DebugHud';
import { el } from '../ui/dom';
import { TouchControls } from '../ui/TouchControls';
import type { GameConfig, GameContext } from './GameContext';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { StateMachine } from './StateMachine';
import { BootState } from './states/BootState';

/**
 * Junta as peças: renderizador, entrada, máquina de estados e loop.
 * A pilha começa no carregamento, que depois abre a exploração com o título por cima.
 */
export class Game implements GameContext {
  readonly config: GameConfig = config;
  readonly renderer: Renderer;
  readonly input = new Input();
  readonly states = new StateMachine();
  readonly assets = new Assets();
  readonly flags = new Flags();
  readonly player = new PlayerState();
  readonly debug: DebugHud;
  private readonly loop: GameLoop;

  constructor(
    canvasHost: HTMLElement,
    readonly ui: HTMLElement,
  ) {
    this.renderer = new Renderer(canvasHost);
    this.debug = new DebugHud(ui, import.meta.env.DEV);
    new TouchControls(this.input, ui);

    // No celular em pé, pede para girar: o jogo é feito para a horizontal.
    const rotate = el('div', 'rotate-hint');
    rotate.append(el('div', 'rotate-phone'), el('p', undefined, 'Gire o celular para jogar na horizontal'));
    document.body.append(rotate);
    this.loop = new GameLoop(
      {
        update: (dt) => this.update(dt),
        render: (alpha, frameDt) => this.render(alpha, frameDt),
      },
      config.loop.hz,
    );

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.states.focusLost();
    });
    window.addEventListener('blur', () => this.states.focusLost());

    this.states.push(new BootState(this));
  }

  start(): void {
    this.loop.start();
  }

  private update(dt: number): void {
    this.input.beginStep();
    if (this.input.pressed('debug')) this.debug.toggle();
    this.states.update(dt);
  }

  private render(alpha: number, frameDt: number): void {
    this.states.render(alpha, frameDt);
    this.debug.set('estados', this.states.names().join(' › '));
    this.debug.frame(frameDt);
  }
}
