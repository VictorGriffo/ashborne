import * as THREE from 'three';
import { BattleState, type BattleHost, type BattleResult } from '../../battle/BattleState';
import { CameraRig } from '../../render/CameraRig';
import { CharacterModel } from '../../render/CharacterModel';
import { el } from '../../ui/dom';
import { exitAt, type Area } from '../../world/Area';
import { createArea, PLAYER_CHARACTER, START } from '../../world/areas';
import { character } from '../../world/characters';
import type { MapEnemy } from '../../world/MapEnemy';
import type { Npc } from '../../world/Npc';
import { Player } from '../../world/Player';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { DialogueState } from './DialogueState';
import { PauseState } from './PauseState';
import { TransitionState } from './TransitionState';

/** Distância extra, além dos dois raios, para poder falar com um NPC. */
const TALK_REACH = 0.7;
/** Quão de frente o Ryben precisa estar (cosseno do ângulo). */
const TALK_FACING = 0.2;
/** Altura do aviso "Falar" acima dos pés do NPC. */
const PROMPT_HEIGHT = 2.1;
/** Na batalha, a câmera mira um pouco à frente do confronto para ele subir na tela. */
const BATTLE_FOCUS_SHIFT = new THREE.Vector3(0, 0, 1.3);
/** Golpe da espada do Ryben quando o Lutar acerta. */
const ATTACK_ANIMATION = '1H_Melee_Attack_Slice_Diagonal';

/** Exploração livre: o Ryben anda pelas áreas, fala com NPCs e troca de área. */
export class ExploreState implements GameState {
  readonly name = 'Exploração';
  private readonly scene = new THREE.Scene();
  private readonly areas = new Map<string, Area>();
  private area!: Area;
  private readonly player: Player;
  private readonly rig: CameraRig;

  private readonly hint: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly areaTitle: HTMLDivElement;
  private areaTitleTimer = 0;
  private pendingAreaTitle = false;

  /** NPC ao alcance para conversar, se houver. */
  private talkTarget?: Npc;
  private leaving = false;
  private readonly tmp = new THREE.Vector3();

  /** Mob da batalha em andamento. */
  private battleEnemy?: MapEnemy;
  /** Tempo sem encontros depois de uma batalha (para não emendar outra). */
  private grace = 0;
  /** Diálogo a abrir assim que a exploração voltar ao topo. */
  private pendingDialogue?: string;
  private readonly focus = new THREE.Vector3();

  constructor(private readonly ctx: GameContext) {
    const model = new CharacterModel(ctx.assets, character(PLAYER_CHARACTER));
    this.player = new Player(ctx.config.player, model);
    this.scene.add(this.player.object);

    this.rig = new CameraRig(ctx.config.camera);

    this.hint = el('div', 'controls-hint');
    this.hint.innerHTML =
      '<kbd>WASD</kbd> andar · <kbd>Shift</kbd> correr · <kbd>Enter</kbd> falar · <kbd>Esc</kbd> pausar';
    this.prompt = el('div', 'interact-prompt');
    this.prompt.innerHTML = '<kbd>Enter</kbd>Falar';
    // Clicar ou tocar no aviso também começa a conversa.
    this.prompt.addEventListener('mousedown', (e) => e.preventDefault());
    this.prompt.addEventListener('click', () => ctx.input.trigger('confirm'));
    this.areaTitle = el('div', 'area-title');

    this.loadArea(START.area, START.spawn);
  }

  enter(): void {
    this.ctx.ui.append(this.hint, this.prompt, this.areaTitle);
  }

  exit(): void {
    this.hint.remove();
    this.prompt.remove();
    this.areaTitle.remove();
  }

  pause(): void {
    this.hint.classList.add('hidden');
    this.prompt.classList.remove('visible');
  }

  resume(): void {
    this.hint.classList.remove('hidden');
  }

  focusLost(): void {
    this.ctx.states.push(new PauseState(this.ctx));
  }

