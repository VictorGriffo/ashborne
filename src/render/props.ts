import * as THREE from 'three';
import { PART1, PROPS } from './palette';

/**
 * Objetos de cenário feitos no código, no mesmo estilo low-poly da clareira.
 * Cada construtor devolve o objeto (centrado na origem, frente para +Z),
 * os obstáculos para a colisão e as luzes que ele acende.
 */
export interface PropResult {
  object: THREE.Object3D;
  /** Obstáculos em coordenadas locais do objeto. */
  colliders: Array<{ kind: 'box'; w: number; d: number; x?: number; z?: number } | { kind: 'circle'; r: number; x?: number; z?: number }>;
  /** Luzes que tremulam (fogo, lampiões). */
  flicker?: THREE.PointLight[];
  /** Animação a cada quadro (dt e tempo total em segundos). */
  animate?: (dt: number, t: number) => void;
  /** Efeitos que uma cutscene pode disparar pelo nome. */
  events?: Record<string, () => void>;
}

/** Parâmetros vindos do JSON da área. */
export interface PropParams {
  tamanho?: number[];
  cor?: string;
  telhado?: string;
  altura?: number;
  comprimento?: number;
  luz?: boolean;
}

const materials = new Map<string, THREE.MeshStandardMaterial>();

/** Material compartilhado por cor (e brilho), para não criar centenas iguais. */
function mat(color: THREE.ColorRepresentation, emissive?: THREE.ColorRepresentation, intensity = 1): THREE.MeshStandardMaterial {
  const key = `${new THREE.Color(color).getHexString()}|${emissive === undefined ? '' : new THREE.Color(emissive).getHexString()}|${intensity}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    if (emissive !== undefined) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = intensity;
    }
    materials.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const WOOD = 0x6b4a33;
const WOOD_DARK = 0x4b3527;
const WINDOW = 0xffc27a;

/** Telhado de duas águas: um prisma triangular. */
function gableRoof(w: number, d: number, h: number, color: THREE.ColorRepresentation): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return mesh(geo, mat(color));
}

function house(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [4, 3.2];
  const h = p.altura ?? 2.2;
  const g = new THREE.Group();
  const wall = mat(p.cor ?? 0xb8a58a);
  g.add(mesh(new THREE.BoxGeometry(w, h, d), wall, 0, h / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.12, 0.3, d + 0.12), mat(PROPS.stoneDark), 0, 0.15, 0));
  // Vigas nos cantos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.16, h, 0.16), mat(WOOD_DARK), (sx * w) / 2, h / 2, (sz * d) / 2));
  }
  const roof = gableRoof(w + 0.5, d + 0.5, h * 0.62, p.telhado ?? 0x7a3b33);
  roof.position.y = h;
  g.add(roof);
  // Porta e janelas acesas na frente (+Z)
  g.add(mesh(new THREE.BoxGeometry(0.8, 1.35, 0.08), mat(WOOD_DARK), 0, 0.68, d / 2 + 0.03));
  const glass = mat(WINDOW, WINDOW, 1.6);
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.55, 0.5, 0.06), glass, sx * w * 0.3, h * 0.6, d / 2 + 0.03));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.5), glass, sx * (w / 2 + 0.03), h * 0.6, 0));
  }
  // Chaminé
  g.add(mesh(new THREE.BoxGeometry(0.4, 1, 0.4), mat(PROPS.stone), w * 0.28, h + h * 0.45, -d * 0.15));
  return { object: g, colliders: [{ kind: 'box', w: w + 0.1, d: d + 0.1 }] };
}

function forge(p: PropParams): PropResult {
  const result = house({ ...p, cor: p.cor ?? '#8a8478', telhado: p.telhado ?? '#4b4f5c' });
  const g = result.object as THREE.Group;
  const [w, d] = p.tamanho ?? [4, 3.2];
  // Fornalha acesa ao lado da porta
  const furnace = new THREE.Group();
  furnace.add(mesh(new THREE.BoxGeometry(1.1, 1, 0.9), mat(PROPS.stoneDark), 0, 0.5, 0));
  furnace.add(mesh(new THREE.BoxGeometry(0.6, 0.35, 0.1), mat(0xff8a3a, 0xff6a1a, 2.5), 0, 0.45, 0.46));
  furnace.position.set(w * 0.32, 0, d / 2 + 0.75);
  g.add(furnace);
  const light = new THREE.PointLight(0xff8a3a, 6, 6, 1.6);
  light.position.set(w * 0.32, 1, d / 2 + 1.3);
  g.add(light);
  // Bigorna
  const anvil = anvilProp().object;
  anvil.position.set(-w * 0.28, 0, d / 2 + 1);
  g.add(anvil);
  result.colliders.push(
    { kind: 'box', w: 1.1, d: 0.9, x: w * 0.32, z: d / 2 + 0.75 },
    { kind: 'circle', r: 0.35, x: -w * 0.28, z: d / 2 + 1 },
  );
  result.flicker = [light];
  return result;
}

function anvilProp(): PropResult {
  const g = new THREE.Group();
  const iron = mat(0x4a5060);
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.45, 6), mat(WOOD_DARK), 0, 0.22, 0));
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.18, 0.28), iron, 0, 0.54, 0));
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 4), iron, 0.38, 0.56, 0).rotateZ(-Math.PI / 2));
  return { object: g, colliders: [{ kind: 'circle', r: 0.35 }] };
}

function well(): PropResult {
  const g = new THREE.Group();
  const stone = mat(PROPS.stone);
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1, 0.75, 10, 1, true), stone, 0, 0.38, 0));
  g.add(mesh(new THREE.TorusGeometry(0.95, 0.12, 4, 10), stone, 0, 0.75, 0).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.CircleGeometry(0.85, 10), mat(0x16324a, 0x16324a, 0.6), 0, 0.5, 0).rotateX(-Math.PI / 2));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), mat(WOOD), sx * 0.85, 1.15, 0));
  g.add(gableRoof(2.3, 1.3, 0.55, 0x7a3b33).translateY(1.9));
  return { object: g, colliders: [{ kind: 'circle', r: 1.05 }] };
}

function lamp(p: PropParams): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6), mat(0x2a2f3a), 0, 1.1, 0));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), mat(0x2a2f3a), 0.2, 2.15, 0));
  const glow = mesh(new THREE.OctahedronGeometry(0.16, 0), mat(WINDOW, 0xffa25a, 2.5), 0.4, 1.95, 0);
  glow.castShadow = false;
  g.add(glow);
  const flicker: THREE.PointLight[] = [];
  if (p.luz !== false) {
    const light = new THREE.PointLight(0xffb070, 5, 7, 1.6);
    light.position.set(0.4, 1.9, 0);
    g.add(light);
    flicker.push(light);
  }
  return { object: g, colliders: [{ kind: 'circle', r: 0.18 }], flicker };
}

function stall(p: PropParams): PropResult {
  const g = new THREE.Group();
  const cloth = mat(p.cor ?? 0x8a3b4a);
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.9, 1), mat(WOOD), 0, 0.45, 0));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), mat(WOOD_DARK), sx * 1.05, 1.05, -0.45));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), mat(WOOD_DARK), sx * 1.05, 0.85, 0.45));
  const roof = mesh(new THREE.BoxGeometry(2.5, 0.08, 1.4), cloth, 0, 1.95, 0);
  roof.rotation.x = -0.25;
  g.add(roof);
  // Mercadorias
  const goods = [0x7fe0d0, 0xe2704a, 0xb9a6ff, 0x2e7d5b];
  goods.forEach((c, i) => g.add(mesh(new THREE.IcosahedronGeometry(0.13, 0), mat(c), -0.75 + i * 0.5, 1.02, 0.1)));
  return { object: g, colliders: [{ kind: 'box', w: 2.3, d: 1.1 }] };
}

function campfire(): PropResult {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const log = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 5), mat(WOOD_DARK), Math.cos(a) * 0.15, 0.12, Math.sin(a) * 0.15);
    log.rotation.set(Math.PI / 2.4, a, 0);
    g.add(log);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new THREE.DodecahedronGeometry(0.13, 0), mat(PROPS.stoneDark), Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5));
  }
  const flame = mesh(new THREE.ConeGeometry(0.22, 0.6, 5), mat(0xffa040, 0xff7a1a, 3), 0, 0.42, 0);
  flame.castShadow = false;
  g.add(flame);
  const light = new THREE.PointLight(0xff9a40, 8, 7, 1.6);
  light.position.y = 0.8;
  g.add(light);
  return { object: g, colliders: [{ kind: 'circle', r: 0.55 }], flicker: [light] };
}

function fence(p: PropParams): PropResult {
  const len = p.comprimento ?? 4;
  const g = new THREE.Group();
  const wood = mat(WOOD);
  const posts = Math.max(2, Math.round(len / 1.2) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -len / 2 + (i / (posts - 1)) * len;
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat(WOOD_DARK), x, 0.45, 0));
  }
  for (const y of [0.35, 0.7]) g.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.06), wood, 0, y, 0));
  return { object: g, colliders: [{ kind: 'box', w: len, d: 0.25 }] };
}

function gate(p: PropParams): PropResult {
  const w = p.comprimento ?? 3;
  const g = new THREE.Group();
  const stone = mat(PROPS.stone);
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), stone, (sx * w) / 2, 1.3, 0));
  g.add(mesh(new THREE.BoxGeometry(w + 0.8, 0.35, 0.6), mat(PROPS.stoneDark), 0, 2.75, 0));
  const rune = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.04), mat(PART1.aetherCyan, PART1.aetherCyan, 1.5), 0, 2.75, 0.31);
  g.add(rune);
  return {
    object: g,
    colliders: [
      { kind: 'circle', r: 0.35, x: -w / 2 },
      { kind: 'circle', r: 0.35, x: w / 2 },
    ],
  };
}

function signpost(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), mat(WOOD_DARK), 0, 0.7, 0));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.06), mat(WOOD), 0.25, 1.2, 0));
  return { object: g, colliders: [{ kind: 'circle', r: 0.12 }] };
}

function garden(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [2.4, 1.4];
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, 0.25, d), mat(0x4a3628), 0, 0.12, 0));
  const glowing = mat(PART1.aetherCyan, PART1.aetherCyan, 1.2);
  const leaf = mat(0x3a8a64);
  for (let i = 0; i < 8; i++) {
    const x = -w / 2 + 0.3 + (i % 4) * ((w - 0.6) / 3);
    const z = i < 4 ? -d / 4 : d / 4;
    g.add(mesh(new THREE.ConeGeometry(0.12, 0.35, 4), leaf, x, 0.42, z));
    const bud = mesh(new THREE.OctahedronGeometry(0.06, 0), glowing, x, 0.62, z);
    bud.castShadow = false;
    g.add(bud);
  }
  return { object: g, colliders: [{ kind: 'box', w, d }] };
}

function pillar(p: PropParams): PropResult {
  const h = p.altura ?? 3;
  const g = new THREE.Group();
  const stone = mat(p.cor ?? PROPS.stone);
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), mat(PROPS.stoneDark), 0, 0.15, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.32, 0.36, h, 8), stone, 0, h / 2 + 0.3, 0));
  g.add(mesh(new THREE.BoxGeometry(0.85, 0.25, 0.85), stone, 0, h + 0.42, 0));
  const rune = mesh(new THREE.BoxGeometry(0.1, 0.4, 0.04), mat(PART1.aetherLilac, PART1.aetherLilac, 1.3), 0, h * 0.55, 0.34);
  g.add(rune);
  return { object: g, colliders: [{ kind: 'circle', r: 0.45 }] };
}

function brokenPillar(): PropResult {
  const r = pillar({ altura: 1.2 });
  const top = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 8), mat(PROPS.stone), 0.9, 0.3, 0.3);
  top.rotation.z = Math.PI / 2.2;
  (r.object as THREE.Group).add(top);
  return r;
}

function crate(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(WOOD), 0, 0.4, 0));
  g.add(mesh(new THREE.BoxGeometry(0.84, 0.1, 0.84), mat(WOOD_DARK), 0, 0.4, 0));
  return { object: g, colliders: [{ kind: 'box', w: 0.8, d: 0.8 }] };
}

function bench(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.1, 0.45), mat(WOOD), 0, 0.45, 0));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.45, 0.4), mat(WOOD_DARK), sx * 0.65, 0.22, 0));
  return { object: g, colliders: [{ kind: 'box', w: 1.6, d: 0.45 }] };
}

function pedestal(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8), mat(PROPS.stoneDark), 0, 0.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.9, 8), mat(PROPS.stone), 0, 0.85, 0));
  const ring = mesh(new THREE.TorusGeometry(0.95, 0.04, 4, 28), mat(PART1.aetherLilac, PART1.aetherLilac, 1.4), 0, 0.42, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return { object: g, colliders: [{ kind: 'circle', r: 1.35 }] };
}

/**
 * Coração de Aether: um cristal grande flutuando sobre o pedestal, com os
 * sete selos girando em volta. Na catástrofe ele sobe, os selos se partem
 * e o brilho se apaga.
 */
function heart(): PropResult {
  const base = pedestal();
  const g = base.object as THREE.Group;
  const crystalMat = new THREE.MeshStandardMaterial({
    color: PART1.aetherCyan,
    emissive: PART1.aetherCyan,
    emissiveIntensity: 2,
    flatShading: true,
    roughness: 0.15,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), crystalMat);
  crystal.scale.set(0.8, 1.4, 0.8);
  const inner = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  crystal.add(inner);
  g.add(crystal);

  const seals: THREE.Mesh[] = [];
  const sealColors = [0x6b8f4e, 0x3a8a64, 0x6fa8a8, 0xd9a443, 0xa8d8ff, 0x3a9ab0, 0xf4e6b0];
  for (let i = 0; i < 7; i++) {
    const seal = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16, 0), mat(sealColors[i], sealColors[i], 1.4));
    g.add(seal);
    seals.push(seal);
  }

  const light = new THREE.PointLight(PART1.aetherCyan, 16, 12, 1.6);
  light.position.y = 2.4;
  g.add(light);

  let lift = 0;
  let liftTarget = 0;
  let broken = 0;
  let dim = 0;
  let dimTarget = 0;

  return {
    object: g,
    colliders: base.colliders,
    animate: (dt, t) => {
      lift += (liftTarget - lift) * Math.min(1, dt * 1.5);
      dim += (dimTarget - dim) * Math.min(1, dt * 1.2);
      crystal.position.y = 2.1 + lift * 1.6 + Math.sin(t * 1.4) * 0.1;
      crystal.rotation.y = t * (0.5 + lift * 2);
      crystalMat.emissiveIntensity = (2 + lift * 3) * (1 - dim * 0.9);
      crystalMat.color.setHex(dim > 0.5 ? PART2_EMBER : PART1.aetherCyan);
      light.intensity = (16 + lift * 30) * (1 - dim * 0.85) + Math.sin(t * 2.3) * 2;
      light.color.setHex(dim > 0.5 ? PART2_EMBER : PART1.aetherCyan);
      if (broken > 0) broken = Math.min(1, broken + dt * 0.6);
      seals.forEach((seal, i) => {
        const a = (i / 7) * Math.PI * 2 + t * 0.6;
        const r = 1.1 + broken * 7;
        seal.position.set(Math.cos(a) * r, crystal.position.y + Math.sin(t * 2 + i) * 0.15 + broken * 2, Math.sin(a) * r);
        seal.rotation.set(t * 1.3 + i, t * 0.9, 0);
        seal.visible = broken < 1;
        seal.scale.setScalar(1 - broken * 0.8);
      });
    },
    events: {
      'coracao-sobe': () => (liftTarget = 1),
      'selos-quebram': () => (broken = 0.001),
      'coracao-apaga': () => {
        liftTarget = 0.3;
        dimTarget = 1;
      },
    },
  };
}

const PART2_EMBER = 0xe2704a;

// -- Parte 2: ruínas, acampamento e campos ------------------------------------

/** Casa destruída: paredes quebradas, vigas caídas e sem telhado. */
function ruin(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [4.5, 3.4];
  const h = p.altura ?? 2.2;
  const g = new THREE.Group();
  const wall = mat(p.cor ?? '#5a5560');
  const dark = mat(0x2a2630);
  g.add(mesh(new THREE.BoxGeometry(w + 0.1, 0.3, d + 0.1), mat(PROPS.stoneDark), 0, 0.15, 0));
  // Paredes com alturas diferentes, como se tivessem caído aos pedaços.
  const walls: Array<[number, number, number, number, number]> = [
    [0, -d / 2, w, 0.3, h],
    [-w / 2, 0, 0.3, d, h * 0.55],
    [w / 2, 0, 0.3, d, h * 0.8],
    [-w * 0.3, d / 2, w * 0.4, 0.3, h * 0.5],
  ];
  for (const [x, z, sx, sz, sh] of walls) g.add(mesh(new THREE.BoxGeometry(sx, sh, sz), wall, x, sh / 2 + 0.2, z));
  // Janela vazia e viga caída
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.34), dark, w * 0.2, h * 0.55, -d / 2));
  const beam = mesh(new THREE.BoxGeometry(0.2, 0.2, d * 0.9), mat(WOOD_DARK), -w * 0.1, h * 0.9, 0);
  beam.rotation.set(0, 0.2, -0.45);
  g.add(beam);
  // Entulho em volta
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const rock = mesh(
      new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.1, 0),
      mat(i % 2 ? PROPS.stone : PROPS.stoneDark),
      Math.cos(a) * (w * 0.55),
      0.15,
      Math.sin(a) * (d * 0.6),
    );
    g.add(rock);
  }
  // Brasas ainda acesas num canto
  const ember = mesh(new THREE.OctahedronGeometry(0.1, 0), mat(PART2_EMBER, PART2_EMBER, 2.4), w * 0.15, 0.4, d * 0.1);
  ember.castShadow = false;
  g.add(ember);
  return { object: g, colliders: [{ kind: 'box', w: w + 0.1, d: d + 0.1 }] };
}

function rubble(): PropResult {
  const g = new THREE.Group();
  const stones = [PROPS.stone, PROPS.stoneDark, 0x6a6470];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.1;
    const r = 0.25 + (i % 3) * 0.14;
    const s = mesh(new THREE.DodecahedronGeometry(r, 0), mat(stones[i % 3]), Math.cos(a) * 0.55, r * 0.5, Math.sin(a) * 0.45);
    s.rotation.set(i, a, 0);
    g.add(s);
  }
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.12, 0.2), mat(WOOD_DARK), 0.1, 0.5, 0.1).rotateZ(0.5));
  return { object: g, colliders: [{ kind: 'circle', r: 0.85 }] };
}

/** Tenda da resistência: lona remendada com uma bandeira. */
function tent(p: PropParams): PropResult {
  const g = new THREE.Group();
  const cloth = mat(p.cor ?? '#6a6a52');
  const shape = new THREE.Shape();
  shape.moveTo(-1.3, 0);
  shape.lineTo(1.3, 0);
  shape.lineTo(0, 1.9);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false });
  geo.translate(0, 0, -1.2);
  g.add(mesh(geo, cloth));
  g.add(mesh(new THREE.BoxGeometry(0.7, 1.1, 0.06), mat(0x1c1a22), 0, 0.55, 1.22));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), mat(WOOD_DARK), 0, 1.3, -1.25));
  const flag = mesh(new THREE.BoxGeometry(0.55, 0.32, 0.03), mat(0x2e7d5b, 0x2e7d5b, 0.4), 0.3, 2.35, -1.25);
  g.add(flag);
  // Remendo colorido
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.4, 0.04), mat(0xb9a6ff), -0.5, 0.6, 1.0).rotateZ(0.4));
  return { object: g, colliders: [{ kind: 'box', w: 2.6, d: 2.4 }] };
}

/** Bandeira rasgada do exército de Vaelor ou da Guarda caída. */
function banner(p: PropParams): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 3, 5), mat(WOOD_DARK), 0, 1.5, 0));
  const cloth = mesh(new THREE.BoxGeometry(0.9, 1.1, 0.03), mat(p.cor ?? '#3a1f66'), 0.5, 2.3, 0);
  g.add(cloth);
  g.add(mesh(new THREE.ConeGeometry(0.25, 0.4, 3), mat(p.cor ?? '#3a1f66'), 0.55, 1.55, 0).rotateZ(Math.PI));
  const sigil = mesh(new THREE.OctahedronGeometry(0.14, 0), mat(0xb9a6ff, 0xb9a6ff, 1.2), 0.5, 2.35, 0.03);
  sigil.castShadow = false;
  g.add(sigil);
  return {
    object: g,
    colliders: [{ kind: 'circle', r: 0.12 }],
    animate: (_dt, t) => {
      cloth.rotation.y = Math.sin(t * 1.5) * 0.12;
    },
  };
}

function barn(p: PropParams): PropResult {
  const result = house({ ...p, tamanho: p.tamanho ?? [6, 4.4], altura: p.altura ?? 2.8, cor: p.cor ?? '#8a4a3a', telhado: p.telhado ?? '#4b3527' });
  const g = result.object as THREE.Group;
  // Portão grande de celeiro em X
  const door = mesh(new THREE.BoxGeometry(1.8, 2, 0.08), mat(WOOD_DARK), 0, 1, (p.tamanho?.[1] ?? 4.4) / 2 + 0.05);
  g.add(door);
  for (const s of [1, -1]) {
    const brace = mesh(new THREE.BoxGeometry(0.1, 2.3, 0.05), mat(WOOD), 0, 1, (p.tamanho?.[1] ?? 4.4) / 2 + 0.1);
    brace.rotation.z = s * 0.7;
    g.add(brace);
  }
  return result;
}

function hay(): PropResult {
  const g = new THREE.Group();
  const bale = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 10), mat(0xc8a860), 0, 0.55, 0);
  bale.rotation.z = Math.PI / 2;
  g.add(bale);
  g.add(mesh(new THREE.TorusGeometry(0.56, 0.03, 4, 10), mat(WOOD_DARK), 0.2, 0.55, 0).rotateY(Math.PI / 2));
  return { object: g, colliders: [{ kind: 'box', w: 0.95, d: 1.1 }] };
}

/** Fileiras de plantação: terra escura com talos queimados ou brotos verdes. */
function crops(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [5, 3];
  const alive = p.luz === true;
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, 0.14, d), mat(0x3a2e29), 0, 0.07, 0));
  const stalk = mat(alive ? 0x4a9a64 : 0x3a3026);
  for (let r = 0; r < Math.floor(d / 0.8); r++) {
    for (let i = 0; i < Math.floor(w / 0.55); i++) {
      const h = alive ? 0.5 : 0.25 + ((i + r) % 3) * 0.12;
      const s = mesh(new THREE.ConeGeometry(0.08, h, 4), stalk, -w / 2 + 0.35 + i * 0.55, 0.14 + h / 2, -d / 2 + 0.45 + r * 0.8);
      s.castShadow = false;
      g.add(s);
    }
  }
  return { object: g, colliders: [] };
}

function cart(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.15, 1.1), mat(WOOD), 0, 0.7, 0));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), mat(WOOD_DARK), 0, 1, 0.5));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.5, 0.08), mat(WOOD_DARK), 0, 1, -0.5));
  const wheel = (x: number) => {
    const m = mesh(new THREE.TorusGeometry(0.42, 0.07, 5, 12), mat(WOOD_DARK), x, 0.45, 0.62);
    g.add(m);
  };
  wheel(-0.7);
  wheel(0.7);
  // Uma roda no chão, a carroça quebrou
  const broken = mesh(new THREE.TorusGeometry(0.42, 0.07, 5, 12), mat(WOOD_DARK), 1.5, 0.1, -0.9);
  broken.rotation.x = Math.PI / 2;
  g.add(broken);
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 5), mat(WOOD_DARK), -1.7, 0.6, 0).rotateZ(1.3));
  return { object: g, colliders: [{ kind: 'box', w: 2.3, d: 1.3 }] };
}

function cookpot(): PropResult {
  const g = new THREE.Group();
  const fire = campfire();
  g.add(fire.object);
  const pot = mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x2a2f3a), 0, 0.75, 0);
  pot.rotation.x = Math.PI;
  g.add(pot);
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), mat(WOOD_DARK), s * 0.4, 0.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), mat(WOOD_DARK), 0, 1, 0).rotateZ(Math.PI / 2));
  return { object: g, colliders: [{ kind: 'circle', r: 0.65 }], flicker: fire.flicker };
}

/**
 * Pedestal do selo: um círculo de pedra com a runa do território.
 * Apagado e rachado até o selo ser restaurado; depois acende e gira.
 */
function sealPedestal(p: PropParams): PropResult {
  const color = new THREE.Color(p.cor ?? '#6b8f4e');
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.35, 10), mat(PROPS.stoneDark), 0, 0.17, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 10), mat(PROPS.stone), 0, 0.6, 0));
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, emissive: color, emissiveIntensity: 0, flatShading: true });
  const ring = mesh(new THREE.TorusGeometry(1.15, 0.06, 5, 30), ringMat, 0, 0.42, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, emissive: color, emissiveIntensity: 0, flatShading: true, roughness: 0.2 });
  const crystal = mesh(new THREE.OctahedronGeometry(0.4, 0), crystalMat, 0, 1.6, 0);
  crystal.scale.set(0.8, 1.4, 0.8);
  crystal.castShadow = false;
  g.add(crystal);
  const light = new THREE.PointLight(color, 0, 10, 1.6);
  light.position.y = 1.8;
  g.add(light);
  let power = 0;
  let target = p.luz === true ? 1 : 0;
  return {
    object: g,
    colliders: [{ kind: 'circle', r: 1.5 }],
    animate: (dt, t) => {
      power += (target - power) * Math.min(1, dt * 1.4);
      ringMat.emissiveIntensity = power * 2;
      crystalMat.emissiveIntensity = power * 2.2;
      crystalMat.color.lerpColors(new THREE.Color(0x3a3f4c), color, power);
      ringMat.color.lerpColors(new THREE.Color(0x3a3f4c), color, power);
      light.intensity = power * (12 + Math.sin(t * 2.2) * 2);
      crystal.position.y = 1.6 + Math.sin(t * 1.5) * 0.08 * power;
      crystal.rotation.y = t * 0.8 * power;
    },
    events: { 'selo-restaurado': () => (target = 1) },
  };
}

// -- Biomas: floresta, pântano, deserto, montanha e costa -----------------------

/** Árvore antiga e gigante: tronco largo com raízes, copa enorme e luz de Aether. */
function giantTree(p: PropParams): PropResult {
  const g = new THREE.Group();
  const bark = mat(p.cor ?? '#4a3a2c');
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.3, 3.4, 8), bark, 0, 1.7, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const root = mesh(new THREE.ConeGeometry(0.34, 1.2, 4), bark, Math.cos(a) * 1.2, 0.35, Math.sin(a) * 1.2);
    root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    g.add(root);
  }
  const leaves = [mat(0x1f5a3a), mat(0x2a7a4a), mat(0x1a4a32)];
  for (let i = 0; i < 4; i++) {
    const crown = mesh(new THREE.IcosahedronGeometry(2.1 - i * 0.25, 0), leaves[i % 3], Math.cos(i * 1.7) * 0.8, 4.2 + i * 0.5, Math.sin(i * 1.7) * 0.8);
    crown.scale.y = 0.8;
    g.add(crown);
  }
  // Fendas brilhando no tronco
  const glow = mat(PART1.aetherCyan, PART1.aetherCyan, 1.6);
  for (let i = 0; i < 3; i++) {
    const crack = mesh(new THREE.BoxGeometry(0.06, 0.8, 0.04), glow, Math.cos(i * 2.1) * 0.95, 1.3 + i * 0.5, Math.sin(i * 2.1) * 0.95);
    crack.rotation.y = -i * 2.1;
    crack.castShadow = false;
    g.add(crack);
  }
  const light = new THREE.PointLight(PART1.aetherCyan, 6, 9, 1.6);
  light.position.set(0, 1.6, 1.4);
  g.add(light);
  return { object: g, colliders: [{ kind: 'circle', r: 1.4 }], flicker: [light] };
}

/** Cogumelos de luz: chapéus coloridos que brilham no escuro. */
function mushrooms(p: PropParams): PropResult {
  const g = new THREE.Group();
  const color = new THREE.Color(p.cor ?? '#b9a6ff');
  const stem = mat(0xe8e0d0);
  const cap = mat(color, color, 1.4);
  for (let i = 0; i < 5; i++) {
    const h = 0.3 + (i % 3) * 0.22;
    const x = Math.cos(i * 2.3) * 0.5;
    const z = Math.sin(i * 2.3) * 0.4;
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 5), stem, x, h / 2, z));
    const top = mesh(new THREE.SphereGeometry(0.2 + (i % 2) * 0.08, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, h, z);
    top.castShadow = false;
    g.add(top);
  }
  const light = new THREE.PointLight(color, 2.2, 4, 1.6);
  light.position.y = 0.7;
  g.add(light);
  return { object: g, colliders: [{ kind: 'circle', r: 0.55 }], flicker: [light] };
}

function reeds(): PropResult {
  const g = new THREE.Group();
  const stalk = mat(0x6a7a3a);
  for (let i = 0; i < 9; i++) {
    const h = 0.8 + (i % 4) * 0.3;
    const s = mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 4), stalk, Math.cos(i * 1.9) * 0.45, h / 2, Math.sin(i * 1.9) * 0.35);
    s.rotation.z = Math.sin(i) * 0.15;
    s.castShadow = false;
    g.add(s);
    if (i % 3 === 0) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 5), mat(0x5a3a22), Math.cos(i * 1.9) * 0.45, h + 0.1, Math.sin(i * 1.9) * 0.35));
  }
  return { object: g, colliders: [] };
}

/** Poça ou lago raso: disco de água, sem colisão. */
function pond(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [4, 3];
  const g = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20),
    new THREE.MeshStandardMaterial({ color: p.cor ?? '#1a4a60', roughness: 0.2, metalness: 0.2, emissive: p.cor ?? '#1a4a60', emissiveIntensity: 0.25 }),
  );
  water.scale.set(w, 1, d);
  water.position.y = 0.04;
  water.receiveShadow = true;
  g.add(water);
  return { object: g, colliders: [] };
}

function cactus(): PropResult {
  const g = new THREE.Group();
  const green = mat(0x4a7a4a);
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.7, 6), green, 0, 0.85, 0));
  for (const s of [1, -1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 5), green, 0.4 * s, 0.9 + (s > 0 ? 0.2 : 0), 0).rotateZ((Math.PI / 2) * 0));
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.55, 5), green, 0.38 * s, 1.18 + (s > 0 ? 0.2 : 0), 0));
  }
  return { object: g, colliders: [{ kind: 'circle', r: 0.4 }] };
}

/** Duna: monte de areia suave. */
function dune(p: PropParams): PropResult {
  const [w, d] = p.tamanho ?? [6, 4];
  const m = mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(p.cor ?? '#b89a6a'), 0, 0, 0);
  m.scale.set(w, (p.altura ?? 1.2) * 2, d);
  return { object: m, colliders: [{ kind: 'circle', r: Math.min(w, d) * 0.3 }] };
}

/** Rocha grande ou pico: cone irregular. */
function bigRock(p: PropParams): PropResult {
  const g = new THREE.Group();
  const color = p.cor ?? '#6a7080';
  const h = p.altura ?? 2.4;
  g.add(mesh(new THREE.ConeGeometry(1.3, h, 5), mat(color), 0, h / 2, 0));
  g.add(mesh(new THREE.ConeGeometry(0.8, h * 0.7, 5), mat(color), 0.9, h * 0.35, 0.4));
  g.add(mesh(new THREE.ConeGeometry(0.6, h * 0.5, 4), mat(color), -0.8, h * 0.25, -0.5));
  return { object: g, colliders: [{ kind: 'circle', r: 1.4 }] };
}

/** Cristal de gelo: prisma azul translúcido que brilha. */
function iceCrystal(): PropResult {
  const g = new THREE.Group();
  const ice = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x4aa8e8, emissiveIntensity: 0.9, flatShading: true, roughness: 0.1, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 4; i++) {
    const h = 0.9 + (i % 3) * 0.6;
    const c = mesh(new THREE.ConeGeometry(0.2 + (i % 2) * 0.08, h, 5), ice, Math.cos(i * 1.7) * 0.4, h / 2, Math.sin(i * 1.7) * 0.4);
    c.rotation.set(Math.sin(i) * 0.25, 0, Math.cos(i) * 0.25);
    c.castShadow = false;
    g.add(c);
  }
  const light = new THREE.PointLight(0x7ac8ff, 3, 5, 1.6);
  light.position.y = 0.8;
  g.add(light);
  return { object: g, colliders: [{ kind: 'circle', r: 0.6 }] };
}

/** Doca de madeira avançando sobre a água. */
function dock(p: PropParams): PropResult {
  const len = p.comprimento ?? 8;
  const g = new THREE.Group();
  const plank = mat(WOOD);
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.14, len), plank, 0, 0.5, 0));
  for (let i = 0; i < Math.round(len / 1.6) + 1; i++) {
    const z = -len / 2 + i * 1.6;
    for (const s of [1, -1]) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6), mat(WOOD_DARK), s * 1.05, 0.25, z));
  }
  return { object: g, colliders: [] };
}

/** Barco a remo ancorado ao lado da doca. */
function boat(): PropResult {
  const g = new THREE.Group();
  const hull = mesh(new THREE.BoxGeometry(1.4, 0.5, 3.2), mat(0x6b4a33), 0, 0.3, 0);
  g.add(hull);
  g.add(mesh(new THREE.ConeGeometry(0.7, 0.8, 4), mat(0x6b4a33), 0, 0.3, 2).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), mat(0x8a6a4a), 0, 0.6, 0.2));
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), mat(0x8a6a4a), 0, 0.6, -0.8));
  const mast = mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 5), mat(WOOD_DARK), 0, 1.6, 0.4);
  g.add(mast);
  const sail = mesh(new THREE.BoxGeometry(0.04, 1.6, 1.1), mat(0xe8e0d0), 0, 1.7, 1);
  g.add(sail);
  return {
    object: g,
    colliders: [{ kind: 'box', w: 1.5, d: 3.3 }],
    animate: (_dt, t) => {
      g.position.y = Math.sin(t * 1.2) * 0.04;
      g.rotation.z = Math.sin(t * 0.9) * 0.03;
    },
  };
}

/** Rede de pesca pendurada e caixotes de peixe. */
function fishing(): PropResult {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), mat(WOOD_DARK), -0.9, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), mat(WOOD_DARK), 0.9, 0.8, 0));
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), mat(WOOD_DARK), 0, 1.55, 0));
  const net = mesh(new THREE.PlaneGeometry(1.7, 1.2, 6, 4), new THREE.MeshStandardMaterial({ color: 0x8a8070, wireframe: true }), 0, 0.95, 0);
  g.add(net);
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.45), mat(WOOD), 0.9, 0.2, 0.7));
  return { object: g, colliders: [{ kind: 'box', w: 2, d: 0.4 }, { kind: 'box', w: 0.7, d: 0.5, x: 0.9, z: 0.7 }] };
}

const BUILDERS: Record<string, (p: PropParams) => PropResult> = {
  'arvore-gigante': giantTree,
  cogumelos: mushrooms,
  juncos: reeds,
  poca: pond,
  cacto: cactus,
  duna: dune,
  rochedo: bigRock,
  'cristal-de-gelo': iceCrystal,
  doca: dock,
  barco: boat,
  pesca: fishing,
  ruina: ruin,
  escombros: rubble,
  tenda: tent,
  bandeira: banner,
  celeiro: barn,
  feno: hay,
  plantacao: crops,
  carroca: cart,
  panela: cookpot,
  'pedestal-selo': sealPedestal,
  coracao: heart,
  casa: house,
  forja: forge,
  bigorna: anvilProp,
  poco: well,
  lampiao: lamp,
  barraca: stall,
  fogueira: campfire,
  cerca: fence,
  portal: gate,
  placa: signpost,
  canteiro: garden,
  pilar: pillar,
  'pilar-quebrado': brokenPillar,
  caixote: crate,
  banco: bench,
  pedestal,
};

/** Monta um objeto de cenário pelo tipo usado no JSON da área. */
export function buildProp(kind: string, params: PropParams): PropResult {
  const builder = BUILDERS[kind];
  if (!builder) throw new Error(`Objeto de cenário desconhecido: ${kind}`);
  return builder(params);
}

export function isProp(kind: string): boolean {
  return kind in BUILDERS;
}
