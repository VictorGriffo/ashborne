import * as THREE from 'three';
import { createRandom, range } from '../core/random';
import type { Assets } from '../render/Assets';
import { distanceToPolyline, glowSprite, merged, paint, vertexMaterial } from '../render/geometry';
import { PART1, PROPS } from '../render/palette';
import { buildProp, isProp, type PropParams, type PropResult } from '../render/props';
import { SavePointModel } from '../render/SavePointModel';
import { check, type Condition } from '../systems/conditions';
import type { Flags } from '../systems/Flags';
import type { Reward } from '../systems/Dialogue';
import type { Area, Exit, Spawn } from './Area';
import { characterModels } from './characters';
import { CollisionWorld } from './Collision';
import type { Interactable } from './Interactable';
import { MapEnemy } from './MapEnemy';
import { Npc } from './Npc';

const DEG = Math.PI / 180;

type Vec = number[];

/** Formato de data/areas/*.json com "tipo": "ar-livre". Posições em metros do jogo. */
export interface OutdoorData {
  id: string;
  nome: string;
  tipo: 'ar-livre';
  ambiente: {
    fundo: string;
    nevoa: Vec;
    ceu: string;
    chao: string;
    luzAmbiente: number;
    lua: { cor: string; intensidade: number };
    vagalumes?: number;
    /** Cinzas caindo (Parte 2): quantidade de partículas. */
    cinzas?: number;
    /** Neve caindo: quantidade de partículas. */
    neve?: number;
    grama?: string[];
  };
  /** Retângulo onde se pode andar: { min: [x, z], max: [x, z] }. */
  limite: { min: Vec; max: Vec };
  caminhos?: Array<{ pontos: Vec[]; largura: number; tipo?: GroundKind }>;
  manchas?: Array<{ pos: Vec; raio: number; tipo?: GroundKind }>;
  vegetacao?: {
    arvores?: number;
    dentro?: number;
    pedras?: number;
    grama?: number;
    flores?: number;
    semente?: number;
    /** Formato das árvores: mista (padrão), pinheiro, redonda, seca (galhos nus) ou nenhuma. */
    forma?: 'mista' | 'pinheiro' | 'redonda' | 'seca' | 'palmeira' | 'nenhuma';
    /** Cores das copas (hex). */
    paleta?: string[];
    /** Cor do tronco. */
    tronco?: string;
    /** Cores das pedras [clara, escura]. */
    pedraCor?: string[];
    /** Cor das flores/brotos (padrão: ciano e lilás de Aether). */
    flor?: string[];
  };
  objetos?: Array<
    | (PropParams &
        Condition & {
          tipo: string;
          pos: Vec;
          rot?: number;
          colisor?: 'nenhum';
          /** Acende (evento "selo-restaurado") quando esta flag estiver marcada. */
          acendeSe?: string;
        })
    | { modelo: string; pos: Vec; rot?: number; escala?: number; colisor?: 'nenhum' }
  >;
  npcs?: Array<Condition & { personagem: string; pos: Vec; rot: number; dialogo: string }>;
  mobs?: Array<{ mob: string; pos: Vec }>;
  interativos?: Array<
    | (Condition & { tipo: 'bau'; id: string; pos: Vec; raio: number; conteudo: Reward })
    | (Condition & { tipo: 'save'; id: string; nome: string; pos: Vec; raio: number; chegada: { pos: Vec; rot: number } })
    | (Condition & { tipo: 'examinar'; id: string; rotulo?: string; pos: Vec; raio: number; falas: string[]; marcar?: string[]; acao?: string; brilho?: boolean })
  >;
  entradas: Record<string, { pos: Vec; rot: number }>;
  saidas: Array<{ caixa: Vec; area: string; entrada: string; bloqueio?: Condition & { mensagem: string } }>;
  colisores?: Array<{ caixa: Vec }>;
}

