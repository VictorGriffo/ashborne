import * as THREE from 'three';
import { damp } from '../core/math';
import { PART1 } from './palette';

/** Humor do mob, que muda a animação. */
export type MobMood = 'idle' | 'walk' | 'battle' | 'happy';

/** Modelo de mob visto no mapa e na batalha. Olha para +Z. */
export interface MobModel {
  readonly root: THREE.Object3D;
  animate(dt: number, mood: MobMood): void;
  /** Tremida e brilho de quando leva um golpe. */
  hurt(): void;
  /** Some aos poucos; `progress` de 0 a 1. */
  vanish(progress: number): void;
}

/**
 * Brotinho de Aether, feito de formas simples: um bulbo com duas folhas,
 * uma gota de Aether na testa e olhinhos. Pequeno, medroso e brilhante.
 */
class SproutModel implements MobModel {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly leafL = new THREE.Group();
  private readonly leafR = new THREE.Group();
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private readonly glow: THREE.PointLight;
  private time = Math.random() * 10;
  private shake = 0;
  private hop = 0;

  constructor() {
    const mat = (color: number, emissive = 0x000000, intensity = 0) =>
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, flatShading: true, roughness: 0.7 });

    this.bodyMat = mat(0x5fbf8a, 0x1f4d3a, 0.4);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), this.bodyMat);
    body.scale.set(1, 0.88, 1);
    body.position.y = 0.27;

    const leafMat = mat(PART1.leaf, 0x1f4d3a, 0.3);
    for (const [leaf, side] of [
      [this.leafL, 1],
      [this.leafR, -1],
    ] as const) {
      leaf.position.set(0.05 * side, 0.5, 0);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 4), leafMat);
      blade.scale.set(1, 1, 0.35);
      blade.position.y = 0.19;
      leaf.add(blade);
      leaf.rotation.z = -0.55 * side;
      this.rig.add(leaf);
    }

    const dew = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.06, 0),
      mat(PART1.aetherCyan, PART1.aetherCyan, 2.2),
    );
    dew.position.set(0, 0.42, 0.18);
    dew.scale.set(0.8, 1.2, 0.8);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0b1018 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xd99ab8 });
    for (const side of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03), eyeMat);
      eye.position.set(0.09 * side, 0.29, 0.245);
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.02), cheekMat);
      cheek.position.set(0.15 * side, 0.22, 0.225);
      const foot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(0x3a8a64));
      foot.position.set(0.11 * side, 0.04, 0.05);
      this.rig.add(eye, cheek, foot);
    }

    this.glow = new THREE.PointLight(PART1.aetherCyan, 1.6, 2.6, 1.6);
    this.glow.position.set(0, 0.55, 0.2);

    this.rig.add(body, dew, this.glow);
    this.root.add(this.rig);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  animate(dt: number, mood: MobMood): void {
    this.time += dt;
    const t = this.time;

    // Pulos ao andar, respiração parado, tremedeira na batalha.
    const targetHop = mood === 'walk' ? 1 : 0;
    this.hop += (targetHop - this.hop) * damp(10, dt);
    const bounce = Math.abs(Math.sin(t * 9)) * 0.13 * this.hop;
    const breath = Math.sin(t * 3) * 0.035;
    const happy = mood === 'happy' ? Math.abs(Math.sin(t * 4)) * 0.08 : 0;

    this.rig.position.y = bounce + happy;
    this.rig.scale.set(1 - breath * 0.5, 1 + breath, 1 - breath * 0.5);
    this.rig.rotation.z = mood === 'battle' ? Math.sin(t * 28) * 0.035 : Math.sin(t * 1.3) * 0.04;

    const sway = mood === 'happy' ? Math.sin(t * 6) * 0.35 : Math.sin(t * 2.1) * 0.12;
    this.leafL.rotation.z = -0.55 + sway;
    this.leafR.rotation.z = 0.55 - sway;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const k = this.shake / 0.45;
      this.rig.position.x = Math.sin(t * 70) * 0.07 * k;
      this.bodyMat.emissive.setRGB(0.25 + k * 0.75, 0.3 + k * 0.7, 0.24 + k * 0.76);
      this.bodyMat.emissiveIntensity = 0.4 + k * 0.8;
    } else {
      this.rig.position.x = 0;
      this.bodyMat.emissive.set(0x1f4d3a);
      this.bodyMat.emissiveIntensity = mood === 'happy' ? 0.6 + Math.sin(t * 4) * 0.2 : 0.4;
    }
    this.glow.intensity = (mood === 'happy' ? 2.4 : 1.6) + Math.sin(t * 2.7) * 0.3;
  }

  hurt(): void {
    this.shake = 0.45;
  }

  vanish(progress: number): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const s = 1 - p * p;
    this.root.scale.set(s, 1 + p * 0.6, s);
    this.root.position.y += p * 0.02;
    this.glow.intensity = 1.6 + p * 6;
    this.root.visible = p < 1;
  }
}

