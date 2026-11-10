import * as THREE from 'three';
import { PART1, PROPS } from './palette';

/**
 * Ponto de save: um cristal de Aether flutuando sobre uma base de pedra,
 * com um anel de luz girando em volta. Brilha mais forte depois de tocado.
 */
export class SavePointModel {
  readonly root = new THREE.Group();
  private readonly crystal: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private readonly crystalMat: THREE.MeshStandardMaterial;
  private time = Math.random() * 10;
  private pulse = 0;

  constructor() {
    const stone = new THREE.MeshStandardMaterial({ color: PROPS.stone, flatShading: true, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.22, 6), stone);
    base.position.y = 0.11;
    base.castShadow = base.receiveShadow = true;

    this.crystalMat = new THREE.MeshStandardMaterial({
      color: PART1.aetherCyan,
      emissive: PART1.aetherCyan,
      emissiveIntensity: 1.4,
      flatShading: true,
      roughness: 0.2,
    });
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.crystalMat);
    this.crystal.scale.set(0.75, 1.5, 0.75);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.018, 4, 28),
      new THREE.MeshBasicMaterial({ color: PART1.aetherLilac }),
    );
    this.ring.rotation.x = Math.PI / 2;

    this.light = new THREE.PointLight(PART1.aetherCyan, 4, 4.5, 1.6);
    this.light.position.y = 1;

    this.root.add(base, this.crystal, this.ring, this.light);
  }

  /** Brilho forte ao ser tocado. */
  activate(): void {
    this.pulse = 1;
  }

  animate(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.pulse = Math.max(0, this.pulse - dt * 0.8);
    this.crystal.position.y = 0.85 + Math.sin(t * 1.8) * 0.06;
    this.crystal.rotation.y = t * 0.9;
    this.ring.position.y = 0.55 + Math.sin(t * 1.2) * 0.1;
    this.ring.rotation.z = t * 0.6;
    this.ring.scale.setScalar(1 + this.pulse * 0.8);
    this.crystalMat.emissiveIntensity = 1.4 + Math.sin(t * 2.4) * 0.3 + this.pulse * 2.5;
    this.light.intensity = 4 + Math.sin(t * 2.4) * 0.8 + this.pulse * 10;
  }
}
