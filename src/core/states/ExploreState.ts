import * as THREE from 'three';
import { BattleState, type BattleHost, type BattleResult } from '../../battle/BattleState';
import { mob } from '../../battle/data';
import { CameraRig } from '../../render/CameraRig';
import { LightBudget } from '../../render/LightBudget';
import { CharacterModel } from '../../render/CharacterModel';
import { check } from '../../systems/conditions';
import { item } from '../../systems/items';
import { activeQuest } from '../../systems/Quests';
import { buildSave, writeSave } from '../../systems/SaveGame';
import { el } from '../../ui/dom';
import { exitAt, type Area } from '../../world/Area';
import { allSavePoints, areaName, createArea, PLAYER_CHARACTER, RESCUE, RESCUE_PART_TWO } from '../../world/areas';
import { character } from '../../world/characters';
import { chestFlag, promptHeight, promptLabel, type Interactable } from '../../world/Interactable';
import type { MapEnemy } from '../../world/MapEnemy';
import type { Npc } from '../../world/Npc';
import { Player } from '../../world/Player';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';
import { CutsceneState } from './CutsceneState';
import { DialogueState } from './DialogueState';
import { InventoryState } from './InventoryState';
import { MapState } from './MapState';
import { PauseState } from './PauseState';
import { SavePointState, type TravelDestination } from './SavePointState';
import { ShopState } from './ShopState';
import { TransitionState } from './TransitionState';
import { TravelState } from './TravelState';

/** Distância extra, além dos dois raios, para poder interagir. */
const TALK_REACH = 0.7;
/** Quão de frente o Ryben precisa estar (cosseno do ângulo). */
const TALK_FACING = 0.2;
/** Quantos Laços o Ryben precisa ter para enfrentar Vaelor "acompanhado" (ajustar nos testes). */
const LACOS_ALTOS = 12;

/** Quanto o Ryben recua ao bater numa saída fechada. */
const LOCK_PUSHBACK = 1.2;

/** Na batalha, a câmera mira um pouco à frente do confronto para ele subir na tela. */
const BATTLE_FOCUS_SHIFT = new THREE.Vector3(0, 0, 1.3);
/** Velocidade extra quando o Ryben tem a montaria. */
const MOUNT_SPEED = 1.4;
/** Golpe da espada do Ryben quando o Lutar acerta. */
const ATTACK_ANIMATION = '1H_Melee_Attack_Slice_Diagonal';

/** Onde a exploração começa: área e nome de entrada (ou id de ponto de save). */
export interface ExploreStart {
  area: string;
  spawn: string;
  /** Cutscene que abre assim que a exploração começa (a Parte 2 começa com o "salto"). */
  cena?: string;
}

/**
 * Exploração livre: o Ryben anda pelas áreas, fala com NPCs, abre baús,
 * toca pontos de save, encontra mobs e troca de área.
 */
export class ExploreState implements GameState {
  readonly name = 'Exploração';
  private readonly scene = new THREE.Scene();
  private readonly areas = new Map<string, Area>();
  private area!: Area;
  private readonly player: Player;
  private readonly rig: CameraRig;
  private readonly lights: LightBudget;

  private readonly hint: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly promptText: HTMLSpanElement;
  private readonly areaTitle: HTMLDivElement;
  private areaTitleTimer = 0;
  private pendingAreaTitle = false;

  /** Objeto ao alcance para interagir, se houver. */
  private target?: Interactable;
  private leaving = false;
  private readonly tmp = new THREE.Vector3();

  /** Posição do inimigo da batalha em andamento (mob do mapa ou NPC). */
  private battleFocus?: THREE.Vector3;
  /** Última posição fora de uma saída bloqueada, para devolver o Ryben. */
  private readonly lastSafe = new THREE.Vector3();
  /** Tempo sem encontros depois de uma batalha (para não emendar outra). */
  private grace = 0;
  /** Diálogo a abrir assim que a exploração voltar ao topo. */
  private pendingDialogue?: string;
  /** Cutscene a abrir assim que a exploração estiver no topo. */
  private pendingScene?: string;
  private readonly focus = new THREE.Vector3();
  /** Etapa de missão já anunciada, para avisar quando mudar. */
  private questKey?: string;

