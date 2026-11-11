import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Acima de 1,5 o custo cresce muito e a diferença quase não aparece (há bloom e névoa). */
const MAX_PIXEL_RATIO = 1.5;

/**
 * Embrulha o WebGLRenderer: cria o canvas, cuida do tamanho, das sombras e do
 * pós-processamento (bloom: luzes, janelas e magia brilham de leve).
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloom: UnrealBloomPass;
  private width = 1;
  private height = 1;
  /** Fração da resolução usada agora (1 = cheia). */
  private scale = 1;
  private lastFrame = performance.now();
  private frameAvg = 16;
  private adaptTimer = 0;

  constructor(private readonly host: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.1;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.gl.domElement);

    this.composer = new EffectComposer(this.gl);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.82);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
  }

  get aspect(): number {
    return this.width / this.height;
  }

  /** Intensidade do brilho (cenas mais escuras pedem mais). */
  setBloom(strength: number): void {
    this.bloom.strength = strength;
  }

  /**
   * Resolução dinâmica: mede o tempo entre quadros e baixa a resolução interna
   * quando o jogo fica lento (GPU integrada), subindo de volta quando sobra folga.
   */
  private adapt(): void {
    const now = performance.now();
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    if (dt <= 0 || dt > 250) return; // aba escondida ou pausa: ignora
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    this.adaptTimer += dt;
    if (this.adaptTimer < 1500) return;
    this.adaptTimer = 0;
    let scale = this.scale;
    if (this.frameAvg > 22) scale -= 0.15;
    else if (this.frameAvg < 13) scale += 0.1;
    scale = THREE.MathUtils.clamp(scale, 0.5, 1);
    if (Math.abs(scale - this.scale) > 0.01) {
      this.scale = scale;
      this.applyPixelRatio();
    }
  }

  private applyPixelRatio(): void {
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO) * this.scale;
    this.gl.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
    this.gl.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.adapt();
    if (camera.aspect !== this.aspect) {
      camera.aspect = this.aspect;
      camera.updateProjectionMatrix();
    }
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.composer.render();
  }

  private resize(): void {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    this.applyPixelRatio();
  }
}
