import * as THREE from 'three';
import type { Vec2 } from '../core/Input';
import { damp, lerpAngle } from '../core/math';
import type { CharacterModel } from '../render/CharacterModel';

export interface PlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  /** Quão rápido a velocidade alcança a desejada (maior = mais responsivo). */
  acceleration: number;
  /** Quão rápido o personagem vira para a direção do movimento. */
  turnSpeed: number;
  /** Raio usado na colisão. */
  radius: number;
}

/**
 * O Ryben controlado pelo jogador.
 *
 * A lógica roda no passo fixo (`update`) e guarda a posição anterior;
 * o desenho (`syncVisual`) interpola entre as duas.
 */
export class Player {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();

  private readonly previous = new THREE.Vector3();
  private readonly visual = new THREE.Vector3();
  private yaw = 0;
  private previousYaw = 0;
  private running = false;
  /** Multiplicador de velocidade (a montaria acelera a travessia). */
  speedScale = 1;

  constructor(
    readonly config: PlayerConfig,
    readonly model: CharacterModel,
  ) {
    // Luz de preenchimento suave: destaca o personagem em cenários escuros.
    const fill = new THREE.PointLight(0xcfd8ff, 2.2, 4.5, 1.5);
    fill.position.set(0, 2.2, 1.2);
    model.root.add(fill);
  }

  get object(): THREE.Object3D {
    return this.model.root;
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Direção para onde o Ryben olha, no plano XZ. */
  get facing(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  /** Move sem interpolar (início de cena, troca de área). */
  teleport(x: number, z: number, yaw = this.yaw): void {
    this.position.set(x, 0, z);
    this.previous.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.yaw = this.previousYaw = yaw;
  }

  /** Para na hora (início de conversa, troca de área). */
  stop(): void {
    this.velocity.set(0, 0, 0);
    this.previous.copy(this.position);
    this.previousYaw = this.yaw;
  }

  /** Vira de frente para um ponto. */
  lookAt(point: THREE.Vector3): void {
    this.yaw = this.previousYaw = Math.atan2(point.x - this.position.x, point.z - this.position.z);
  }

  /**
   * @param move direção da entrada: x para a direita, y para cima (para longe da câmera)
   */
  update(dt: number, move: Vec2, running: boolean): void {
    this.previous.copy(this.position);
    this.previousYaw = this.yaw;
    this.running = running;

    const top = (running ? this.config.runSpeed : this.config.walkSpeed) * this.speedScale;
    // "Para cima" na tela é -Z no mundo, porque a câmera fica do lado +Z.
    const targetX = move.x * top;
    const targetZ = -move.y * top;
    const k = damp(this.config.acceleration, dt);
    this.velocity.x += (targetX - this.velocity.x) * k;
    this.velocity.z += (targetZ - this.velocity.z) * k;
    if (this.speed < 0.01 && move.x === 0 && move.y === 0) this.velocity.set(0, 0, 0);

    this.position.addScaledVector(this.velocity, dt);

    if (Math.hypot(move.x, move.y) > 0.1) {
      const targetYaw = Math.atan2(move.x, -move.y);
      this.yaw = lerpAngle(this.yaw, targetYaw, damp(this.config.turnSpeed, dt));
    }
  }

  /**
   * Corrige a velocidade depois da colisão: se a parede segurou o Ryben,
   * a velocidade cai junto e a animação não fica correndo no lugar.
   */
  afterCollision(dt: number): void {
    if (dt <= 0) return;
    this.velocity.x = (this.position.x - this.previous.x) / dt;
    this.velocity.z = (this.position.z - this.previous.z) / dt;
  }

  /** Posiciona o modelo entre o passo anterior e o atual. Devolve a posição desenhada. */
  syncVisual(alpha: number, frameDt: number): THREE.Vector3 {
    this.visual.lerpVectors(this.previous, this.position, alpha);
    this.model.root.position.copy(this.visual);
    this.model.root.rotation.y = lerpAngle(this.previousYaw, this.yaw, alpha);
    this.model.locomote(this.speed, this.running);
    this.model.update(frameDt);
    return this.visual;
  }
}
