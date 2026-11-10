import * as THREE from 'three';

/** Caixa alinhada aos eixos, vista de cima (plano XZ). */
export interface BoxCollider {
  kind: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Círculo no chão. */
export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
}

/** Área circular de onde não se pode sair (borda de mapa aberto). */
export interface BoundaryCollider {
  kind: 'boundary';
  x: number;
  z: number;
  r: number;
}

export type Collider = BoxCollider | CircleCollider | BoundaryCollider;

/** Quantas vezes a resolução repete por passo: resolve cantos entre duas caixas. */
const ITERATIONS = 4;

/**
 * Colisão 2D vista de cima. O jogador é um círculo; o cenário é feito de
 * caixas e círculos. A posição é empurrada para fora de cada obstáculo pelo
 * caminho mais curto, o que faz o personagem deslizar ao encostar em paredes.
 */
export class CollisionWorld {
  readonly colliders: Collider[] = [];

  addBox(minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.colliders.push({ kind: 'box', minX, maxX, minZ, maxZ });
  }

  addCircle(x: number, z: number, r: number): void {
    this.colliders.push({ kind: 'circle', x, z, r });
  }

  addBoundary(x: number, z: number, r: number): void {
    this.colliders.push({ kind: 'boundary', x, z, r });
  }

  /**
   * Cria uma caixa a partir do volume de um objeto 3D.
   * @param shrink encolhe a caixa em cada lado (folga para não travar em quinas)
   */
  addObject(object: THREE.Object3D, shrink = 0): void {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object, true);
    if (box.isEmpty()) return;
    this.addBox(box.min.x + shrink, box.min.z + shrink, box.max.x - shrink, box.max.z - shrink);
  }

  /** Empurra um círculo para fora de tudo. Altera `pos` no lugar. */
  resolve(pos: THREE.Vector3, radius: number): void {
    for (let i = 0; i < ITERATIONS; i++) {
      let moved = false;
      for (const c of this.colliders) {
        if (c.kind === 'box') moved = pushOutOfBox(pos, radius, c) || moved;
        else if (c.kind === 'circle') moved = pushOutOfCircle(pos, radius, c) || moved;
        else moved = keepInside(pos, radius, c) || moved;
      }
      if (!moved) break;
    }
  }

  /** O círculo encosta (ou quase) em algum obstáculo? Útil para testes. */
  overlaps(pos: THREE.Vector3, radius: number): boolean {
    const probe = pos.clone();
    this.resolve(probe, radius);
    return probe.distanceToSquared(pos) > 1e-10;
  }
}

function pushOutOfBox(pos: THREE.Vector3, r: number, b: BoxCollider): boolean {
  const cx = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
  const cz = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;

  if (d2 > 1e-12) {
    // Centro fora da caixa: empurra a partir do ponto mais próximo.
    if (d2 >= r * r) return false;
    const d = Math.sqrt(d2);
    pos.x = cx + (dx / d) * r;
    pos.z = cz + (dz / d) * r;
    return true;
  }

  // Centro dentro da caixa: sai pelo lado mais próximo.
  const left = pos.x - b.minX;
  const right = b.maxX - pos.x;
  const top = pos.z - b.minZ;
  const bottom = b.maxZ - pos.z;
  const min = Math.min(left, right, top, bottom);
  if (min === left) pos.x = b.minX - r;
  else if (min === right) pos.x = b.maxX + r;
  else if (min === top) pos.z = b.minZ - r;
  else pos.z = b.maxZ + r;
  return true;
}

function pushOutOfCircle(pos: THREE.Vector3, r: number, c: CircleCollider): boolean {
  const dx = pos.x - c.x;
  const dz = pos.z - c.z;
  const min = c.r + r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2);
  if (d < 1e-6) {
    pos.x = c.x + min;
    return true;
  }
  pos.x = c.x + (dx / d) * min;
  pos.z = c.z + (dz / d) * min;
  return true;
}

function keepInside(pos: THREE.Vector3, r: number, c: BoundaryCollider): boolean {
  const dx = pos.x - c.x;
  const dz = pos.z - c.z;
  const max = c.r - r;
  const d = Math.hypot(dx, dz);
  if (d <= max) return false;
  pos.x = c.x + (dx / d) * max;
  pos.z = c.z + (dz / d) * max;
  return true;
}
