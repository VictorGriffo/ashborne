import * as THREE from 'three';
import { damp } from '../core/math';

export interface CameraConfig {
  fov: number;
  /** Posição da câmera em relação ao alvo: [x, y, z]. */
  offset: number[];
  /** Altura do ponto observado acima do alvo. */
  lookHeight: number;
  /** Quão rápido a câmera alcança o alvo. */
  smoothing: number;
}

/** Em retrato, a largura visível é pelo menos esta fração da de uma tela quadrada. */
const PORTRAIT_MIN_WIDTH = 0.8;

/**
 * Câmera de cima em ângulo fixo, estilo Zelda.
 * Ela nunca gira: só desliza atrás do alvo com um pequeno atraso.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly offset: THREE.Vector3;
  private readonly target = new THREE.Vector3();

  constructor(private readonly config: CameraConfig) {
    this.camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 200);
    this.offset = new THREE.Vector3().fromArray(config.offset);
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

  /** Coloca a câmera no alvo sem transição. */
  snapTo(point: THREE.Vector3): void {
    this.target.copy(point);
    this.apply();
  }

  follow(point: THREE.Vector3, dt: number): void {
    this.target.lerp(point, damp(this.config.smoothing, dt));
    this.apply();
  }

  private apply(): void {
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target.x, this.target.y + this.config.lookHeight, this.target.z);
  }
}
