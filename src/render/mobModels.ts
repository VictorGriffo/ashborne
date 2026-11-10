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

const FACTORIES: Record<string, () => MobModel> = {
  brotinho: () => new SproutModel(),
};

/** Cria o modelo de um mob pelo nome usado em data/mobs.json. */
export function createMobModel(kind: string): MobModel {
  const factory = FACTORIES[kind];
  if (!factory) throw new Error(`Modelo de mob desconhecido: ${kind}`);
  return factory();
}
