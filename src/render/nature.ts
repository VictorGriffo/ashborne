import * as THREE from 'three';
import type { Assets } from './Assets';

/**
 * Vegetação do Stylized Nature MegaKit (Quaternius, CC0), em
 * assets/modelos/quaternius-nature. Cada tipo vira InstancedMesh: centenas de
 * árvores ou tufos de grama custam uma chamada de desenho por material.
 */
const KIT = 'quaternius-nature/';

export const NATURE = {
  comum: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'],
  pinheiro: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5'],
  retorcida: ['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3'],
  morta: ['DeadTree_1', 'DeadTree_2', 'DeadTree_3'],
  arbusto: ['Bush_Common', 'Bush_Common_Flowers', 'Fern_1', 'Plant_1', 'Plant_7'],
  grama: ['Grass_Wispy_Tall', 'Grass_Common_Tall', 'Clover_1'],
  flor: ['Flower_3_Group', 'Flower_4_Group'],
  cogumelo: ['Mushroom_Common', 'Mushroom_Laetiporus'],
  pedra: ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'],
  seixo: ['Pebble_Round_1', 'Pebble_Round_3', 'RockPath_Round_Wide'],
} as const;

export type NatureGroup = keyof typeof NATURE;

/** Todos os modelos do kit, para o carregamento inicial. */
export function natureModels(): string[] {
  return Object.values(NATURE).flatMap((list) => list.map((n) => KIT + n));
}

/** Uma planta posicionada. `height` é a altura final desejada (em unidades do mundo). */
export interface Placement {
  x: number;
  y: number;
  z: number;
  height: number;
  rotY: number;
}

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Transformação da peça dentro do modelo, já normalizada para altura 1. */
  matrix: THREE.Matrix4;
}

/** Peças de um modelo, normalizadas: base em y=0 e altura 1. */
const partsCache = new Map<string, Part[]>();

function partsOf(assets: Assets, name: string): Part[] {
  const cached = partsCache.get(name);
  if (cached) return cached;
  const scene = assets.get(KIT + name).scene;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = Math.max(0.001, box.max.y - box.min.y);
  const norm = new THREE.Matrix4()
    .makeScale(1 / h, 1 / h, 1 / h)
    .multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const parts: Part[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      parts.push({ geometry: o.geometry, material: o.material as THREE.Material, matrix: norm.clone().multiply(o.matrixWorld) });
    }
  });
  partsCache.set(name, parts);
  return parts;
}

/** Junta plantas do mesmo modelo em InstancedMeshes. */
export class NatureBatch {
  readonly root = new THREE.Group();
  /** Materiais (cópias) usados; servem para tingir e para o efeito de transparência. */
  readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly byModel = new Map<string, Placement[]>();

  constructor(
    private readonly assets: Assets,
    private readonly options: { tint?: THREE.Color; shadows?: boolean; sway?: boolean } = {},
  ) {}

  add(model: string, p: Placement): void {
    let list = this.byModel.get(model);
    if (!list) this.byModel.set(model, (list = []));
    list.push(p);
  }

  /** Cria as malhas. Chamar depois de todos os `add`. */
  build(): THREE.Group {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const t = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const materialCopies = new Map<THREE.Material, THREE.Material>();
    for (const [model, list] of this.byModel) {
      for (const part of partsOf(this.assets, model)) {
        let material = materialCopies.get(part.material);
        if (!material) {
          material = this.prepare(part.material);
          materialCopies.set(part.material, material);
        }
        const mesh = new THREE.InstancedMesh(part.geometry, material, list.length);
        list.forEach((p, i) => {
          q.setFromAxisAngle(up, p.rotY);
          s.setScalar(p.height);
          t.set(p.x, p.y, p.z);
          m.compose(t, q, s).multiply(part.matrix);
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = this.options.shadows ?? true;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        this.root.add(mesh);
      }
    }
    return this.root;
  }

  private prepare(source: THREE.Material): THREE.Material {
    const mat = source.clone() as THREE.MeshStandardMaterial;
    if (this.options.tint && mat.color) mat.color.multiply(this.options.tint);
    // Folhas recortadas: alphaTest mantém as bordas sem ordenar transparência.
    if (mat.map && (mat.transparent || mat.alphaTest > 0)) {
      mat.transparent = false;
      mat.alphaTest = 0.45;
      mat.side = THREE.DoubleSide;
    }
    if (this.options.sway) addSway(mat);
    this.materials.push(mat);
    return mat;
  }
}

/** Tempo compartilhado pelo vento de todas as plantas. */
export const windTime = { value: 0 };

/** Faz a planta balançar ao vento: o topo se mexe, a base fica parada. */
function addSway(mat: THREE.Material): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = windTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float windTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 wp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 wp = vec3(0.0);
        #endif
        float bend = clamp(transformed.y, 0.0, 3.0);
        float w = sin(windTime * 1.7 + wp.x * 0.35 + wp.z * 0.27) * 0.6 + sin(windTime * 3.1 + wp.x * 0.9) * 0.25;
        transformed.x += w * 0.06 * bend * bend;
        transformed.z += w * 0.035 * bend * bend;`,
      );
  };
}
