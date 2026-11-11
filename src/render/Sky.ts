import * as THREE from 'three';

export interface SkyOptions {
  /** Cor do alto do céu. */
  zenith: THREE.ColorRepresentation;
  /** Cor perto do horizonte (a névoa usa a mesma). */
  horizon: THREE.ColorRepresentation;
  /** Cor das nuvens. */
  clouds: THREE.ColorRepresentation;
  /** Disco no céu: lua clara ou eclipse (aro de fogo em volta de um disco escuro). */
  disc: 'lua' | 'eclipse';
  /** Cor do brilho do disco (luar ou aro do eclipse). */
  glow: THREE.ColorRepresentation;
  /** Montanhas no horizonte. */
  mountains: THREE.ColorRepresentation;
}

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // sempre no fundo
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 cloudColor;
  uniform vec3 glow;
  uniform vec3 discDir;
  uniform float eclipse;
  uniform float time;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(horizon, zenith, pow(smoothstep(-0.05, 0.75, h), 0.8));

    // Disco: lua ou eclipse.
    float cosA = dot(d, normalize(discDir));
    float ang = acos(clamp(cosA, -1.0, 1.0));
    float r = 0.075;
    float halo = exp(-max(ang - r, 0.0) * 9.0);
    if (eclipse > 0.5) {
      // Aro de fogo com raios irregulares, disco negro no meio.
      float rim = smoothstep(r + 0.02, r, ang) * smoothstep(r - 0.012, r, ang);
      vec2 polar = vec2(atan(d.x - discDir.x, d.y - discDir.y) * 3.0, ang * 30.0);
      float flare = fbm(polar + time * 0.05) * halo;
      col += glow * (halo * 0.9 + flare * 1.4 + rim * 4.0);
      col = mix(col, vec3(0.01, 0.0, 0.02), smoothstep(r, r - 0.006, ang));
    } else {
      col += glow * halo * 0.35;
      col = mix(col, glow * 1.6, smoothstep(r * 0.62, r * 0.58, ang));
    }

    // Nuvens: só acima do horizonte, vindo devagar.
    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.25) * 1.6 + vec2(time * 0.006, time * 0.002);
      float c = fbm(uv * 1.3);
      c = smoothstep(0.45, 0.85, c) * smoothstep(0.0, 0.25, d.y);
      vec3 lit = cloudColor + glow * halo * 0.8;
      col = mix(col, lit, c * 0.75);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Céu em volta da área: degradê, nuvens, lua ou eclipse e um anel de montanhas
 * escuras no horizonte. Segue o Ryben (fica sempre "no infinito").
 */
export class Sky {
  readonly root = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;

  constructor(opts: SkyOptions) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        zenith: { value: new THREE.Color(opts.zenith) },
        horizon: { value: new THREE.Color(opts.horizon) },
        cloudColor: { value: new THREE.Color(opts.clouds) },
        glow: { value: new THREE.Color(opts.glow) },
        discDir: { value: new THREE.Vector3(-0.45, 0.42, -1).normalize() },
        eclipse: { value: opts.disc === 'eclipse' ? 1 : 0 },
        time: { value: 0 },
      },
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), this.material);
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.root.add(dome, this.buildMountains(opts.mountains, opts.horizon));
  }

  set(opts: Partial<SkyOptions>): void {
    const u = this.material.uniforms;
    if (opts.zenith !== undefined) u.zenith.value.set(opts.zenith);
    if (opts.horizon !== undefined) u.horizon.value.set(opts.horizon);
    if (opts.clouds !== undefined) u.cloudColor.value.set(opts.clouds);
    if (opts.glow !== undefined) u.glow.value.set(opts.glow);
    if (opts.disc !== undefined) u.eclipse.value = opts.disc === 'eclipse' ? 1 : 0;
  }

  update(dt: number, focus: THREE.Vector3): void {
    this.material.uniforms.time.value += dt;
    this.root.position.set(focus.x, 0, focus.z);
  }

  /** Duas camadas de serras no horizonte, a de trás mais clara (perspectiva aérea). */
  private buildMountains(color: THREE.ColorRepresentation, horizon: THREE.ColorRepresentation): THREE.Group {
    const group = new THREE.Group();
    const layers = [
      { radius: 230, height: 46, seed: 1.7, mix: 0.55 },
      { radius: 170, height: 34, seed: 4.1, mix: 0.2 },
    ];
    for (const layer of layers) {
      const seg = 160;
      const pos: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const n =
          Math.sin(a * 3 + layer.seed) * 0.35 +
          Math.sin(a * 7.3 + layer.seed * 2) * 0.25 +
          Math.sin(a * 17.1 + layer.seed * 5) * 0.12 +
          Math.abs(Math.sin(a * 11.7 + layer.seed)) * 0.28;
        const h = layer.height * (0.45 + 0.55 * Math.max(0, n + 0.4));
        const x = Math.cos(a) * layer.radius;
        const z = Math.sin(a) * layer.radius;
        pos.push(x, -6, z, x, h, z);
        if (i < seg) {
          const k = i * 2;
          idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const c = new THREE.Color(color).lerp(new THREE.Color(horizon), layer.mix);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, fog: false, side: THREE.DoubleSide }));
      mesh.frustumCulled = false;
      mesh.renderOrder = -9;
      group.add(mesh);
    }
    return group;
  }
}
