import * as THREE from 'three';
import type { Assets } from '../render/Assets';
import { SavePointModel } from '../render/SavePointModel';
import type { Condition } from '../systems/conditions';
import type { Reward } from '../systems/Dialogue';
import type { Area, Exit, Spawn } from './Area';
import type { Interactable } from './Interactable';
import { characterModels } from './characters';
import { CollisionWorld } from './Collision';
import { MapEnemy } from './MapEnemy';
import { Npc } from './Npc';

/** Formato de data/areas/*.json. Posições em unidades do kit; `escala` converte para o mundo. */
export interface RoomData {
  id: string;
  nome: string;
  escala: number;
  ambiente: {
    fundo: string;
    ceu: string;
    chao: string;
    luzAmbiente: number;
    lua: { cor: string; intensidade: number; direcao: number[] };
  };
  piso: { modelo: string; x: number[]; z: number[] };
  objetos: Array<{
    modelo: string;
    /** [x, z] no chão ou [x, y, z]. */
    pos: number[];
    /** Graus. */
    rot?: number;
    /** "caixa" (padrão) cria colisão pelo volume do modelo; "nenhum" não cria. */
    colisor?: 'caixa' | 'nenhum';
    /** Nome de uma luz definida em `luzes`. */
    luz?: string;
  }>;
  luzes: Record<
    string,
    { cor: string; intensidade: number; alcance: number; offset: number[]; tremor?: boolean }
  >;
  /** Caixas extras: [minX, minZ, maxX, maxZ]. */
  colisores: Array<{ caixa: number[] }>;
  npcs: Array<Condition & { personagem: string; pos: number[]; rot: number; dialogo: string }>;
  /** Mobs visíveis no mapa (opcional). */
  mobs?: Array<{ mob: string; pos: number[] }>;
  /** Baús e pontos de save (opcional). */
  interativos?: Array<
    | { tipo: 'bau'; id: string; pos: number[]; raio: number; conteudo: Reward }
    | { tipo: 'save'; id: string; nome: string; pos: number[]; raio: number; chegada: { pos: number[]; rot: number } }
  >;
  entradas: Record<string, { pos: number[]; rot: number }>;
  saidas: Array<{ caixa: number[]; area: string; entrada: string; bloqueio?: Condition & { mensagem: string } }>;
}

/** Grade do kit KayKit: pisos de 4 por 4. */
const TILE = 4;
/** Folga nas caixas de colisão dos móveis, para não enroscar nas quinas. */
const COLLIDER_SHRINK = 0.04;
const DEG = Math.PI / 180;

interface Flicker {
  light: THREE.PointLight;
  base: number;
  seed: number;
}

/** Sala montada a partir de um JSON com peças de um kit modular. */
export class RoomArea implements Area {
  readonly id: string;
  readonly name: string;
  readonly root = new THREE.Group();
  readonly collision = new CollisionWorld();
  readonly spawns: Record<string, Spawn> = {};
  readonly exits: Exit[] = [];
  readonly npcs: Npc[] = [];
  readonly enemies: MapEnemy[] = [];
  readonly interactables: Interactable[] = [];
  readonly cameraOccluders: THREE.Object3D[];

  private readonly flickers: Flicker[] = [];
  private readonly savePoints = new Map<string, SavePointModel>();
  private time = 0;

  /** Modelos que a sala precisa, para carregar antes de montar. */
  static requiredModels(data: RoomData): string[] {
    return [
      data.piso.modelo,
      ...data.objetos.map((o) => o.modelo),
      ...data.npcs.flatMap((n) => characterModels(n.personagem)),
    ];
  }

