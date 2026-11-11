import * as THREE from 'three';

/** Luzes pontuais acesas ao mesmo tempo. Cada uma encarece todos os pixels da tela. */
const MAX_POINT_LIGHTS = 4;
/** De quanto em quanto tempo a escolha é refeita (segundos). */
const INTERVAL = 0.2;

/**
 * Mantém acesas só as luzes pontuais mais perto do Ryben. O número de luzes
 * visíveis fica sempre igual, então os shaders não precisam ser recompilados.
 * Na GPU integrada (Intel UHD), 19 luzes custavam quase metade do quadro.
 */
export class LightBudget {
  private lights: THREE.PointLight[] = [];
  private timer = 0;

  /** Refaz a lista (chamar ao trocar de área). */
  collect(scene: THREE.Object3D): void {
    this.lights = [];
    scene.traverse((o) => {
      if (o instanceof THREE.PointLight) this.lights.push(o);
    });
    this.timer = 0;
  }

  update(dt: number, focus: THREE.Vector3): void {
    this.timer -= dt;
    if (this.timer > 0 || this.lights.length <= MAX_POINT_LIGHTS) return;
    this.timer = INTERVAL;
    const p = new THREE.Vector3();
    const ranked = this.lights
      .map((light) => ({ light, d: light.getWorldPosition(p).distanceToSquared(focus) }))
      .sort((a, b) => a.d - b.d);
    ranked.forEach((r, i) => (r.light.visible = i < MAX_POINT_LIGHTS));
  }
}