type GroundKind = 'terra' | 'pedra' | 'areia' | 'neve' | 'lama' | 'musgo' | 'praia' | 'agua';

const GROUND_COLORS: Record<GroundKind, [number, number]> = {
  terra: [PROPS.dirtDark, PROPS.dirt],
  pedra: [0x4d5466, 0x5d6578],
  areia: [0x8a7a5c, 0x9c8b6a],
  neve: [0xc4d0e0, 0xdfe8f4],
  lama: [0x3a3326, 0x4a4230],
  musgo: [0x2a4a32, 0x3a5e40],
  praia: [0xa89870, 0xc0ae80],
  agua: [0x1a4a60, 0x2a6a80],
};

interface Animated {
  update(dt: number, t: number): void;
}

/**
 * Área ao ar livre montada a partir de um JSON: chão com trilhas, árvores e
 * pedras espalhadas, objetos de cenário, NPCs, mobs, baús, pontos de save,
 * coisas para examinar e saídas. Vila, Pátio, Estrada e Santuário usam esta classe.
 */
export class OutdoorArea implements Area {
  readonly id: string;
  readonly name: string;
  readonly root = new THREE.Group();
  readonly collision = new CollisionWorld();
  readonly spawns: Record<string, Spawn> = {};
  readonly exits: Exit[] = [];
  readonly npcs: Npc[] = [];
  readonly enemies: MapEnemy[] = [];
  readonly interactables: Interactable[] = [];

  private readonly moon: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly moonOffset = new THREE.Vector3(-7, 16, 9);
  private readonly flickers: Array<{ light: THREE.PointLight; base: number; seed: number }> = [];
  private readonly savePoints = new Map<string, SavePointModel>();
  private readonly animated: Animated[] = [];
  private readonly events = new Map<string, () => void>();
  private readonly exclusions: Array<{ x: number; z: number; r: number }> = [];
  private fireflies?: { points: THREE.Points; base: Float32Array; seed: Float32Array };
  private readonly ash: Array<{ points: THREE.Points; speed: Float32Array; top: number; bottom: number }> = [];
  /** Objetos que só existem (ou só acendem) quando as flags batem. */
  private readonly conditional: Array<{
    object: THREE.Object3D;
    colliders: Array<{ enabled?: boolean }>;
    cond: Condition;
    lightFlag?: string;
    light?: () => void;
    lit: boolean;
  }> = [];
  private fog: THREE.Color;
  private background: THREE.Color;
  private time = 0;
  /** Árvores ficam transparentes durante a batalha, para não esconder ninguém. */
  private readonly fadeMaterials: THREE.MeshStandardMaterial[] = [];
  private fadeOpacity = 1;
  private battle = false;

  /** Modelos que a área precisa carregar. */
  static requiredModels(data: OutdoorData): string[] {
    const models: string[] = [];
    for (const o of data.objetos ?? []) if ('modelo' in o) models.push(o.modelo);
    for (const n of data.npcs ?? []) models.push(...characterModels(n.personagem));
    return models;
  }

