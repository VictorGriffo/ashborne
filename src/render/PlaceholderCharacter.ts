import * as THREE from 'three';
import { damp } from '../core/math';
import { PROPS } from './palette';

/**
 * Ryben provisório, feito só de formas simples.
 * Fica no lugar até o M1, quando entram os modelos dos pacotes CC0.
 *
 * Hierarquia:
 *   root  (posição e direção, controlados pelo Player)
 *   └ rig (balanço do passo e inclinação)
 *     ├ pernas e braços (cada um num pivô no quadril ou no ombro)
 *     ├ tronco, cinto e espada de treino nas costas
 *     └ cabeça
 *
 * O modelo olha para +Z.
 */
export class PlaceholderCharacter {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly head = new THREE.Group();

  private phase = 0;
  private time = 0;
  private stride = 0;

  constructor() {
    const mat = (color: number) =>
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 });
    const skin = mat(PROPS.skin);
    const tunic = mat(PROPS.tunic);
    const pants = mat(PROPS.pants);
    const boots = mat(PROPS.boots);

    this.root.name = 'Ryben (provisório)';
    this.root.add(this.rig);

    // Pernas
    for (const [leg, side] of [
      [this.legL, 1],
      [this.legR, -1],
    ] as const) {
      leg.position.set(0.11 * side, 0.6, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 3, 6), pants);
      thigh.position.y = -0.24;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.26), boots);
      boot.position.set(0, -0.53, 0.04);
      leg.add(thigh, boot);
      this.rig.add(leg);
    }

    // Tronco: túnica da Guarda Aprendiz, mais larga embaixo
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.52, 7), tunic);
    torso.position.y = 0.84;
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.285, 0.05, 7),
      new THREE.MeshStandardMaterial({
        color: PROPS.tunicTrim,
        emissive: PROPS.tunicTrim,
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
    );
    trim.position.y = 0.6;
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.07, 7), mat(PROPS.belt));
    belt.position.y = 0.76;
    this.rig.add(torso, trim, belt);

    // Espada de Treino, presa nas costas
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.02), mat(PROPS.steel));
    blade.position.y = 0.2;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), mat(PROPS.belt));
    guard.position.y = -0.12;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), mat(PROPS.boots));
    grip.position.y = -0.22;
    sword.add(blade, guard, grip);
    sword.position.set(0, 0.92, -0.26);
    sword.rotation.set(0.1, 0, 0.6);
    this.rig.add(sword);

    // Braços
    for (const [arm, side] of [
      [this.armL, 1],
      [this.armR, -1],
    ] as const) {
      arm.position.set(0.27 * side, 1.04, 0);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 3, 6), tunic);
      sleeve.position.y = -0.18;
      const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), skin);
      hand.position.y = -0.4;
      arm.add(sleeve, hand);
      arm.rotation.z = 0.08 * side;
      this.rig.add(arm);
    }

    // Cabeça: proporção grande, no espírito estilizado
    this.head.position.y = 1.36;
    const face = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 1), skin);
    const hair = new THREE.Mesh(new THREE.IcosahedronGeometry(0.29, 1), mat(PROPS.hair));
    hair.position.set(0, 0.07, -0.06);
    hair.scale.set(1.02, 0.92, 1);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), mat(PROPS.hair));
    fringe.position.set(0.03, 0.17, 0.2);
    fringe.rotation.set(0.5, 0, -0.18);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x10141f });
    for (const side of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.04), eyeMat);
      eye.position.set(0.095 * side, 0.01, 0.245);
      this.head.add(eye);
    }
    this.head.add(face, hair, fringe);
    this.rig.add(this.head);

    // Luz de preenchimento suave: destaca o personagem no cenário noturno.
    const fill = new THREE.PointLight(0xcfd8ff, 2.2, 4.5, 1.5);
    fill.position.set(0, 2.2, 1.2);
    this.root.add(fill);

    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  /**
   * Animação procedural: passada proporcional à velocidade e respiração parada.
   * @param speed velocidade atual em m/s
   * @param runSpeed velocidade máxima, para normalizar a passada
   */
  animate(dt: number, speed: number, runSpeed: number): void {
    this.time += dt;
    const targetStride = Math.min(1, speed / (runSpeed * 0.6));
    this.stride += (targetStride - this.stride) * damp(10, dt);

    // Cerca de um ciclo completo de passos a cada 1,4 m.
    this.phase += speed * dt * ((Math.PI * 2) / 1.4);
    const swing = Math.sin(this.phase) * 0.75 * this.stride;

    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;

    const bob = Math.abs(Math.cos(this.phase)) * 0.06 * this.stride;
    const breath = Math.sin(this.time * 2.2) * 0.012 * (1 - this.stride);
    this.rig.position.y = bob + breath;
    this.rig.rotation.x = 0.1 * this.stride;
    this.head.rotation.x = -0.06 * this.stride + Math.sin(this.time * 1.1) * 0.02 * (1 - this.stride);
  }
}