  constructor(
    private readonly ctx: GameContext,
    start: ExploreStart,
  ) {
    // Aos 24 anos, o Ryben usa capuz e esconde o rosto.
    const hero = ctx.flags.has('parte-2') ? 'ryben-exilio' : PLAYER_CHARACTER;
    const model = new CharacterModel(ctx.assets, character(hero));
    this.player = new Player(ctx.config.player, model);
    this.pendingScene = start.cena;
    this.scene.add(this.player.object);

    this.rig = new CameraRig(ctx.config.camera);
    this.lights = new LightBudget();

    this.hint = el('div', 'controls-hint');
    this.hint.innerHTML =
      '<kbd>WASD</kbd> andar · <kbd>Shift</kbd> correr · <kbd>Mouse</kbd>/<kbd>Q</kbd><kbd>E</kbd> câmera · <kbd>C</kbd> centralizar · <kbd>Enter</kbd> interagir · <kbd>M</kbd> mapa · <kbd>I</kbd> bolsa · <kbd>Esc</kbd> pausar';
    this.prompt = el('div', 'interact-prompt');
    this.prompt.innerHTML = '<kbd class="only-keys">Enter</kbd><kbd class="only-touch">A</kbd>';
    this.promptText = el('span');
    this.prompt.append(this.promptText);
    // Clicar ou tocar no aviso também interage.
    this.prompt.addEventListener('mousedown', (e) => e.preventDefault());
    this.prompt.addEventListener('click', () => ctx.input.trigger('confirm'));
    this.areaTitle = el('div', 'area-title');

    // questKey começa vazio: o objetivo atual é anunciado assim que o jogo começa.
    this.loadArea(start.area, start.spawn);
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
    this.openPause();
  }