const flatMat = (color: number, emissive = 0x000000, intensity = 0) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, flatShading: true, roughness: 0.8 });

/**
 * Base para os mobs simples: um "rig" que balança, tremida ao levar golpe
 * e sumiço ao ser vencido. Cada mob só descreve as partes e o movimento.
 */
abstract class SimpleMob implements MobModel {
  readonly root = new THREE.Group();
  protected readonly rig = new THREE.Group();
  protected time = Math.random() * 10;
  protected moving = 0;
  private shake = 0;
  private readonly flashMats: THREE.MeshStandardMaterial[] = [];

  constructor() {
    this.root.add(this.rig);
  }

  /** Registra materiais que piscam ao levar golpe. */
  protected flashable(...mats: THREE.MeshStandardMaterial[]): void {
    this.flashMats.push(...mats);
  }

  protected finish(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  protected abstract pose(dt: number, mood: MobMood): void;

  animate(dt: number, mood: MobMood): void {
    this.time += dt;
    this.moving += ((mood === 'walk' ? 1 : 0) - this.moving) * damp(10, dt);
    this.pose(dt, mood);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const k = this.shake / 0.45;
      this.rig.position.x = Math.sin(this.time * 70) * 0.08 * k;
      for (const m of this.flashMats) m.emissiveIntensity = k * 0.9;
    } else {
      this.rig.position.x = 0;
      for (const m of this.flashMats) m.emissiveIntensity = 0;
    }
  }

  hurt(): void {
    this.shake = 0.45;
  }

  vanish(progress: number): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const s = 1 - p * p;
    this.root.scale.set(s, 1 + p * 0.6, s);
    this.root.visible = p < 1;
  }
}

/** Boneco de treino: poste, corpo de palha e saco de cabeça. Não sai do lugar. */
class DummyModel extends SimpleMob {
  constructor() {
    super();
    const straw = flatMat(0xc8a860, 0xffffff, 0.3);
    this.flashable(straw);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 6), flatMat(0x6b4a33));
    post.position.y = 0.7;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.6, 7), straw);
    body.position.y = 0.95;
    const arms = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), flatMat(0x6b4a33));
    arms.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), flatMat(0xd8c090));
    head.position.y = 1.45;
    const target = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10), flatMat(0xa83a3a));
    target.rotation.x = Math.PI / 2;
    target.position.set(0, 0.98, 0.29);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.12, 8), flatMat(0x4b3527));
    base.position.y = 0.06;
    this.rig.add(post, body, arms, head, target, base);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    this.rig.rotation.z = Math.sin(this.time * (mood === 'battle' ? 6 : 1.5)) * (mood === 'battle' ? 0.06 : 0.02);
  }
}

/** Corvo Curioso: corpo escuro, bico, asas que batem e cabeça que inclina. */
class CrowModel extends SimpleMob {
  private readonly wingL = new THREE.Group();
  private readonly wingR = new THREE.Group();
  private readonly head = new THREE.Group();