  constructor(
    private readonly data: RoomData,
    assets: Assets,
  ) {
    this.id = data.id;
    this.name = data.nome;
    const s = data.escala;
    this.root.name = data.nome;

    // Modelos ficam num grupo escalado; luzes e lógica usam coordenadas do mundo.
    const content = new THREE.Group();
    content.scale.setScalar(s);
    this.root.add(content);
    // Sala fechada: a câmera não atravessa as paredes.
    this.cameraOccluders = [content];

    this.buildLighting();

    for (let x = data.piso.x[0]; x <= data.piso.x[1]; x += TILE) {
      for (let z = data.piso.z[0]; z <= data.piso.z[1]; z += TILE) {
        const tile = assets.instance(data.piso.modelo);
        tile.position.set(x, 0, z);
        tile.traverse((o) => (o.castShadow = false));
        content.add(tile);
      }
    }

    for (const obj of data.objetos) {
      const model = assets.instance(obj.modelo);
      const [x, y, z] = obj.pos.length === 3 ? obj.pos : [obj.pos[0], 0, obj.pos[1]];
      const rot = (obj.rot ?? 0) * DEG;
      model.position.set(x, y, z);
      model.rotation.y = rot;
      content.add(model);

      if ((obj.colisor ?? 'caixa') === 'caixa') this.collision.addObject(model, COLLIDER_SHRINK);
      if (obj.luz) this.addLight(obj.luz, x, y, z, rot);
    }

    for (const c of data.colisores) {
      const [x0, z0, x1, z1] = c.caixa;
      this.collision.addBox(x0 * s, z0 * s, x1 * s, z1 * s);
    }

    for (const n of data.npcs) {
      // NPCs não entram na colisão fixa: podem aparecer e sumir (a exploração cuida deles).
      const npc = new Npc(assets, n.personagem, n.pos[0] * s, n.pos[1] * s, n.rot * DEG, n.dialogo, n);
      this.npcs.push(npc);
      this.root.add(npc.model.root);
      this.interactables.push({ kind: 'npc', npc, position: npc.position, radius: npc.radius });
    }

    for (const it of data.interativos ?? []) {
      const position = new THREE.Vector3(it.pos[0] * s, 0, it.pos[1] * s);
      if (it.tipo === 'bau') {
        this.interactables.push({ kind: 'bau', id: it.id, contents: it.conteudo, position, radius: it.raio * s });
      } else {
        const model = new SavePointModel();
        model.root.position.copy(position);
        this.root.add(model.root);
        this.savePoints.set(it.id, model);
        this.collision.addCircle(position.x, position.z, it.raio * s);
        const spawn = { x: it.chegada.pos[0] * s, z: it.chegada.pos[1] * s, yaw: it.chegada.rot * DEG };
        this.spawns[it.id] = spawn;
        this.interactables.push({ kind: 'save', id: it.id, name: it.nome, spawn, position, radius: it.raio * s });
      }
    }

    (data.mobs ?? []).forEach((m, i) => {
      const enemy = new MapEnemy(m.mob, m.pos[0] * s, m.pos[1] * s, i + 1);
      this.enemies.push(enemy);
      this.root.add(enemy.model.root);
    });

    for (const [name, e] of Object.entries(data.entradas)) {
      this.spawns[name] = { x: e.pos[0] * s, z: e.pos[1] * s, yaw: e.rot * DEG };
    }

    for (const e of data.saidas) {
      const [x0, z0, x1, z1] = e.caixa;
      this.exits.push({ minX: x0 * s, minZ: z0 * s, maxX: x1 * s, maxZ: z1 * s, to: e.area, spawn: e.entrada, lock: e.bloqueio });
    }
  }

  applyEnvironment(scene: THREE.Scene): void {
    const bg = new THREE.Color(this.data.ambiente.fundo);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 30, 60);
  }

  animate(dt: number): void {
    this.time += dt;
    const t = this.time;
    for (const f of this.flickers) {
      const wobble = Math.sin(t * 9 + f.seed) * 0.06 + Math.sin(t * 23 + f.seed * 3) * 0.04;
      f.light.intensity = f.base * (1 + wobble);
    }
    for (const npc of this.npcs) npc.animate(dt);
    for (const enemy of this.enemies) enemy.animate(dt);
    for (const sp of this.savePoints.values()) sp.animate(dt);
  }

  activateSavePoint(id: string): void {
    this.savePoints.get(id)?.activate();
  }

  private buildLighting(): void {
    const amb = this.data.ambiente;
    this.root.add(new THREE.HemisphereLight(amb.ceu, amb.chao, amb.luzAmbiente));

    const moon = new THREE.DirectionalLight(amb.lua.cor, amb.lua.intensidade);
    moon.position.fromArray(amb.lua.direcao);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const cam = moon.shadow.camera;
    cam.left = cam.bottom = -11;
    cam.right = cam.top = 11;
    cam.near = 1;
    cam.far = 50;
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.03;
    this.root.add(moon, moon.target);
  }

  private addLight(name: string, x: number, y: number, z: number, rot: number): void {
    const def = this.data.luzes[name];
    if (!def) throw new Error(`Luz "${name}" não definida em ${this.data.id}`);
    const s = this.data.escala;
    const offset = new THREE.Vector3().fromArray(def.offset).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const light = new THREE.PointLight(def.cor, def.intensidade, def.alcance * s, 1.6);
    light.position.set((x + offset.x) * s, (y + offset.y) * s, (z + offset.z) * s);
    this.root.add(light);
    if (def.tremor) this.flickers.push({ light, base: def.intensidade, seed: this.flickers.length * 1.7 });
  }
}