  update(dt: number): void {
    const input = this.ctx.input;

    if (this.pendingAreaTitle) {
      this.pendingAreaTitle = false;
      this.showAreaTitle();
    }

    if (this.pendingDialogue) {
      const id = this.pendingDialogue;
      this.pendingDialogue = undefined;
      this.ctx.states.push(new DialogueState(this.ctx, id));
      return;
    }

    if (input.pressed('pause')) {
      this.ctx.states.push(new PauseState(this.ctx));
      return;
    }

    if (this.talkTarget && input.pressed('confirm')) {
      this.talk(this.talkTarget);
      return;
    }

    this.player.update(dt, input.moveVector(), input.down('run'));
    this.area.collision.resolve(this.player.position, this.player.config.radius);
    this.player.afterCollision(dt);

    this.talkTarget = this.findTalkTarget();

    // Mobs passeiam; encostar num deles começa a batalha.
    if (this.grace > 0) this.grace -= dt;
    for (const enemy of this.area.enemies) {
      enemy.update(dt, this.area.collision);
      if (this.grace <= 0 && enemy.touches(this.player.position, this.player.config.radius)) {
        this.startBattle(enemy);
        return;
      }
    }

    const exit = exitAt(this.area, this.player.position.x, this.player.position.z);
    if (exit && !this.leaving) {
      this.leaving = true;
      this.player.stop();
      this.ctx.states.push(new TransitionState(this.ctx, () => this.loadArea(exit.to, exit.spawn)));
    }
  }