  constructor() {
    super();
    const feathers = flatMat(0x1c2333, 0xffffff);
    this.flashable(feathers);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), feathers);
    body.scale.set(0.9, 0.85, 1.3);
    body.position.y = 0.42;
    this.head.position.set(0, 0.62, 0.2);
    const headMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), feathers);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), flatMat(0xd9a443));
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.15;
    const eyeMat = new THREE.MeshBasicMaterial({ color: PART1.aetherCyan });
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), eyeMat);
      eye.position.set(0.07 * s, 0.03, 0.09);
      this.head.add(eye);
    }
    this.head.add(headMesh, beak);
    for (const [wing, s] of [
      [this.wingL, 1],
      [this.wingR, -1],
    ] as const) {
      wing.position.set(0.17 * s, 0.48, 0);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.3), feathers);
      blade.position.x = 0.2 * s;
      wing.add(blade);
      this.rig.add(wing);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), feathers);
    tail.rotation.x = -Math.PI / 2.5;
    tail.position.set(0, 0.42, -0.3);
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4), flatMat(0xd9a443));
      leg.position.set(0.07 * s, 0.11, 0);
      this.rig.add(leg);
    }
    this.rig.add(body, this.head, tail);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const flap = mood === 'battle' || this.moving > 0.3 ? Math.sin(t * 18) * 0.9 : Math.sin(t * 2) * 0.1;
    this.wingL.rotation.z = flap;
    this.wingR.rotation.z = -flap;
    this.rig.position.y = mood === 'battle' ? 0.3 + Math.sin(t * 4) * 0.1 : this.moving * Math.abs(Math.sin(t * 10)) * 0.12;
    this.head.rotation.z = Math.sin(t * 1.7) * 0.35; // cabeça inclinada, curiosa
  }
}

/** Lobo da Estrada (ou Lobo Alfa, maior e mais escuro): quatro patas que andam de verdade. */
class WolfModel extends SimpleMob {
  private readonly legs: THREE.Group[] = [];
  private readonly tail = new THREE.Group();
  private readonly headGroup = new THREE.Group();

  constructor(alpha = false) {
    super();
    const fur = flatMat(alpha ? 0x3a3f5c : 0x6a7080, 0xffffff);
    const furDark = flatMat(alpha ? 0x252838 : 0x4a5060);
    this.flashable(fur);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.95), fur);
    body.position.y = 0.62;
    const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), fur);
    chest.position.set(0, 0.68, 0.38);
    this.headGroup.position.set(0, 0.86, 0.55);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), fur);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.24), furDark);
    snout.position.set(0, -0.05, 0.24);
    const eyeMat = new THREE.MeshBasicMaterial({ color: alpha ? 0xe2704a : 0xffd08a });
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), furDark);
      ear.position.set(0.1 * s, 0.2, -0.04);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), eyeMat);
      eye.position.set(0.09 * s, 0.04, 0.165);
      this.headGroup.add(ear, eye);
    }
    this.headGroup.add(head, snout);
    for (const [x, z] of [
      [0.14, 0.33],
      [-0.14, 0.33],
      [0.14, -0.33],
      [-0.14, -0.33],
    ]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.48, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), furDark);
      m.position.y = -0.24;
      leg.add(m);
      this.legs.push(leg);
      this.rig.add(leg);
    }
    this.tail.position.set(0, 0.72, -0.48);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 5), fur);
    tailMesh.rotation.x = -Math.PI / 1.6;
    tailMesh.position.z = -0.18;
    this.tail.add(tailMesh);
    this.rig.add(body, chest, this.headGroup, this.tail);
    if (alpha) this.root.scale.setScalar(1.35);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const gait = Math.sin(t * 11) * 0.6 * this.moving;
    this.legs[0].rotation.x = gait;
    this.legs[3].rotation.x = gait;
    this.legs[1].rotation.x = -gait;
    this.legs[2].rotation.x = -gait;
    this.tail.rotation.y = Math.sin(t * (mood === 'happy' ? 12 : 3)) * (mood === 'happy' ? 0.8 : 0.25);
    this.headGroup.rotation.x = mood === 'battle' ? 0.25 + Math.sin(t * 8) * 0.05 : Math.sin(t * 1.2) * 0.05;
    this.rig.position.y = Math.abs(Math.sin(t * 11)) * 0.04 * this.moving;
  }
}