  constructor(
    private readonly data: OutdoorData,
    assets: Assets,
  ) {
    this.id = data.id;
    this.name = data.nome;
    this.root.name = data.nome;
    const rand = createRandom(data.vegetacao?.semente ?? 7);
    const amb = data.ambiente;
    this.background = new THREE.Color(amb.fundo);
    this.fog = new THREE.Color(amb.fundo);

    this.hemi = new THREE.HemisphereLight(amb.ceu, amb.chao, amb.luzAmbiente);
    this.moon = new THREE.DirectionalLight(amb.lua.cor, amb.lua.intensidade);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const cam = this.moon.shadow.camera;
    cam.left = cam.bottom = -16;
    cam.right = cam.top = 16;
    cam.near = 1;
    cam.far = 50;
    this.moon.shadow.bias = -0.0004;
    this.moon.shadow.normalBias = 0.03;
    this.root.add(this.hemi, this.moon, this.moon.target);

    // Pontos que a vegetação evita: entradas, saídas, NPCs e objetos.
    for (const e of Object.values(data.entradas)) this.exclusions.push({ x: e.pos[0], z: e.pos[1], r: 2 });
    for (const n of data.npcs ?? []) this.exclusions.push({ x: n.pos[0], z: n.pos[1], r: 1.5 });
    for (const i of data.interativos ?? []) this.exclusions.push({ x: i.pos[0], z: i.pos[1], r: 1.8 });
    for (const m of data.mobs ?? []) this.exclusions.push({ x: m.pos[0], z: m.pos[1], r: 2 });
    for (const s of data.saidas) {
      const [x0, z0, x1, z1] = s.caixa;
      this.exclusions.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: Math.max(x1 - x0, z1 - z0) / 2 + 1.5 });
    }

    this.buildObjects(assets);
    this.root.add(this.buildGround(rand));
    this.buildVegetation(rand);
    if (amb.vagalumes) this.buildFireflies(rand, amb.vagalumes);
    if (amb.cinzas) this.buildAsh(rand, amb.cinzas, 0xb0a8b8, 0.25, 0.7);
    if (amb.neve) this.buildAsh(rand, amb.neve, 0xf4f8ff, 0.5, 1.2);
    this.buildBounds();
    this.buildCharacters(assets);
    this.buildInteractables();

    for (const [name, e] of Object.entries(data.entradas)) {
      this.spawns[name] = { x: e.pos[0], z: e.pos[1], yaw: e.rot * DEG };
    }
    for (const e of data.saidas) {
      const [minX, minZ, maxX, maxZ] = e.caixa;
      this.exits.push({ minX, minZ, maxX, maxZ, to: e.area, spawn: e.entrada, lock: e.bloqueio });
    }
    for (const c of data.colisores ?? []) this.collision.addBox(c.caixa[0], c.caixa[1], c.caixa[2], c.caixa[3]);
  }

  applyEnvironment(scene: THREE.Scene): void {
    scene.background = this.background;
    const [near, far] = this.data.ambiente.nevoa;
    scene.fog = new THREE.Fog(this.fog, near, far);
  }

  animate(dt: number, focus: THREE.Vector3): void {
    this.time += dt;
    const t = this.time;
    this.moon.position.copy(focus).add(this.moonOffset);
    this.moon.target.position.copy(focus);

    for (const f of this.flickers) {
      f.light.intensity = f.base * (1 + Math.sin(t * 9 + f.seed) * 0.07 + Math.sin(t * 23 + f.seed * 3) * 0.05);
    }
    this.updateFade(dt);
    this.updateAsh(dt, t);
    for (const a of this.animated) a.update(dt, t);
    for (const sp of this.savePoints.values()) sp.animate(dt);
    for (const npc of this.npcs) npc.animate(dt);
    for (const enemy of this.enemies) enemy.animate(dt);

    if (this.fireflies) {
      const { points, base, seed } = this.fireflies;
      const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const s = seed[i / 3];
        arr[i] = base[i] + Math.sin(t * 0.4 + s * 6.28) * 0.7;
        arr[i + 1] = base[i + 1] + Math.sin(t * (0.8 + s) + s * 12) * 0.35;
        arr[i + 2] = base[i + 2] + Math.cos(t * 0.33 + s * 9) * 0.7;
      }
      pos.needsUpdate = true;
    }
  }

  activateSavePoint(id: string): void {
    this.savePoints.get(id)?.activate();
  }

  setBattleMode(on: boolean): void {
    this.battle = on;
  }

  private updateFade(dt: number): void {
    const target = this.battle ? 0.18 : 1;
    if (Math.abs(this.fadeOpacity - target) < 0.001) return;
    this.fadeOpacity += (target - this.fadeOpacity) * Math.min(1, dt * 6);
    if (Math.abs(this.fadeOpacity - target) < 0.01) this.fadeOpacity = target;
    const transparent = this.fadeOpacity < 1;
    for (const m of this.fadeMaterials) {
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.depthWrite = !transparent;
        m.needsUpdate = true;
      }
      m.opacity = this.fadeOpacity;
    }
  }

  cutsceneEvent(name: string): void {
    if (name === 'eclipse') {
      // O céu escurece em roxo; a lua vira um aro de luz fraca.
      this.hemi.color.set(0x3a2a5c);
      this.hemi.groundColor.set(0x0a0612);
      this.hemi.intensity = 0.9;
      this.moon.color.set(0x8a6cc8);
      this.moon.intensity = 0.9;
      this.background.set(0x0d0818);
      this.fog.set(0x0d0818);
    }
    this.events.get(name)?.();
  }

  // ---------------------------------------------------------------------------

  /** Altura do chão: plano dentro do limite, subindo em colinas fora dele. */
  private height(x: number, z: number): number {
    const { min, max } = this.data.limite;
    const dx = Math.max(min[0] - x, 0, x - max[0]);
    const dz = Math.max(min[1] - z, 0, z - max[1]);
    const out = Math.hypot(dx, dz);
    const bumps = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.04;
    const rise = Math.max(0, out - 1.5);
    return bumps + Math.pow(rise, 1.3) * 0.3 * (0.8 + 0.4 * Math.sin(x * 0.4 + z * 0.3));
  }

  private outside(x: number, z: number): number {
    const { min, max } = this.data.limite;
    return Math.hypot(Math.max(min[0] - x, 0, x - max[0]), Math.max(min[1] - z, 0, z - max[1]));
  }

  private groundKind(x: number, z: number): GroundKind | null {
    const p = new THREE.Vector2(x, z);
    for (const c of this.data.caminhos ?? []) {
      const pts = c.pontos.map((q) => new THREE.Vector2(q[0], q[1]));
      if (distanceToPolyline(p, pts) < c.largura / 2) return c.tipo ?? 'terra';
    }
    for (const m of this.data.manchas ?? []) {
      if (Math.hypot(x - m.pos[0], z - m.pos[1]) < m.raio) return m.tipo ?? 'terra';
    }
    return null;
  }

  private buildGround(rand: () => number): THREE.Mesh {
    const { min, max } = this.data.limite;
    const size = Math.max(max[0] - min[0], max[1] - min[1]) + 60;
    const cx = (min[0] + max[0]) / 2;
    const cz = (min[1] + max[1]) / 2;
    const seg = Math.round(size * 0.75);
    const indexed = new THREE.PlaneGeometry(size, size, seg, seg);
    indexed.rotateX(-Math.PI / 2);
    indexed.translate(cx, 0, cz);
    const p = indexed.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (rand() - 0.5) * 0.45;
      const z = p.getZ(i) + (rand() - 0.5) * 0.45;
      p.setXYZ(i, x, this.height(x, z), z);
    }
    const geo = indexed.toNonIndexed();
    indexed.dispose();

    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const grass = (this.data.ambiente.grama ?? ['#1F4D3A', '#2E7D5B']).map((c) => new THREE.Color(c));
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const kind = this.groundKind(x, z);
      if (kind) {
        const [a, b] = GROUND_COLORS[kind];
        tmp.lerpColors(new THREE.Color(a), new THREE.Color(b), rand());
      } else {
        tmp.lerpColors(grass[0], grass[1], rand() * 0.35);
        tmp.multiplyScalar(1 - THREE.MathUtils.clamp(this.outside(x, z) / 14, 0, 0.55));
      }
      for (let k = 0; k < 3; k++) tmp.toArray(colors, (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, vertexMaterial(1));
    mesh.receiveShadow = true;
    mesh.name = 'Chão';
    return mesh;
  }

  private free(x: number, z: number, margin: number): boolean {
    if (this.groundKind(x, z) !== null) return false;
    return !this.exclusions.some((e) => Math.hypot(x - e.x, z - e.z) < e.r + margin);
  }

  private buildVegetation(rand: () => number): void {
    const v = this.data.vegetacao ?? {};
    const { min, max } = this.data.limite;
    const foliage: THREE.BufferGeometry[] = [];
    const trunks: THREE.BufferGeometry[] = [];
    const rocks: THREE.BufferGeometry[] = [];
    const tufts: THREE.BufferGeometry[] = [];
    const flowers: THREE.BufferGeometry[] = [];
    const placed: THREE.Vector2[] = [];
    const greens = (v.paleta ?? ['#1F4D3A', '#2E7D5B', '#24584a', '#1d4a44', '#2f6b55']).map((c) => new THREE.Color(c));
    const trunkColor = new THREE.Color(v.tronco ?? PROPS.trunk);
    const shape = v.forma ?? 'mista';

    const addTree = (x: number, z: number, inside: boolean) => {
      if (shape === 'nenhuma') return;
      const scale = range(rand, 0.85, 1.45);
      const y = this.height(x, z) - 0.1;
      const color = greens[Math.floor(rand() * greens.length)].clone();
      const trunk = new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.1 * scale, 6);
      trunk.translate(x, y + 0.55 * scale, z);
      trunks.push(paint(trunk, trunkColor));
      if (shape === 'seca') {
        // Árvore morta: tronco alto e três galhos nus.
        const tall = new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, 1.6 * scale, 5);
        tall.translate(x, y + 1.3 * scale, z);
        trunks.push(paint(tall, trunkColor));
        for (let b = 0; b < 3; b++) {
          const branch = new THREE.CylinderGeometry(0.03 * scale, 0.07 * scale, 0.9 * scale, 4);
          branch.rotateZ(0.9);
          branch.rotateY((b / 3) * Math.PI * 2 + rand());
          branch.translate(x, y + (1.7 + b * 0.25) * scale, z);
          trunks.push(paint(branch, trunkColor));
        }
      } else if (shape === 'palmeira') {
        const tall = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 2.2 * scale, 5);
        tall.rotateZ(0.12);
        tall.translate(x, y + 1.1 * scale, z);
        trunks.push(paint(tall, trunkColor));
        for (let b = 0; b < 6; b++) {
          const frond = new THREE.ConeGeometry(0.16 * scale, 1.3 * scale, 3);
          frond.rotateZ(1.2);
          frond.rotateY((b / 6) * Math.PI * 2);
          frond.translate(x + 0.2, y + 2.25 * scale, z);
          foliage.push(paint(frond, color));
        }
      } else if (shape === 'pinheiro' || (shape === 'mista' && rand() < 0.65)) {
        const layers = rand() < 0.5 ? 3 : 2;
        for (let l = 0; l < layers; l++) {
          const cone = new THREE.ConeGeometry((1.25 - l * 0.3) * scale, (1.4 - l * 0.15) * scale, 7);
          cone.rotateY(rand() * Math.PI);
          cone.translate(x, y + (1.3 + l * 0.75) * scale, z);
          foliage.push(paint(cone, color.clone().offsetHSL(0, 0, l * 0.03)));
        }
      } else {
        const crown = new THREE.IcosahedronGeometry(1.1 * scale, 0);
        crown.scale(1, 0.85, 1);
        crown.translate(x, y + 1.75 * scale, z);
        foliage.push(paint(crown, color));
      }
      if (inside) this.collision.addCircle(x, z, 0.32 * scale);
      placed.push(new THREE.Vector2(x, z));
    };

    // Árvores em volta do limite (moldura) e algumas soltas dentro.
    const ring = v.arvores ?? 60;
    for (let tries = 0; tries < ring * 30 && placed.length < ring; tries++) {
      const x = range(rand, min[0] - 14, max[0] + 14);
      const z = range(rand, min[1] - 14, max[1] + 14);
      const out = this.outside(x, z);
      if (out < 0.6 || out > 13) continue;
      if (!this.free(x, z, 0.5)) continue;
      if (placed.some((q) => Math.hypot(q.x - x, q.y - z) < 2)) continue;
      addTree(x, z, false);
    }
    const inner = v.dentro ?? 0;
    for (let tries = 0, n = 0; tries < inner * 40 && n < inner; tries++) {
      const x = range(rand, min[0] + 1, max[0] - 1);
      const z = range(rand, min[1] + 1, max[1] - 1);
      if (!this.free(x, z, 2) || placed.some((q) => Math.hypot(q.x - x, q.y - z) < 3)) continue;
      addTree(x, z, true);
      n++;
    }

    for (let i = 0; i < (v.pedras ?? 20); i++) {
      const x = range(rand, min[0] - 6, max[0] + 6);
      const z = range(rand, min[1] - 6, max[1] + 6);
      if (!this.free(x, z, 0.8)) continue;
      const size = range(rand, 0.18, 0.5);
      const rock = new THREE.DodecahedronGeometry(size, 0);
      rock.scale(range(rand, 1, 1.5), range(rand, 0.55, 0.85), range(rand, 1, 1.3));
      rock.rotateY(rand() * Math.PI);
      rock.translate(x, this.height(x, z) + size * 0.2, z);
      const [rockLight, rockDark] = v.pedraCor ?? [`#${PROPS.rock.toString(16)}`, `#${PROPS.rockDark.toString(16)}`];
      rocks.push(paint(rock, new THREE.Color(rockLight).lerp(new THREE.Color(rockDark), rand())));
      if (size > 0.35 && this.outside(x, z) === 0) this.collision.addCircle(x, z, size * 1.2);
    }

    const glow = (v.flor ?? ['#7fe0d0', '#b9a6ff']).map((c) => new THREE.Color(c));
    for (let i = 0; i < (v.grama ?? 200); i++) {
      const x = range(rand, min[0] - 4, max[0] + 4);
      const z = range(rand, min[1] - 4, max[1] + 4);
      if (!this.free(x, z, 0)) continue;
      const y = this.height(x, z);
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.ConeGeometry(0.06, range(rand, 0.25, 0.45), 3);
        blade.rotateZ(range(rand, -0.35, 0.35));
        blade.rotateY(rand() * Math.PI * 2);
        blade.translate(x + range(rand, -0.12, 0.12), y + 0.15, z + range(rand, -0.12, 0.12));
        tufts.push(paint(blade, [0x3a8a64, 0x2e7d5b, 0x45946a][b]));
      }
      if (rand() < (v.flores ?? 0.08)) {
        const bloom = new THREE.OctahedronGeometry(0.07, 0);
        bloom.translate(x + 0.2, y + 0.28, z);
        flowers.push(paint(bloom, glow[Math.floor(rand() * glow.length)]));
      }
    }

    const leaves = vertexMaterial(0.9);
    const wood = vertexMaterial(1);
    this.fadeMaterials.push(leaves, wood);
    this.root.add(
      merged(foliage, leaves),
      merged(trunks, wood),
      merged(rocks, vertexMaterial(0.9)),
      merged(tufts, vertexMaterial(0.9), false),
      merged(flowers, new THREE.MeshBasicMaterial({ vertexColors: true }), false),
    );
  }

  private buildObjects(assets: Assets): void {
    for (const o of this.data.objetos ?? []) {
      const rot = (o.rot ?? 0) * DEG;
      const [x, z] = o.pos;
      if ('modelo' in o) {
        const model = assets.instance(o.modelo);
        model.scale.setScalar(o.escala ?? 0.7);
        model.position.set(x, 0, z);
        model.rotation.y = rot;
        this.root.add(model);
        if (o.colisor !== 'nenhum') this.collision.addObject(model, 0.04);
        this.exclusions.push({ x, z, r: 1 });
        continue;
      }
      if (!isProp(o.tipo)) throw new Error(`Objeto desconhecido em ${this.data.id}: ${o.tipo}`);
      const prop = buildProp(o.tipo, o);
      prop.object.position.set(x, 0, z);
      prop.object.rotation.y = rot;
      this.root.add(prop.object);
      const colliders = o.colisor !== 'nenhum' ? this.addPropColliders(prop, x, z, rot) : [];
      if (o.se || o.naoSe || o.acendeSe) {
        const hidden = Boolean(o.se || o.naoSe);
        if (hidden) {
          prop.object.visible = false;
          for (const c of colliders) c.enabled = false;
        }
        this.conditional.push({
          object: prop.object,
          colliders,
          cond: { se: o.se, naoSe: o.naoSe },
          lightFlag: o.acendeSe,
          light: prop.events?.['selo-restaurado'],
          lit: false,
        });
      }
      for (const light of prop.flicker ?? []) this.flickers.push({ light, base: light.intensity, seed: this.flickers.length * 1.7 });
      if (prop.animate) this.animated.push({ update: prop.animate });
      for (const [name, fn] of Object.entries(prop.events ?? {})) this.events.set(name, fn);
      const reach = Math.max(...prop.colliders.map((c) => (c.kind === 'box' ? Math.max(c.w, c.d) / 2 : c.r)), 0.5);
      this.exclusions.push({ x, z, r: reach + 0.5 });
    }
  }

  /** Converte os obstáculos locais do objeto (girado em múltiplos de 90°) para o mundo. */
  private addPropColliders(prop: PropResult, x: number, z: number, rot: number): Array<{ enabled?: boolean }> {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const quarter = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 === 1;
    const made: Array<{ enabled?: boolean }> = [];
    for (const c of prop.colliders) {
      const lx = c.x ?? 0;
      const lz = c.z ?? 0;
      const wx = x + lx * cos + lz * sin;
      const wz = z - lx * sin + lz * cos;
      if (c.kind === 'circle') {
        made.push(this.collision.addCircle(wx, wz, c.r));
      } else {
        const w = quarter ? c.d : c.w;
        const d = quarter ? c.w : c.d;
        made.push(this.collision.addBox(wx - w / 2, wz - d / 2, wx + w / 2, wz + d / 2));
      }
    }
    return made;
  }

  /** Mostra, esconde e acende objetos conforme as flags (a vila se reconstrói aos poucos). */
  refreshFlags(flags: Flags): void {
    for (const c of this.conditional) {
      if (c.cond.se || c.cond.naoSe) {
        const show = check(flags, c.cond);
        c.object.visible = show;
        for (const col of c.colliders) col.enabled = show;
      }
      if (c.lightFlag && !c.lit && flags.has(c.lightFlag)) {
        c.lit = true;
        c.light?.();
      }
    }
  }

  private buildBounds(): void {
    const { min, max } = this.data.limite;
    const t = 4;
    this.collision.addBox(min[0] - t, min[1] - t, max[0] + t, min[1]);
    this.collision.addBox(min[0] - t, max[1], max[0] + t, max[1] + t);
    this.collision.addBox(min[0] - t, min[1], min[0], max[1]);
    this.collision.addBox(max[0], min[1], max[0] + t, max[1]);
  }

  private buildCharacters(assets: Assets): void {
    for (const n of this.data.npcs ?? []) {
      const npc = new Npc(assets, n.personagem, n.pos[0], n.pos[1], n.rot * DEG, n.dialogo, n);
      this.npcs.push(npc);
      this.root.add(npc.model.root);
      this.interactables.push({ kind: 'npc', npc, position: npc.position, radius: npc.radius });
    }
    (this.data.mobs ?? []).forEach((m, i) => {
      const enemy = new MapEnemy(m.mob, m.pos[0], m.pos[1], i * 13 + 5);
      this.enemies.push(enemy);
      this.root.add(enemy.model.root);
    });
  }

  private buildInteractables(): void {
    for (const it of this.data.interativos ?? []) {
      const position = new THREE.Vector3(it.pos[0], 0, it.pos[1]);
      const condition = { se: it.se, naoSe: it.naoSe };
      if (it.tipo === 'bau') {
        this.interactables.push({ kind: 'bau', id: it.id, contents: it.conteudo, position, radius: it.raio, condition });
        const chest = buildProp('caixote', {});
        chest.object.position.copy(position);
        this.root.add(chest.object);
        this.collision.addCircle(position.x, position.z, it.raio * 0.8);
      } else if (it.tipo === 'save') {
        const model = new SavePointModel();
        model.root.position.copy(position);
        this.root.add(model.root);
        this.savePoints.set(it.id, model);
        this.collision.addCircle(position.x, position.z, it.raio);
        const spawn = { x: it.chegada.pos[0], z: it.chegada.pos[1], yaw: it.chegada.rot * DEG };
        this.spawns[it.id] = spawn;
        this.interactables.push({ kind: 'save', id: it.id, name: it.nome, spawn, position, radius: it.raio, condition });
      } else {
        this.interactables.push({
          kind: 'examinar',
          id: it.id,
          label: it.rotulo ?? 'Examinar',
          lines: it.falas,
          marcar: it.marcar,
          acao: it.acao,
          position,
          radius: it.raio,
          condition,
        });
        if (it.brilho) this.addSparkle(position);
      }
    }
  }

  /** Brilho pequeno que chama a atenção para algo examinável. */
  private addSparkle(position: THREE.Vector3): void {
    const spark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      new THREE.MeshBasicMaterial({ color: PART1.aetherCyan }),
    );
    spark.position.copy(position).setY(0.9);
    this.root.add(spark);
    this.animated.push({
      update: (_dt, t) => {
        spark.position.y = 0.9 + Math.sin(t * 2.5) * 0.12;
        spark.rotation.y = t * 2;
        spark.scale.setScalar(0.8 + Math.sin(t * 5) * 0.25);
      },
    });
  }

  /** Cinzas caindo devagar do céu, como neve suja: o mundo depois da catástrofe. */
  private buildAsh(rand: () => number, count: number, color: number, minSpeed: number, maxSpeed: number): void {
    const { min, max } = this.data.limite;
    const top = 11;
    const bottom = 0;
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([range(rand, min[0] - 3, max[0] + 3), range(rand, bottom, top), range(rand, min[1] - 3, max[1] + 3)], i * 3);
      speed[i] = range(rand, minSpeed, maxSpeed);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: glowSprite(),
        color,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    points.frustumCulled = false;
    this.root.add(points);
    this.ash.push({ points, speed, top, bottom });
  }

  private updateAsh(dt: number, t: number): void {
    for (const layer of this.ash) {
      const attr = layer.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= layer.speed[i / 3] * dt;
        arr[i] += Math.sin(t * 0.6 + i) * dt * 0.25;
        if (arr[i + 1] < layer.bottom) arr[i + 1] = layer.top;
      }
      attr.needsUpdate = true;
    }
  }

  private buildFireflies(rand: () => number, count: number): void {
    const { min, max } = this.data.limite;
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color(PART1.aetherCyan);
    const lilac = new THREE.Color(PART1.aetherLilac);
    for (let i = 0; i < count; i++) {
      const x = range(rand, min[0] - 4, max[0] + 4);
      const z = range(rand, min[1] - 4, max[1] + 4);
      base.set([x, this.height(x, z) + range(rand, 0.4, 2.6), z], i * 3);
      seed[i] = rand();
      (rand() < 0.6 ? cyan : lilac).toArray(colors, i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.38,
        map: glowSprite(),
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    points.frustumCulled = false;
    this.root.add(points);
    this.fireflies = { points, base, seed };
  }
}