  render(alpha: number, frameDt: number): void {
    const shown = this.player.syncVisual(alpha, frameDt);
    this.rig.fitAspect(this.ctx.renderer.aspect);
    if (this.battleEnemy) {
      // Enquadra o Ryben e o mob juntos, mais de perto.
      this.focus.lerpVectors(shown, this.battleEnemy.position, 0.5).add(BATTLE_FOCUS_SHIFT);
      this.rig.setZoom(this.ctx.config.batalha.zoomCamera);
      this.rig.follow(this.focus, frameDt);
    } else {
      this.rig.setZoom(1);
      this.rig.follow(shown, frameDt);
    }
    this.area.animate(frameDt, shown);
    this.ctx.renderer.render(this.scene, this.rig.camera);
    this.placePrompt();

    // O nome da área some sozinho, mesmo com um diálogo ou a pausa por cima.
    if (this.areaTitleTimer > 0) {
      this.areaTitleTimer -= frameDt;
      if (this.areaTitleTimer <= 0) this.areaTitle.classList.remove('visible');
    }

    const p = this.player.position;
    this.ctx.debug.set('área', this.area.id);
    this.ctx.debug.set('posição', `${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
    this.ctx.debug.set('veloc.', `${this.player.speed.toFixed(2)} m/s`);
    this.ctx.debug.set('flags', this.ctx.flags.list().join(', ') || '(nenhuma)');
  }

  /** Troca a área atual. As áreas ficam guardadas, então voltar é instantâneo. */
  private loadArea(id: string, spawnName: string): void {
    if (this.area) this.scene.remove(this.area.root);

    let area = this.areas.get(id);
    if (!area) {
      area = createArea(id, this.ctx.assets);
      this.areas.set(id, area);
    }
    this.area = area;
    this.scene.add(area.root);
    area.applyEnvironment(this.scene);

    const spawn = area.spawns[spawnName];
    if (!spawn) throw new Error(`Entrada "${spawnName}" não existe em ${id}`);
    this.player.teleport(spawn.x, spawn.z, spawn.yaw);
    this.rig.snapTo(this.player.position);

    this.talkTarget = undefined;
    this.leaving = false;
    this.pendingAreaTitle = true;
  }

  private showAreaTitle(): void {
    this.areaTitle.textContent = this.area.name;
    this.areaTitle.classList.add('visible');
    this.areaTitleTimer = 2.2;
  }

  private findTalkTarget(): Npc | undefined {
    const facing = this.player.facing;
    let best: Npc | undefined;
    let bestDist = Infinity;
    for (const npc of this.area.npcs) {
      const to = this.tmp.subVectors(npc.position, this.player.position).setY(0);
      const dist = to.length();
      const reach = npc.radius + this.player.config.radius + TALK_REACH;
      if (dist > reach || dist >= bestDist) continue;
      if (dist > 1e-3 && facing.dot(to.divideScalar(dist)) < TALK_FACING) continue;
      best = npc;
      bestDist = dist;
    }
    return best;
  }

  private startBattle(enemy: MapEnemy): void {
    const surprise = enemy.isBehind(this.player.position);
    enemy.startBattle();
    this.player.stop();
    this.player.lookAt(enemy.position);
    enemy.faceTowards(this.player.position);
    this.battleEnemy = enemy;
    this.area.setBattleMode?.(true);
    this.talkTarget = undefined;
    this.areaTitleTimer = 0;
    this.areaTitle.classList.remove('visible');

    const host: BattleHost = {
      enemyScreenPoint: () => this.screenPoint(enemy.position, 1.1),
      enemyHurt: () => {
        enemy.model.hurt();
        this.player.model.playOnce(ATTACK_ANIMATION);
      },
      enemyDefeated: () => enemy.defeat(),
      enemySpared: () => enemy.spare(),
      finish: (result) => this.endBattle(enemy, result),
    };
    this.ctx.states.push(new BattleState(this.ctx, enemy.mobId, host, { surprise }));
  }

  private endBattle(enemy: MapEnemy, result: BattleResult): void {
    this.battleEnemy = undefined;
    this.area.setBattleMode?.(false);
    this.grace = this.ctx.config.batalha.pausaAposToque;

    if (result === 'fuga') {
      enemy.resume();
      // Dá um passo para trás, para longe do mob.
      const away = this.tmp.subVectors(this.player.position, enemy.position).setY(0).normalize();
      this.player.teleport(this.player.position.x + away.x * 0.8, this.player.position.z + away.z * 0.8);
      this.area.collision.resolve(this.player.position, this.player.config.radius);
    } else if (result === 'derrota') {
      enemy.resume();
      this.ctx.states.push(
        new TransitionState(
          this.ctx,
          () => {
            this.ctx.player.restore();
            this.loadArea(START.area, START.spawn);
            this.pendingDialogue = 'orin-resgate';
          },
          0.8,
          0.6,
        ),
      );
    }
  }

  /** Projeta um ponto do mundo para pixels da tela. */
  private screenPoint(world: THREE.Vector3, height: number): { x: number; y: number } {
    const p = this.tmp.copy(world).setY(height).project(this.rig.camera);
    const canvas = this.ctx.renderer.gl.domElement;
    return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  private talk(npc: Npc): void {
    this.areaTitleTimer = 0;
    this.areaTitle.classList.remove('visible');
    this.player.stop();
    this.player.lookAt(npc.position);
    npc.faceTowards(this.player.position);
    npc.greet();
    this.prompt.classList.remove('visible');
    this.ctx.states.push(new DialogueState(this.ctx, npc.dialogue, () => npc.resetFacing()));
  }

  /** Posiciona o aviso "Falar" sobre a cabeça do NPC, na tela. */
  private placePrompt(): void {
    const npc = this.ctx.states.top === this ? this.talkTarget : undefined;
    if (!npc) {
      this.prompt.classList.remove('visible');
      return;
    }
    const p = this.tmp.copy(npc.position).setY(PROMPT_HEIGHT).project(this.rig.camera);
    const canvas = this.ctx.renderer.gl.domElement;
    const x = (p.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-p.y * 0.5 + 0.5) * canvas.clientHeight;
    this.prompt.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    this.prompt.classList.add('visible');
  }
}