/** Gato de Telhado: pequeno, rabo comprido, orelhas pontudas. */
class CatModel extends SimpleMob {
  private readonly tail = new THREE.Group();

  constructor() {
    super();
    const fur = flatMat(0xd98a4a, 0xffffff, 0.3);
    this.flashable(fur);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.45), fur);
    body.position.y = 0.26;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), fur);
    head.position.set(0, 0.42, 0.24);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7fe0d0 });
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), fur);
      ear.position.set(0.07 * s, 0.55, 0.22);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), eyeMat);
      eye.position.set(0.05 * s, 0.44, 0.36);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), fur);
      leg.position.set(0.07 * s, 0.09, 0.15);
      const back = leg.clone();
      back.position.z = -0.15;
      this.rig.add(ear, eye, leg, back);
    }
    this.tail.position.set(0, 0.32, -0.22);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.45, 5), fur);
    tailMesh.position.y = 0.2;
    tailMesh.rotation.x = -0.4;
    this.tail.add(tailMesh);
    this.rig.add(body, head, this.tail);
    this.finish();
  }

  protected pose(): void {
    const t = this.time;
    this.tail.rotation.z = Math.sin(t * 2.4) * 0.5;
    this.rig.position.y = Math.abs(Math.sin(t * 12)) * 0.05 * this.moving;
  }
}

/** Sentinela do Santuário: pedra flutuante com um olho de Aether e anéis de runas. */
class SentinelModel extends SimpleMob {
  private readonly ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.03, 4, 20),
    new THREE.MeshBasicMaterial({ color: PART1.aetherLilac }),
  );
  private readonly eye: THREE.Mesh;

  constructor() {
    super();
    const stone = flatMat(0x5a6378, 0xffffff, 0.3);
    this.flashable(stone);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), stone);
    core.scale.set(1, 1.4, 1);
    core.position.y = 1.1;
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: PART1.aetherCyan }));
    this.eye.position.set(0, 1.15, 0.27);
    this.ring.position.y = 1.1;
    const light = new THREE.PointLight(PART1.aetherCyan, 2, 3, 1.6);
    light.position.set(0, 1.2, 0.5);
    for (const s of [1, -1]) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.14, 0), stone);
      shard.position.set(0.5 * s, 1.1, 0);
      this.rig.add(shard);
    }
    this.rig.add(core, this.eye, this.ring, light);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    this.rig.position.y = Math.sin(t * 1.6) * 0.1;
    this.ring.rotation.set(Math.PI / 2 + Math.sin(t) * 0.3, t * (mood === 'battle' ? 3 : 1), 0);
    this.eye.scale.setScalar(mood === 'happy' ? 0.6 : 1 + Math.sin(t * 5) * 0.1);
    this.rig.rotation.y = mood === 'battle' ? Math.sin(t * 3) * 0.2 : 0;
  }
}

/** Guardião do Coração: golem de pedra grande, com runas acesas e passos pesados. */
class GuardianModel extends SimpleMob {
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();

