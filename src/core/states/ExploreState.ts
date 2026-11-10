import * as THREE from 'three';
import { CameraRig } from '../../render/CameraRig';
import { el } from '../../ui/dom';
import { Player } from '../../world/Player';
import { TestArea } from '../../world/TestArea';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { PauseState } from './PauseState';

/** Exploração livre: o Ryben anda pela área e a câmera acompanha. */
export class ExploreState implements GameState {
  readonly name = 'Exploração';
  private readonly scene = new THREE.Scene();
  private readonly area: TestArea;
  private readonly player: Player;
  private readonly rig: CameraRig;
  private readonly hint: HTMLDivElement;

  constructor(private readonly ctx: GameContext) {
    this.area = new TestArea(this.scene);

    this.player = new Player(ctx.config.player);
    this.player.teleport(this.area.spawn.x, this.area.spawn.y, 0);
    this.scene.add(this.player.object);

    this.rig = new CameraRig(ctx.config.camera);
    this.rig.snapTo(this.player.position);

    this.hint = el('div', 'controls-hint');
    this.hint.innerHTML =
      '<kbd>WASD</kbd> ou setas: andar · <kbd>Shift</kbd>: correr · <kbd>Esc</kbd>: pausar';
  }

  enter(): void {
    this.ctx.ui.append(this.hint);
  }

  exit(): void {
    this.hint.remove();
  }

  pause(): void {
    this.hint.classList.add('hidden');
  }

  resume(): void {
    this.hint.classList.remove('hidden');
  }

  focusLost(): void {
    this.ctx.states.push(new PauseState(this.ctx));
  }

  update(dt: number): void {
    const input = this.ctx.input;
    if (input.pressed('pause')) {
      this.ctx.states.push(new PauseState(this.ctx));
      return;
    }

    this.player.update(dt, input.moveVector(), input.down('run'));
    this.area.resolve(this.player.position, this.player.config.radius);
  }

  render(alpha: number, frameDt: number): void {
    const shown = this.player.syncVisual(alpha, frameDt);
    this.rig.fitAspect(this.ctx.renderer.aspect);
    this.rig.follow(shown, frameDt);
    this.area.animate(frameDt, shown);
    this.ctx.renderer.render(this.scene, this.rig.camera);

    const p = this.player.position;
    this.ctx.debug.set('posição', `${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
    this.ctx.debug.set('veloc.', `${this.player.speed.toFixed(2)} m/s`);
  }
}