  update(dt: number): void {
    const input = this.ctx.input;
    this.ctx.player.playTime += dt;

    if (this.pendingAreaTitle) {
      this.pendingAreaTitle = false;
      this.showAreaTitle();
    }
    this.announceQuest();

    if (this.pendingScene) {
      const id = this.pendingScene;
      this.pendingScene = undefined;
      this.startCutscene(id);
      return;
    }
    if (this.pendingDialogue) {
      const id = this.pendingDialogue;
      this.pendingDialogue = undefined;
      this.ctx.states.push(new DialogueState(this.ctx, id));
      return;
    }

    if (input.pressed('pause')) return this.openPause();
    if (input.pressed('map')) return this.ctx.states.push(new MapState(this.ctx, this.area.id));
    if (input.pressed('inventory')) return this.ctx.states.push(new InventoryState(this.ctx));

    if (this.target && input.pressed('confirm')) {
      this.interact(this.target);
      return;
    }

    this.refreshNpcs();
    const look = input.lookVector(dt);
    this.rig.rotate(look.x, look.y);
    this.rig.zoomBy(input.takeZoom());
    if (input.pressed('recenter')) this.rig.recenter(this.player.heading);
    this.player.update(dt, input.moveVector(), input.down('run'), this.rig.yaw);
    this.area.collision.resolve(this.player.position, this.player.config.radius);
    this.pushOutOfNpcs();
    this.player.afterCollision(dt);

    this.target = this.findTarget();

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
      if (exit.lock && !check(this.ctx.flags, exit.lock)) {
        // Saída fechada: avisa e devolve o Ryben um pouco para trás, virado para longe da
        // saída. Sem esse recuo ele ficava colado na borda, e qualquer passo reabria o aviso.
        const back = new THREE.Vector3().subVectors(this.lastSafe, this.player.position).setY(0);
        if (back.lengthSq() < 1e-6) back.set(0, 0, 1);
        back.normalize();
        const x = this.lastSafe.x + back.x * LOCK_PUSHBACK;
        const z = this.lastSafe.z + back.z * LOCK_PUSHBACK;
        this.player.teleport(x, z);
        this.player.lookAt(new THREE.Vector3(x + back.x, 0, z + back.z));
        this.lastSafe.set(x, 0, z);
        this.ctx.states.push(new DialogueState(this.ctx, [exit.lock.mensagem]));
        return;
      }
      this.leaving = true;
      this.player.stop();
      this.ctx.states.push(new TransitionState(this.ctx, () => this.loadArea(exit.to, exit.spawn)));
    } else if (!exit) {
      this.lastSafe.copy(this.player.position);
    }
  }

  /** NPCs aparecem e somem conforme as flags (o Vaelor surge na vila, por exemplo). */
  private refreshNpcs(): void {
    this.deriveFlags();
    this.area.refreshFlags?.(this.ctx.flags);
    for (const npc of this.area.npcs) {
      const active = check(this.ctx.flags, npc.condition);
      if (active !== npc.active) npc.setActive(active);
    }
  }

  /** NPCs ativos são obstáculos redondos (fora da colisão fixa, porque podem sumir). */
  private pushOutOfNpcs(): void {
    const p = this.player.position;
    const r = this.player.config.radius;
    for (const npc of this.area.npcs) {
      if (!npc.active) continue;
      const dx = p.x - npc.position.x;
      const dz = p.z - npc.position.z;
      const min = npc.radius + r;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-6) {
        p.x = npc.position.x + (dx / d) * min;
        p.z = npc.position.z + (dz / d) * min;
      }
    }
  }

  render(alpha: number, frameDt: number): void {
    const shown = this.player.syncVisual(alpha, frameDt);
    this.rig.fitAspect(this.ctx.renderer.aspect);
    if (this.battleFocus) {
      // Enquadra o Ryben e o inimigo juntos, mais de perto.
      this.focus.lerpVectors(shown, this.battleFocus, 0.5).add(BATTLE_FOCUS_SHIFT);
      this.rig.setZoom(this.ctx.config.batalha.zoomCamera);
      this.rig.follow(this.focus, frameDt);
    } else {
      this.rig.setZoom(1);
      this.rig.follow(shown, frameDt);
    }
    this.area.animate(frameDt, shown);
    this.lights.update(frameDt, shown);
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
    this.ctx.debug.set('flags', this.ctx.flags.list().join(', ') || '(nenhuma)');
  }

  // -- Áreas --------------------------------------------------------------------

  /** Troca a área atual. As áreas ficam guardadas, então voltar é instantâneo. */
  private loadArea(id: string, spawnName: string): void {
    if (this.area) {
      this.syncEnemies();
      this.scene.remove(this.area.root);
    }

    let area = this.areas.get(id);
    if (!area) {
      area = createArea(id, this.ctx.assets);
      this.areas.set(id, area);
    }
    this.area = area;
    this.applyEnemies(area);
    this.scene.add(area.root);
    area.applyEnvironment(this.scene);

    const spawn = area.spawns[spawnName];
    if (!spawn) throw new Error(`Entrada "${spawnName}" não existe em ${id}`);
    this.player.teleport(spawn.x, spawn.z, spawn.yaw);
    // Ao entrar numa área, a câmera fica atrás do Ryben.
    this.rig.occluders = area.cameraOccluders ?? [];
    this.lights.collect(this.scene);
    this.rig.snapTo(this.player.position, spawn.yaw + Math.PI);

    this.ctx.world.discovered.add(id);
    this.ctx.flags.set(`visitou-${id}`);
    this.target = undefined;
    this.leaving = false;
    this.pendingAreaTitle = true;
  }

  /** Guarda no estado do mundo como os mobs da área atual estão. */
  private syncEnemies(): void {
    if (this.area.enemies.length === 0) return;
    this.ctx.world.setEnemyStates(
      this.area.id,
      this.area.enemies.map((e) => e.savedState),
    );
  }

  /** Aplica o estado salvo dos mobs a uma área recém-aberta (ou reaberta). */
  private applyEnemies(area: Area): void {
    const saved = this.ctx.world.enemyStates(area.id);
    if (!saved) return;
    area.enemies.forEach((e, i) => {
      if (saved[i]) e.applySaved(saved[i]);
    });
  }

  private showAreaTitle(): void {
    this.areaTitle.textContent = this.area.name;
    this.areaTitle.classList.add('visible');
    this.areaTitleTimer = 2.2;
  }

  // -- Missões --------------------------------------------------------------------

  private currentQuestKey(): string {
    const q = activeQuest(this.ctx.flags);
    return q ? `${q.id}:${q.stepIndex}` : 'nenhuma';
  }

  /** Avisa quando a etapa da missão muda. */
  private announceQuest(): void {
    const key = this.currentQuestKey();
    if (key === this.questKey) return;
    const previous = this.questKey;
    this.questKey = key;
    const q = activeQuest(this.ctx.flags);
    const prevQuest = previous?.split(':')[0];
    if (prevQuest && prevQuest !== 'nenhuma' && prevQuest !== q?.id) {
      this.ctx.toast('✦ Missão concluída!');
    }
    if (q) this.ctx.toast(`✦ ${q.step.texto}`);
  }

  // -- Interação ------------------------------------------------------------------

  private findTarget(): Interactable | undefined {
    const facing = this.player.facing;
    let best: Interactable | undefined;
    let bestDist = Infinity;
    for (const it of this.area.interactables) {
      if (it.kind === 'bau' && this.ctx.flags.has(chestFlag(it.id))) continue;
      if (it.kind === 'npc' && !it.npc.active) continue;
      if (!check(this.ctx.flags, it.condition)) continue;
      const to = this.tmp.subVectors(it.position, this.player.position).setY(0);
      const dist = to.length();
      const reach = it.radius + this.player.config.radius + TALK_REACH;
      if (dist > reach || dist >= bestDist) continue;
      if (dist > 1e-3 && facing.dot(to.divideScalar(dist)) < TALK_FACING) continue;
      best = it;
      bestDist = dist;
    }
    return best;
  }

  private interact(target: Interactable): void {
    this.areaTitleTimer = 0;
    this.areaTitle.classList.remove('visible');
    this.prompt.classList.remove('visible');
    this.player.stop();
    this.player.lookAt(target.position);

    switch (target.kind) {
      case 'npc':
        return this.talk(target.npc);
      case 'bau':
        return this.openChest(target.id, target.contents);
      case 'save':
        return this.touchSavePoint(target);
      case 'examinar':
        for (const f of target.marcar ?? []) this.ctx.flags.set(f);
        this.ctx.states.push(new DialogueState(this.ctx, target.lines, () => this.runAction(target.acao)));
        return;
    }
  }

  private talk(npc: Npc): void {
    npc.faceTowards(this.player.position);
    npc.greet();
    this.ctx.states.push(
      new DialogueState(this.ctx, npc.dialogue, (action) => {
        npc.resetFacing();
        this.runAction(action, npc);
      }),
    );
  }

  /**
   * Ação pedida por um diálogo ou objeto:
   * "batalha:<mob>", "loja:<id>", "cena:<id>", "transporte:<id>" ou "viagem:<área>:<entrada>:<legenda>".
   */
  private runAction(action: string | undefined, npc?: Npc): void {
    if (!action) return;
    const [kind, id, spawn, ...rest] = action.split(':');
    if (kind === 'loja') this.ctx.states.push(new ShopState(this.ctx, id));
    else if (kind === 'cena') this.startCutscene(id);
    else if (kind === 'batalha' && npc) this.startNpcBattle(id, npc);
    else if (kind === 'transporte') {
      this.ctx.states.push(new TravelState(this.ctx, id, this.area.id, (c) => this.travelTo(c)));
    } else if (kind === 'viagem') {
      this.travelTo({ area: id, spawn, caption: rest.join(':') });
    }
  }

  /** Cena curta de viagem (carroça, barco): escurece, troca de área e clareia. */
  private travelTo(choice: { area: string; spawn: string; caption: string }): void {
    this.player.stop();
    this.ctx.states.push(
      new TransitionState(this.ctx, () => this.loadArea(choice.area, choice.spawn), {
        duration: 0.6,
        hold: 1.4,
        caption: choice.caption,
      }),
    );
  }

  /**
   * Flags derivadas dos selos ("selos-2" = pelo menos dois selos restaurados),
   * para liberar o barco e a montaria sem depender de qual território veio primeiro.
   */
  private deriveFlags(): void {
    const flags = this.ctx.flags;
    let seals = 0;
    for (let n = 1; n <= 7; n++) if (flags.has(`selo-${n}`)) seals++;
    for (let n = 2; n <= 7; n++) if (seals >= n) flags.set(`selos-ao-menos-${n}`);
    // Laços altos decidem os finais (ver "vaelor-final" em dialogos.json).
    if (this.ctx.player.lacos >= LACOS_ALTOS) flags.set('lacos-altos');
    this.player.speedScale = flags.has('montaria') ? MOUNT_SPEED : 1;
  }

  private startCutscene(id: string): void {
    this.player.stop();
    this.ctx.states.push(
      new CutsceneState(this.ctx, id, {
        event: (name) => this.area.cutsceneEvent?.(name),
        refresh: () => this.refreshNpcs(),
        battle: (mobId) => {
          const npc = this.area.npcs.find((n) => n.active && n.characterId === mobId);
          if (npc) this.startNpcBattle(mobId, npc);
          else this.startScriptedBattle(mobId, this.player.position.clone().add(new THREE.Vector3(0, 0, -2)));
        },
      }),
    );
  }

  /** Batalha contra um NPC (o treino com o Orin, o Vaelor na catástrofe). */
  private startNpcBattle(mobId: string, npc: Npc): void {
    npc.faceTowards(this.player.position);
    this.player.lookAt(npc.position);
    this.beginBattle(mobId, npc.position, {
      hurt: () => npc.model.playOnce('Hit_A'),
      defeated: () => npc.model.playOnce('Hit_B'),
      spared: () => npc.model.playOnce('Cheer'),
      done: () => npc.resetFacing(),
    });
  }

  /** Batalha de história sem um corpo no mapa. */
  private startScriptedBattle(mobId: string, at: THREE.Vector3): void {
    this.beginBattle(mobId, at, {});
  }

  private openChest(id: string, contents: { itens?: Record<string, number>; brasas?: number }): void {
    const player = this.ctx.player;
    const lines = ['Você abre o baú...'];
    for (const [itemId, n] of Object.entries(contents.itens ?? {})) {
      player.addItem(itemId, n);
      lines.push(`Encontrou ${n}× ${item(itemId).nome}.`);
    }
    if (contents.brasas) {
      player.brasas += contents.brasas;
      lines.push(`Encontrou ${contents.brasas} Brasas.`);
    }
    this.ctx.flags.set(chestFlag(id));
    this.ctx.states.push(new DialogueState(this.ctx, lines));
  }

  /** Tocar um ponto de save: cura, registra para a viagem rápida e abre o menu. */
  private touchSavePoint(target: Extract<Interactable, { kind: 'save' }>): void {
    const { player, world } = this.ctx;
    player.restore();
    world.savePoints.add(target.id);
    this.area.activateSavePoint?.(target.id);

    const destinations: TravelDestination[] = allSavePoints()
      .filter((p) => p.id !== target.id && world.savePoints.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, areaName: areaName(p.area) }));

    this.ctx.states.push(
      new SavePointState(this.ctx, {
        name: target.name,
        areaName: this.area.name,
        destinations,
        save: () => this.save(target.id),
        travel: (dest) => this.fastTravel(dest),
      }),
    );
  }

  /** Grava o jogo. Salvar também faz os mobs comuns derrotados voltarem. */
  private save(savePointId: string): boolean {
    this.syncEnemies();
    this.ctx.world.respawnDefeated();
    for (const area of this.areas.values()) this.applyEnemies(area);
    const data = buildSave(this.ctx, { area: this.area.id, savePoint: savePointId, place: this.area.name });
    return writeSave(data);
  }

  private fastTravel(dest: TravelDestination): void {
    const target = allSavePoints().find((p) => p.id === dest.id);
    if (!target) return;
    this.ctx.states.push(
      new TransitionState(this.ctx, () => this.loadArea(target.area, target.id), {
        duration: 0.6,
        hold: 1.1,
        caption: `O Aether carrega você...\n${dest.name}`,
      }),
    );
  }

  private openPause(): void {
    this.ctx.states.push(new PauseState(this.ctx, { area: this.area.id }));
  }

  // -- Batalha ----------------------------------------------------------------------

  /** Encostou num mob do mapa. */
  private startBattle(enemy: MapEnemy): void {
    const surprise = enemy.isBehind(this.player.position);
    enemy.startBattle();
    enemy.faceTowards(this.player.position);
    this.player.lookAt(enemy.position);
    this.beginBattle(
      enemy.mobId,
      enemy.position,
      {
        hurt: () => enemy.model.hurt(),
        defeated: () => enemy.defeat(),
        spared: () => enemy.spare(),
        done: (result) => {
          if (result === 'fuga' || result === 'derrota') enemy.resume();
          if (result === 'fuga') {
            // Dá um passo para trás, para longe do mob.
            const away = this.tmp.subVectors(this.player.position, enemy.position).setY(0).normalize();
            this.player.teleport(this.player.position.x + away.x * 0.8, this.player.position.z + away.z * 0.8);
            this.area.collision.resolve(this.player.position, this.player.config.radius);
          }
        },
      },
      surprise,
    );
  }

  /** Começa uma batalha contra um mob do mapa, um NPC ou um inimigo de história. */
  private beginBattle(
    mobId: string,
    position: THREE.Vector3,
    hooks: {
      hurt?: () => void;
      defeated?: () => void;
      spared?: () => void;
      done?: (result: BattleResult) => void;
    },
    surprise = false,
  ): void {
    this.player.stop();
    this.battleFocus = position;
    this.area.setBattleMode?.(true);
    this.target = undefined;
    this.areaTitleTimer = 0;
    this.areaTitle.classList.remove('visible');

    const host: BattleHost = {
      enemyScreenPoint: () => this.screenPoint(position, 1.1),
      enemyHurt: () => {
        hooks.hurt?.();
        this.player.model.playOnce(ATTACK_ANIMATION);
      },
      enemyDefeated: () => hooks.defeated?.(),
      enemySpared: () => hooks.spared?.(),
      finish: (result) => {
        hooks.done?.(result);
        this.endBattle(mobId, result);
      },
    };
    this.ctx.states.push(new BattleState(this.ctx, mobId, host, { surprise }));
  }

  private endBattle(mobId: string, result: BattleResult): void {
    this.battleFocus = undefined;
    this.area.setBattleMode?.(false);
    this.grace = this.ctx.config.batalha.pausaAposToque;

    // Flags para missões e diálogos: "poupou:<mob>", "venceu:<mob>", e as do JSON do mob.
    if (result === 'poupado') {
      this.ctx.flags.set('poupou-um-mob');
      this.ctx.flags.set(`poupou:${mobId}`);
    }
    if (result === 'vitoria') {
      this.ctx.flags.set('venceu-um-mob');
      this.ctx.flags.set(`venceu:${mobId}`);
    }
    if (result === 'vitoria' || result === 'poupado') {
      for (const f of mob(mobId).marcar ?? []) this.ctx.flags.set(f);
    }

    if (result === 'derrota') {
      this.ctx.states.push(
        new TransitionState(
          this.ctx,
          () => {
            // Derrota: alguém da Guarda leva o Ryben para o salão.
            this.ctx.player.restore();
            const part2 = this.ctx.flags.has('parte-2');
            const rescue = part2 ? RESCUE_PART_TWO : RESCUE;
            this.loadArea(rescue.area, rescue.spawn);
            this.pendingDialogue = part2 ? 'resgate-resistencia' : 'orin-resgate';
          },
          { duration: 0.8, hold: 0.6 },
        ),
      );
    }
    this.syncEnemies();
  }

  /** Projeta um ponto do mundo para pixels da tela. */
  private screenPoint(world: THREE.Vector3, height: number): { x: number; y: number } {
    const p = this.tmp.copy(world).setY(height).project(this.rig.camera);
    const canvas = this.ctx.renderer.gl.domElement;
    return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  /** Posiciona o aviso de interação sobre o objeto, na tela. */
  private placePrompt(): void {
    const target = this.ctx.states.top === this ? this.target : undefined;
    if (!target) {
      this.prompt.classList.remove('visible');
      return;
    }
    this.promptText.textContent = promptLabel(target);
    const p = this.screenPoint(target.position, promptHeight(target));
    this.prompt.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    this.prompt.classList.add('visible');
  }
}