  constructor() {
    super();
    const stone = flatMat(0x4d5466, 0xffffff, 0.3);
    const dark = flatMat(0x3d4457);
    this.flashable(stone);
    const runes = new THREE.MeshStandardMaterial({ color: PART1.aetherCyan, emissive: PART1.aetherCyan, emissiveIntensity: 1.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 0.75), stone);
    torso.position.y = 1.55;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), dark);
    belly.position.y = 0.9;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), stone);
    head.position.y = 2.28;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.04), runes);
    visor.position.set(0, 2.3, 0.26);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), runes);
    core.position.set(0, 1.6, 0.4);
    for (const [arm, s] of [
      [this.armL, 1],
      [this.armR, -1],
    ] as const) {
      arm.position.set(0.75 * s, 1.95, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, 0.36), stone);
      upper.position.y = -0.45;
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.46), dark);
      fist.position.y = -1.05;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.1), runes);
      rune.position.set(0.19 * s, -0.4, 0);
      arm.add(upper, fist, rune);
      this.rig.add(arm);
    }
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.45), dark);
      leg.position.set(0.3 * s, 0.35, 0);
      this.rig.add(leg);
    }
    const light = new THREE.PointLight(PART1.aetherCyan, 4, 5, 1.6);
    light.position.set(0, 1.8, 0.8);
    this.rig.add(torso, belly, head, visor, core, light);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const swing = mood === 'battle' ? Math.sin(t * 2) * 0.25 : Math.sin(t * 0.8) * 0.06;
    this.armL.rotation.x = swing;
    this.armR.rotation.x = -swing;
    this.rig.position.y = Math.sin(t * 0.8) * 0.03;
  }
}

/** Cinzento: um vulto de cinza, com olhos de brasa, que flutua e se desfaz nas bordas. */
class AshlingModel extends SimpleMob {
  private readonly puffs: THREE.Mesh[] = [];
  private readonly eyes: THREE.Mesh[] = [];

  constructor() {
    super();
    const ash = new THREE.MeshStandardMaterial({
      color: 0x6a6470,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.88,
    });
    this.flashable(ash);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 7), ash);
    body.position.y = 0.62;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), ash);
    head.position.y = 1.22;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe2704a });
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.04), eyeMat);
      eye.position.set(0.1 * s, 1.25, 0.23);
      this.eyes.push(eye);
      this.rig.add(eye);
    }
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + (i % 2) * 0.05, 0), ash);
      puff.position.set(Math.cos(i * 1.3) * 0.38, 0.2 + i * 0.1, Math.sin(i * 1.3) * 0.3);
      this.puffs.push(puff);
      this.rig.add(puff);
    }
    this.rig.add(body, head);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    this.rig.position.y = 0.15 + Math.sin(t * 1.8) * 0.1;
    this.rig.rotation.z = Math.sin(t * 1.1) * 0.08;
    this.puffs.forEach((p, i) => {
      p.position.y = 0.2 + ((t * 0.3 + i * 0.2) % 1) * 1.1;
      p.scale.setScalar(1 - ((t * 0.3 + i * 0.2) % 1) * 0.7);
    });
    const calm = mood === 'happy';
    for (const e of this.eyes) e.scale.y = calm ? 0.2 : 1 + Math.sin(t * 4) * 0.2;
  }
}

/** Soldado de Vaelor: armadura roxa, elmo com crista e lança. */
class SoldierModel extends SimpleMob {
  private readonly legs: THREE.Mesh[] = [];
  private readonly spear = new THREE.Group();

  constructor() {
    super();
    const armor = flatMat(0x3a1f66, 0xffffff);
    const steel = flatMat(0x7a7f90);
    this.flashable(armor);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.34), armor);
    body.position.y = 1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), steel);
    head.position.y = 1.55;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.34), flatMat(0xb9a6ff, 0xb9a6ff, 0.6));
    crest.position.y = 1.8;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.04), new THREE.MeshBasicMaterial({ color: 0xe2704a }));
    visor.position.set(0, 1.56, 0.16);
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22), armor);
      leg.position.set(0.15 * s, 0.35, 0);
      this.legs.push(leg);
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.34), steel);
      pauldron.position.set(0.42 * s, 1.28, 0);
      this.rig.add(leg, pauldron);
    }
    this.spear.position.set(0.52, 1, 0.1);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5), flatMat(0x4b3527));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), steel);
    tip.position.y = 1.15;
    this.spear.add(shaft, tip);
    this.rig.add(body, head, crest, visor, this.spear);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const gait = Math.sin(t * 8) * 0.5 * this.moving;
    this.legs[0].rotation.x = gait;
    this.legs[1].rotation.x = -gait;
    this.spear.rotation.z = mood === 'battle' ? Math.sin(t * 5) * 0.2 : 0.05;
    this.rig.position.y = Math.abs(Math.sin(t * 8)) * 0.04 * this.moving;
  }
}

