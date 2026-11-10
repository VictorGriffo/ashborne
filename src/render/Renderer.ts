import * as THREE from 'three';

/** Embrulha o WebGLRenderer: cria o canvas, cuida do tamanho e das sombras. */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  private width = 1;
  private height = 1;

  constructor(private readonly host: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.gl.domElement);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(host);
  }

  get aspect(): number {
    return this.width / this.height;
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (camera.aspect !== this.aspect) {
      camera.aspect = this.aspect;
      camera.updateProjectionMatrix();
    }
    this.gl.render(scene, camera);
  }

  private resize(): void {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    this.gl.setSize(this.width, this.height, false);
  }
}
