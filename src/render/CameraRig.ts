import * as THREE from 'three';
import { damp, lerpAngle } from '../core/math';

export interface CameraConfig {
  fov: number;
  /** Distância padrão da câmera até o Ryben. */
  distance: number;
  /** Distância mínima e máxima (roda do mouse). */
  minDistance: number;
  maxDistance: number;
  /** Inclinação padrão, em graus acima do horizonte. */
  pitch: number;
  /** Inclinação mínima e máxima, em graus. */
  minPitch: number;
  maxPitch: number;
  /** Altura do ponto observado acima do alvo. */
  lookHeight: number;
  /** Quão rápido a câmera alcança o alvo. */
  smoothing: number;
}

/** Em retrato, a largura visível é pelo menos esta fração da de uma tela quadrada. */
const PORTRAIT_MIN_WIDTH = 0.8;
/** Folga entre a câmera e uma parede que a bloqueia. */
const WALL_MARGIN = 0.35;

/**
 * Câmera em terceira pessoa, estilo Breath of the Wild: orbita em volta do
 * Ryben (360° na horizontal, inclinação limitada) e aproxima ou afasta.
 * `yaw` 0 põe a câmera do lado +Z olhando para -Z, como a câmera fixa antiga.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** Ângulo horizontal atual (radianos). */
  yaw = 0;
  private targetYaw = 0;
  private pitch: number;
  private targetPitch: number;
  private distance: number;
  private targetDistance: number;
  private readonly target = new THREE.Vector3();
  private zoom = 1;
  private targetZoom = 1;
  /** Objetos que a câmera não atravessa (paredes de salas fechadas). */
  occluders: THREE.Object3D[] = [];
  private readonly ray = new THREE.Raycaster();
  private readonly look = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  constructor(private readonly config: CameraConfig) {
    this.camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 400);
    this.pitch = this.targetPitch = THREE.MathUtils.degToRad(config.pitch);
    this.distance = this.targetDistance = config.distance;
  }

  /**
   * Em telas em pé (celular), abre o campo de visão vertical para a largura
   * visível não ficar estreita demais. Em telas deitadas, usa o FOV do config.
   */
  fitAspect(aspect: number): void {
    const base = THREE.MathUtils.degToRad(this.config.fov);
    let fov = this.config.fov;
    if (aspect < 1) {
      const halfWidth = Math.tan(base / 2) * PORTRAIT_MIN_WIDTH;
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfWidth / aspect));
    }
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Gira e inclina (radianos); usado pelo mouse, teclado e analógico. */
  rotate(dYaw: number, dPitch: number): void {
    this.targetYaw -= dYaw;
    const min = THREE.MathUtils.degToRad(this.config.minPitch);
    const max = THREE.MathUtils.degToRad(this.config.maxPitch);
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dPitch, min, max);
  }

  /** Passos de zoom (positivo = afastar). */
  zoomBy(steps: number): void {
    if (steps === 0) return;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance * Math.pow(1.12, steps),
      this.config.minDistance,
      this.config.maxDistance,
    );
  }

  /** Põe a câmera atrás de quem olha na direção `facingYaw` (ângulo do Player). */
  recenter(facingYaw: number): void {
    // O Player olha para (sin, cos); a câmera fica do lado oposto.
    let yaw = facingYaw + Math.PI;
    // Escolhe o giro mais curto a partir do ângulo atual.
    yaw = this.targetYaw + Math.atan2(Math.sin(yaw - this.targetYaw), Math.cos(yaw - this.targetYaw));
    this.targetYaw = yaw;
  }

  /** Coloca a câmera no alvo sem transição. Com `yaw`, também vira a câmera. */
  snapTo(point: THREE.Vector3, yaw?: number): void {
    this.target.copy(point);
    if (yaw !== undefined) this.yaw = this.targetYaw = yaw;
    else this.yaw = this.targetYaw;
    this.pitch = this.targetPitch;
    this.distance = this.targetDistance;
    this.zoom = this.targetZoom;
    this.apply();
  }

  follow(point: THREE.Vector3, dt: number): void {
    const k = damp(this.config.smoothing, dt);
    const kTurn = damp(14, dt);
    this.target.lerp(point, k);
    this.zoom += (this.targetZoom - this.zoom) * k;
    this.yaw = lerpAngle(this.yaw, this.targetYaw, kTurn);
    this.pitch += (this.targetPitch - this.pitch) * kTurn;
    this.distance += (this.targetDistance - this.distance) * kTurn;
    this.apply();
  }

  /** Aproxima (menor que 1) ou afasta a câmera, sem mudar o ângulo. */
  setZoom(zoom: number): void {
    this.targetZoom = zoom;
  }

  private apply(): void {
    this.look.set(this.target.x, this.target.y + this.config.lookHeight, this.target.z);
    this.dir.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    let dist = this.distance * this.zoom;
    // Paredes entre o Ryben e a câmera puxam a câmera para perto.
    if (this.occluders.length > 0) {
      this.ray.set(this.look, this.dir);
      this.ray.far = dist;
      const hit = this.ray.intersectObjects(this.occluders, true)[0];
      if (hit) dist = Math.max(0.8, hit.distance - WALL_MARGIN);
    }
    this.camera.position.copy(this.look).addScaledVector(this.dir, dist);
    this.camera.lookAt(this.look);
  }
}