/** Espantalho Vivo: palha, poste nas costas, braços que balançam e andar torto. */
class ScarecrowModel extends SimpleMob {
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();

  constructor() {
    super();
    const straw = flatMat(0xc8a860, 0xffffff);
    const cloth = flatMat(0x6a4a7a);
    this.flashable(straw);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.8, 7), cloth);
    body.position.y = 1;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), straw);
    head.position.y = 1.65;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.32, 6), flatMat(0x4b3527));
    hat.position.y = 1.98;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 8), flatMat(0x4b3527));
    brim.position.y = 1.84;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe2704a });
    for (const s of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), eyeMat);
      eye.position.set(0.09 * s, 1.68, 0.24);
      this.rig.add(eye);
    }
    for (const [arm, s] of [
      [this.armL, 1],
      [this.armR, -1],
    ] as const) {
      arm.position.set(0.3 * s, 1.3, 0);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 5), flatMat(0x6b4a33));
      stick.rotation.z = (Math.PI / 2) * s;
      stick.position.x = 0.42 * s;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 5), straw);
      tuft.rotation.z = -(Math.PI / 2) * s;
      tuft.position.x = 0.88 * s;
      arm.add(stick, tuft);
      this.rig.add(arm);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), flatMat(0x6b4a33));
    pole.position.set(0, 0.75, -0.12);
    this.rig.add(body, head, hat, brim, pole);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const wave = mood === 'battle' ? Math.sin(t * 7) * 0.5 : Math.sin(t * 1.4) * 0.12;
    this.armL.rotation.z = wave + this.moving * Math.sin(t * 6) * 0.3;
    this.armR.rotation.z = -wave - this.moving * Math.sin(t * 6) * 0.3;
    this.rig.rotation.z = Math.sin(t * 5) * 0.08 * this.moving + Math.sin(t * 0.9) * 0.03;
    this.rig.position.y = Math.abs(Math.sin(t * 5)) * 0.1 * this.moving;
  }
}

/** Javali de Cinzas: corpo pesado, presas e fendas de brasa no lombo. */
class BoarModel extends SimpleMob {
  private readonly legs: THREE.Mesh[] = [];

  constructor() {
    super();
    const hide = flatMat(0x4a4450, 0xffffff);
    const dark = flatMat(0x2a2630);
    this.flashable(hide);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), hide);
    body.scale.set(0.9, 0.8, 1.35);
    body.position.y = 0.68;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.5), hide);
    head.position.set(0, 0.68, 0.72);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.26), dark);
    snout.position.set(0, 0.6, 1.02);
    const embers = flatMat(0xe2704a, 0xe2704a, 1.6);
    for (let i = 0; i < 4; i++) {
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.28), embers);
      crack.position.set(((i % 2) - 0.5) * 0.3, 1.08 - Math.abs(i - 1.5) * 0.04, -0.2 + i * 0.22);
      crack.castShadow = false;
      this.rig.add(crack);
    }
    for (const s of [1, -1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 4), flatMat(0xe6e0d0));
      tusk.position.set(0.18 * s, 0.58, 1.0);
      tusk.rotation.x = -0.6;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: 0xe2704a }));
      eye.position.set(0.15 * s, 0.78, 0.96);
      this.rig.add(tusk, eye);
    }
    for (const [x, z] of [
      [0.22, 0.4],
      [-0.22, 0.4],
      [0.22, -0.4],
      [-0.22, -0.4],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), dark);
      leg.position.set(x, 0.23, z);
      this.legs.push(leg);
      this.rig.add(leg);
    }
    this.rig.add(body, head, snout);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    const gait = Math.sin(t * 9) * 0.5 * this.moving;
    this.legs[0].rotation.x = gait;
    this.legs[3].rotation.x = gait;
    this.legs[1].rotation.x = -gait;
    this.legs[2].rotation.x = -gait;
    this.rig.rotation.x = mood === 'battle' ? Math.sin(t * 6) * 0.05 : 0;
    this.rig.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * this.moving;
  }
}

