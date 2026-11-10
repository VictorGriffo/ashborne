import * as THREE from 'three';
import { mob, type MobData } from '../battle/data';
import { damp, lerpAngle } from '../core/math';
import { createRandom, range } from '../core/random';
import { createMobModel, type MobModel } from '../render/mobModels';
import type { CollisionWorld } from './Collision';

/**
 * passeando: anda perto de casa e começa batalha ao ser tocado.
 * batalha: congelado enquanto a luta acontece.
 * poupado: continua passeando, feliz, e não ataca mais.
 * sumindo / derrotado: foi vencido em combate.
 */
export type EnemyState = 'passeando' | 'batalha' | 'poupado' | 'sumindo' | 'derrotado';

const VANISH_TIME = 0.9;
const BODY_RADIUS = 0.3;

/** Mob visível no mapa. A batalha começa quando o Ryben encosta nele. */
export class MapEnemy {
  readonly data: MobData;
  readonly model: MobModel;
  readonly position: THREE.Vector3;
  private readonly home: THREE.Vector3;
  private readonly rand: () => number;
  state: EnemyState = 'passeando';

  private yaw: number;
  private targetYaw: number;
  private target?: THREE.Vector3;
  private wait: number;
  private moving = false;
  private vanishTime = 0;

  constructor(
    readonly mobId: string,
    x: number,
    z: number,
    seed: number,
  ) {
    this.data = mob(mobId);
    this.model = createMobModel(this.data.modelo);
    this.position = new THREE.Vector3(x, 0, z);
    this.home = this.position.clone();
    this.rand = createRandom(seed);
    this.yaw = this.targetYaw = this.rand() * Math.PI * 2;
    this.wait = range(this.rand, 0.5, 2);
  }

  /** Lógica de passeio, no passo fixo. */
  update(dt: number, collision?: CollisionWorld): void {
    this.moving = false;
    if (this.state !== 'passeando' && this.state !== 'poupado') return;

    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.pickTarget();
    } else if (this.target) {
      const to = this.target.clone().sub(this.position).setY(0);
      const dist = to.length();
      const speed = this.data.mapa.velocidade * (this.state === 'poupado' ? 0.7 : 1);
      if (dist < 0.1) {
        this.target = undefined;
        this.wait = range(this.rand, 1, 3);
      } else {
        const step = Math.min(dist, speed * dt);
        this.position.addScaledVector(to.divideScalar(dist), step);
        this.targetYaw = Math.atan2(to.x, to.z);
        this.moving = true;
        if (collision) {
          const before = this.position.clone();
          collision.resolve(this.position, BODY_RADIUS);
          // Encostou em algo: desiste deste destino.
          if (before.distanceToSquared(this.position) > 1e-6) {
            this.target = undefined;
            this.wait = range(this.rand, 0.5, 1.5);
          }
        }
      }
    }
    this.yaw = lerpAngle(this.yaw, this.targetYaw, damp(8, dt));
  }

  /** Animação e posição do modelo, a cada quadro. */
  animate(dt: number): void {
    const root = this.model.root;
    root.position.copy(this.position);
    root.rotation.y = this.yaw;

    if (this.state === 'sumindo') {
      this.vanishTime += dt;
      this.model.animate(dt, 'battle');
      this.model.vanish(this.vanishTime / VANISH_TIME);
      if (this.vanishTime >= VANISH_TIME) this.state = 'derrotado';
      return;
    }
    if (this.state === 'derrotado') return;

    const mood = this.state === 'batalha' ? 'battle' : this.state === 'poupado' ? 'happy' : this.moving ? 'walk' : 'idle';
    this.model.animate(dt, mood);
  }

  /** O Ryben encostou neste mob e ele ainda quer brigar? */
  touches(point: THREE.Vector3, radius: number): boolean {
    if (this.state !== 'passeando') return false;
    const r = this.data.mapa.raioToque + radius;
    return this.position.distanceToSquared(point) < r * r;
  }

  /** O ponto está atrás do mob (ataque surpresa)? */
  isBehind(point: THREE.Vector3): boolean {
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const to = point.clone().sub(this.position).setY(0).normalize();
    return forward.dot(to) < -0.3;
  }

  faceTowards(point: THREE.Vector3): void {
    this.yaw = this.targetYaw = Math.atan2(point.x - this.position.x, point.z - this.position.z);
  }

  startBattle(): void {
    this.state = 'batalha';
    this.target = undefined;
  }

  /** Volta a passear depois de uma fuga ou de uma derrota do Ryben. */
  resume(): void {
    this.state = 'passeando';
    this.wait = range(this.rand, 1.5, 3);
  }

  spare(): void {
    this.state = 'poupado';
    this.wait = range(this.rand, 0.5, 1.5);
  }

  defeat(): void {
    this.state = 'sumindo';
    this.vanishTime = 0;
  }

  private pickTarget(): void {
    const angle = this.rand() * Math.PI * 2;
    const r = Math.sqrt(this.rand()) * this.data.mapa.raioPasseio;
    this.target = new THREE.Vector3(this.home.x + Math.cos(angle) * r, 0, this.home.z + Math.sin(angle) * r);
  }
}
