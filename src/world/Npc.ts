import * as THREE from 'three';
import { damp, lerpAngle } from '../core/math';
import type { Assets } from '../render/Assets';
import { CharacterModel } from '../render/CharacterModel';
import { character } from './characters';

/** Personagem parado no mapa, com quem dá para conversar. */
export class Npc {
  readonly position: THREE.Vector3;
  readonly model: CharacterModel;
  /** Raio de colisão. */
  readonly radius = 0.45;
  private yaw: number;
  private targetYaw: number;

  constructor(
    assets: Assets,
    readonly characterId: string,
    x: number,
    z: number,
    private readonly homeYaw: number,
    readonly dialogue: string,
  ) {
    this.model = new CharacterModel(assets, character(characterId));
    this.position = new THREE.Vector3(x, 0, z);
    this.yaw = this.targetYaw = homeYaw;
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = homeYaw;
  }

  get name(): string {
    return this.model.data.nome;
  }

  /** Vira de frente para um ponto (o jogador, no começo da conversa). */
  faceTowards(point: THREE.Vector3): void {
    this.targetYaw = Math.atan2(point.x - this.position.x, point.z - this.position.z);
  }

  /** Volta para a direção original. */
  resetFacing(): void {
    this.targetYaw = this.homeYaw;
  }

  /** Gesto curto no começo da conversa, se o personagem tiver um. */
  greet(): void {
    const gesture = this.model.data.animacoes.falando;
    if (gesture) this.model.playOnce(gesture);
  }

  animate(dt: number): void {
    this.yaw = lerpAngle(this.yaw, this.targetYaw, damp(8, dt));
    this.model.root.rotation.y = this.yaw;
    this.model.update(dt);
  }
}