/** Cores e arma de cada general, para reaproveitar o mesmo modelo. */
interface GeneralStyle {
  armor: number;
  trim: number;
  glow: number;
  weapon: 'machado' | 'martelo' | 'lanca';
}

/** General de Vaelor: armadura pesada, elmo com chifres e uma arma enorme. */
class GeneralModel extends SimpleMob {
  private readonly weapon = new THREE.Group();

  constructor(style: GeneralStyle) {
    super();
    const armor = flatMat(style.armor, 0xffffff);
    const trim = flatMat(style.trim);
    const glow = flatMat(style.glow, style.glow, 1.8);
    this.flashable(armor);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.6), armor);
    torso.position.y = 1.5;
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), trim);
    waist.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.46), trim);
    head.position.y = 2.2;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.04), glow);
    visor.position.set(0, 2.2, 0.24);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glow);
    core.position.set(0, 1.5, 0.34);
    for (const s of [1, -1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 5), trim);
      horn.position.set(0.28 * s, 2.55, 0);
      horn.rotation.z = -0.5 * s;
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.6), trim);
      shoulder.position.set(0.72 * s, 1.95, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.3), armor);
      arm.position.set(0.78 * s, 1.35, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.4), trim);
      leg.position.set(0.26 * s, 0.4, 0);
      this.rig.add(horn, shoulder, arm, leg);
    }
    // Arma na mão direita
    this.weapon.position.set(-0.85, 1.0, 0.2);
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), flatMat(0x4b3527));
    haft.position.y = 0.5;
    this.weapon.add(haft);
    if (style.weapon === 'martelo') {
      const headW = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), trim);
      headW.position.y = 1.5;
      this.weapon.add(headW);
    } else if (style.weapon === 'lanca') {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 4), trim);
      tip.position.y = 1.9;
      this.weapon.add(tip);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.06), trim);
      blade.position.set(0.3, 1.45, 0);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.08), glow);
      edge.position.set(0.66, 1.45, 0);
      this.weapon.add(blade, edge);
    }
    const light = new THREE.PointLight(style.glow, 4, 5, 1.6);
    light.position.set(0, 1.8, 0.8);
    this.rig.add(torso, waist, head, visor, core, this.weapon, light);
    this.finish();
  }

  protected pose(_dt: number, mood: MobMood): void {
    const t = this.time;
    this.rig.position.y = Math.sin(t * 0.9) * 0.03;
    this.weapon.rotation.z = mood === 'battle' ? Math.sin(t * 2.2) * 0.35 : 0.05;
    this.rig.rotation.y = mood === 'battle' ? Math.sin(t * 1.4) * 0.12 : 0;
  }
}

const FACTORIES: Record<string, () => MobModel> = {
  cinzento: () => new AshlingModel(),
  soldado: () => new SoldierModel(),
  espantalho: () => new ScarecrowModel(),
  javali: () => new BoarModel(),
  'general-orsa': () => new GeneralModel({ armor: 0x5a4a2e, trim: 0x8a6a3a, glow: 0x9acd5a, weapon: 'machado' }),
  brotinho: () => new SproutModel(),
  boneco: () => new DummyModel(),
  corvo: () => new CrowModel(),
  lobo: () => new WolfModel(),
  'lobo-alfa': () => new WolfModel(true),
  gato: () => new CatModel(),
  sentinela: () => new SentinelModel(),
  guardiao: () => new GuardianModel(),
};

/** Cria o modelo de um mob pelo nome usado em data/mobs.json. */
export function createMobModel(kind: string): MobModel {
  const factory = FACTORIES[kind];
  if (!factory) throw new Error(`Modelo de mob desconhecido: ${kind}`);
  return factory();
}
