import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Todos os modelos em assets/modelos, indexados por um nome curto:
 *   assets/modelos/kaykit-dungeon/wall.gltf.glb  →  "kaykit-dungeon/wall"
 *
 * O Vite copia cada arquivo para o build e devolve a URL final,
 * então o caminho funciona tanto no dev quanto no GitHub Pages.
 */
const FILES = import.meta.glob('/assets/modelos/**/*.glb', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const URLS = new Map<string, string>();
for (const [path, url] of Object.entries(FILES)) {
  const key = path.replace('/assets/modelos/', '').replace(/(\.gltf)?\.glb$/, '');
  URLS.set(key, url);
}

/** Carrega e guarda os modelos GLTF. Cada modelo é baixado uma vez só. */
export class Assets {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, GLTF>();

  /** Nomes de todos os modelos disponíveis. */
  static available(): string[] {
    return [...URLS.keys()];
  }

  /**
   * Carrega vários modelos em paralelo.
   * @param onProgress recebe a fração concluída, de 0 a 1
   */
  async load(names: Iterable<string>, onProgress?: (fraction: number) => void): Promise<void> {
    const pending = [...new Set(names)].filter((n) => !this.cache.has(n));
    let done = 0;
    onProgress?.(pending.length === 0 ? 1 : 0);
    await Promise.all(
      pending.map(async (name) => {
        const url = URLS.get(name);
        if (!url) throw new Error(`Modelo não encontrado em assets/modelos: ${name}`);
        const gltf = await this.loader.loadAsync(url);
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        this.cache.set(name, gltf);
        onProgress?.(++done / pending.length);
      }),
    );
  }

  get(name: string): GLTF {
    const gltf = this.cache.get(name);
    if (!gltf) throw new Error(`Modelo não carregado: ${name}`);
    return gltf;
  }

  /**
   * Cópia de um modelo estático (cenário). Geometrias e materiais são
   * compartilhados com o original, então copiar sai barato.
   */
  instance(name: string): THREE.Object3D {
    return this.get(name).scene.clone(true);
  }
}
