import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRandom, range } from '../core/random';
import { PART1, PROPS } from '../render/palette';
import type { Area, Exit, Spawn } from './Area';
import { CollisionWorld } from './Collision';
import { MapEnemy } from './MapEnemy';
import type { Npc } from './Npc';

/** Raio da área em que o jogador pode andar. */
const WALK_RADIUS = 18;
/** Centro do altar de Aether. */
const SHRINE = new THREE.Vector2(0, -5);
/** Trilha de terra, de sul para norte. */
const PATH: THREE.Vector2[] = [
  new THREE.Vector2(0.5, 30),
  new THREE.Vector2(-0.8, 14),
  new THREE.Vector2(0.4, 4),
  new THREE.Vector2(0, -2.2),
  new THREE.Vector2(-1.2, -9),
  new THREE.Vector2(1.6, -18),
  new THREE.Vector2(-0.5, -40),
];

/**
 * Clareira do altar: floresta noturna em volta de um altar de Aether, ao norte
 * do Salão da Guarda. O cenário é gerado no código com formas simples; a
 * colisão usa círculos (árvores, pedras, pilares) e uma borda circular.
 */
export class ClearingArea implements Area {
  readonly id = 'clareira';
  readonly name = 'Clareira do Altar';
  readonly root = new THREE.Group();
  readonly collision = new CollisionWorld();
  readonly npcs: Npc[] = [];
  /** Dois Brotinhos de Aether passeando pela clareira. */
  readonly enemies: MapEnemy[] = [
    new MapEnemy('brotinho-de-aether', -5.5, 3, 11),
    new MapEnemy('brotinho-de-aether', 6, -1, 23),
  ];
  readonly spawns: Record<string, Spawn> = {
    centro: { x: 0, z: 7, yaw: 0 },
    'trilha-sul': { x: 0.3, z: 15.2, yaw: Math.PI },
  };
  readonly exits: Exit[] = [
    { minX: -2.5, maxX: 2.5, minZ: 16.6, maxZ: 19, to: 'salao-da-guarda', spawn: 'porta-norte' },
  ];
  /** Ponto livre usado para afastar árvores do caminho de chegada. */
  private readonly spawn = new THREE.Vector2(0, 7);

  private readonly moon: THREE.DirectionalLight;
  private readonly moonOffset = new THREE.Vector3(-7, 16, 9);
  private readonly crystal: THREE.Mesh;
  private readonly crystalLight: THREE.PointLight;
  private readonly fireflies: THREE.Points;
  private readonly fireflyBase: Float32Array;
  private readonly fireflySeed: Float32Array;
  private time = 0;
  /** Materiais das árvores, que ficam transparentes durante a batalha. */
  private readonly treeMaterials: THREE.MeshStandardMaterial[] = [];
  private treeOpacity = 1;
  private battle = false;

  constructor() {
    const rand = createRandom(20261110);
    const scene = this.root;
    scene.name = this.name;
    this.collision.addBoundary(0, 0, WALK_RADIUS);

    // Luz: céu noturno, lua azulada com sombra e o brilho do cristal.
    scene.add(new THREE.HemisphereLight(0x6f8fc4, PART1.night, 1.4));
    this.moon = new THREE.DirectionalLight(0xc4d2ff, 2.2);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const cam = this.moon.shadow.camera;
    cam.left = cam.bottom = -16;
    cam.right = cam.top = 16;
    cam.near = 1;
    cam.far = 50;
    this.moon.shadow.bias = -0.0004;
    this.moon.shadow.normalBias = 0.03;
    scene.add(this.moon, this.moon.target);

    scene.add(this.buildGround(rand));
    scene.add(this.buildTrees(rand));
    scene.add(this.buildRocks(rand));
    scene.add(this.buildGrass(rand));

    const shrine = this.buildShrine();
    scene.add(shrine.group);
    this.crystal = shrine.crystal;
    this.crystalLight = shrine.light;

    scene.add(this.buildGate());

    const flies = this.buildFireflies(rand);
    this.fireflies = flies.points;
    this.fireflyBase = flies.base;
    this.fireflySeed = flies.seed;
    scene.add(this.fireflies);

    for (const enemy of this.enemies) scene.add(enemy.model.root);
  }

  applyEnvironment(scene: THREE.Scene): void {
    scene.background = new THREE.Color(PART1.night);
    scene.fog = new THREE.Fog(PART1.night, 20, 46);
  }

  /** Na batalha, as árvores ficam transparentes para não esconder o inimigo. */
  setBattleMode(on: boolean): void {
    this.battle = on;
  }

  /** Animações só visuais. Rodam no render, então seguem vivas mesmo com o jogo pausado. */
  animate(dt: number, focus: THREE.Vector3): void {
    this.time += dt;
    const t = this.time;

    // A sombra da lua acompanha o jogador para não precisar cobrir o mapa inteiro.
    this.moon.position.copy(focus).add(this.moonOffset);
    this.moon.target.position.copy(focus);

    this.crystal.position.y = 1.75 + Math.sin(t * 1.6) * 0.08;
    this.crystal.rotation.y = t * 0.6;
    this.crystalLight.intensity = 14 + Math.sin(t * 2.3) * 2.5 + Math.sin(t * 7.1) * 0.8;

    const pos = this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const s = this.fireflySeed[i / 3];
      arr[i] = this.fireflyBase[i] + Math.sin(t * 0.4 + s * 6.28) * 0.7;
      arr[i + 1] = this.fireflyBase[i + 1] + Math.sin(t * (0.8 + s) + s * 12) * 0.35;
      arr[i + 2] = this.fireflyBase[i + 2] + Math.cos(t * 0.33 + s * 9) * 0.7;
    }
    pos.needsUpdate = true;
    (this.fireflies.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(t * 3) * 0.15;

    for (const enemy of this.enemies) enemy.animate(dt);

    const targetOpacity = this.battle ? 0.18 : 1;
    if (Math.abs(this.treeOpacity - targetOpacity) > 0.001) {
      this.treeOpacity += (targetOpacity - this.treeOpacity) * Math.min(1, dt * 6);
      if (Math.abs(this.treeOpacity - targetOpacity) < 0.01) this.treeOpacity = targetOpacity;
      const transparent = this.treeOpacity < 1;
      for (const m of this.treeMaterials) {
        if (m.transparent !== transparent) {
          m.transparent = transparent;
          m.depthWrite = !transparent;
          m.needsUpdate = true;
        }
        m.opacity = this.treeOpacity;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Construção do cenário

  /** Altura do terreno: plano no meio, subindo em colinas na borda. */
  private height(x: number, z: number): number {
    const d = Math.hypot(x, z);
    const bumps = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.05;
    const rise = Math.max(0, d - (WALK_RADIUS + 1));
    const hills = Math.pow(rise, 1.35) * 0.32 * (0.8 + 0.4 * Math.sin(Math.atan2(z, x) * 5));
    return bumps + hills;
  }

  private buildGround(rand: () => number): THREE.Mesh {
    const indexed = new THREE.PlaneGeometry(100, 100, 70, 70);
    indexed.rotateX(-Math.PI / 2);
    const p = indexed.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (rand() - 0.5) * 0.5;
      const z = p.getZ(i) + (rand() - 0.5) * 0.5;
      p.setXYZ(i, x, this.height(x, z), z);
    }

    // Sem índice, cada triângulo tem os próprios vértices e pode ter cor própria.
    const geo = indexed.toNonIndexed();
    indexed.dispose();
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(PART1.forest);
    const grassB = new THREE.Color(PART1.leaf);
    const dirt = new THREE.Color(PROPS.dirt);
    const dirtDark = new THREE.Color(PROPS.dirtDark);
    const tmp = new THREE.Color();
    const center = new THREE.Vector2();

    for (let i = 0; i < pos.count; i += 3) {
      center.set(
        (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
        (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
      );
      const onPath = distanceToPath(center) < 1.1 || center.distanceTo(SHRINE) < 3.2;
      if (onPath) {
        tmp.lerpColors(dirtDark, dirt, rand());
      } else {
        tmp.lerpColors(grassA, grassB, rand() * 0.35);
        // Escurece fora da clareira, para a borda sumir na névoa.
        const fade = THREE.MathUtils.clamp((center.length() - WALK_RADIUS) / 12, 0, 0.55);
        tmp.multiplyScalar(1 - fade);
      }
      for (let k = 0; k < 3; k++) tmp.toArray(colors, (i + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
    );
    mesh.receiveShadow = true;
    mesh.name = 'Chão';
    return mesh;
  }

  private buildTrees(rand: () => number): THREE.Group {
    const foliage: THREE.BufferGeometry[] = [];
    const trunks: THREE.BufferGeometry[] = [];
    const placed: THREE.Vector2[] = [];
    const greens = [PART1.forest, PART1.leaf, 0x24584a, 0x1d4a44, 0x2f6b55];

    for (let tries = 0; tries < 3000 && placed.length < 170; tries++) {
      const angle = rand() * Math.PI * 2;
      // Mais árvores na borda, algumas soltas dentro da clareira.
      const dist = rand() < 0.15 ? range(rand, 6, WALK_RADIUS - 2) : range(rand, WALK_RADIUS - 1, 40);
      const p = new THREE.Vector2(Math.cos(angle) * dist, Math.sin(angle) * dist);

      if (distanceToPath(p) < 2.4) continue;
      if (p.distanceTo(SHRINE) < 5) continue;
      if (p.distanceTo(this.spawn) < 3) continue;
      if (placed.some((q) => q.distanceTo(p) < 2.1)) continue;
      placed.push(p);

      const scale = range(rand, 0.8, 1.45);
      const y = this.height(p.x, p.y) - 0.1;
      const color = new THREE.Color(greens[Math.floor(rand() * greens.length)]);
      color.offsetHSL(0, 0, range(rand, -0.03, 0.03));

      const trunk = new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.1 * scale, 6);
      trunk.translate(p.x, y + 0.55 * scale, p.y);
      trunks.push(paint(trunk, new THREE.Color(PROPS.trunk)));

      if (rand() < 0.7) {
        // Pinheiro: cones empilhados
        const layers = rand() < 0.5 ? 3 : 2;
        for (let l = 0; l < layers; l++) {
          const r = (1.25 - l * 0.3) * scale;
          const h = (1.4 - l * 0.15) * scale;
          const cone = new THREE.ConeGeometry(r, h, 7);
          cone.rotateY(rand() * Math.PI);
          cone.translate(p.x, y + (1.3 + l * 0.75) * scale, p.y);
          foliage.push(paint(cone, color.clone().offsetHSL(0, 0, l * 0.03)));
        }
      } else {
        // Árvore de copa redonda
        const crown = new THREE.IcosahedronGeometry(1.1 * scale, 0);
        crown.scale(1, 0.85, 1);
        crown.translate(p.x, y + 1.75 * scale, p.y);
        foliage.push(paint(crown, color));
      }

      if (p.length() < WALK_RADIUS + 1) this.collision.addCircle(p.x, p.y, 0.32 * scale);
    }

    const group = new THREE.Group();
    group.name = 'Árvores';
    const leaves = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
    this.treeMaterials.push(leaves, wood);
    group.add(merged(foliage, leaves), merged(trunks, wood));
    return group;
  }

  private buildRocks(rand: () => number): THREE.Mesh {
    const rocks: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = range(rand, 4, 30);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (distanceToPath(new THREE.Vector2(x, z)) < 1.6) continue;
      if (Math.hypot(x - SHRINE.x, z - SHRINE.y) < 4.5) continue;

      const size = range(rand, 0.18, 0.5);
      const rock = new THREE.DodecahedronGeometry(size, 0);
      rock.scale(range(rand, 1, 1.5), range(rand, 0.55, 0.85), range(rand, 1, 1.3));
      rock.rotateY(rand() * Math.PI);
      rock.translate(x, this.height(x, z) + size * 0.2, z);
      const tone = new THREE.Color(PROPS.rock).lerp(new THREE.Color(PROPS.rockDark), rand());
      rocks.push(paint(rock, tone));
      if (size > 0.35 && dist < WALK_RADIUS) this.collision.addCircle(x, z, size * 1.2);
    }
    return merged(rocks, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
  }

  private buildGrass(rand: () => number): THREE.Group {
    const tufts: THREE.BufferGeometry[] = [];
    const flowers: THREE.BufferGeometry[] = [];
    const grass = [0x3a8a64, 0x2e7d5b, 0x45946a];
    const glow = [PART1.aetherCyan, PART1.aetherLilac];

    for (let i = 0; i < 260; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * (WALK_RADIUS + 4);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (distanceToPath(new THREE.Vector2(x, z)) < 1.2) continue;
      if (Math.hypot(x - SHRINE.x, z - SHRINE.y) < 3.3) continue;
      const y = this.height(x, z);

      for (let b = 0; b < 3; b++) {
        const blade = new THREE.ConeGeometry(0.06, range(rand, 0.25, 0.45), 3);
        blade.rotateZ(range(rand, -0.35, 0.35));
        blade.rotateY(rand() * Math.PI * 2);
        blade.translate(x + range(rand, -0.12, 0.12), y + 0.15, z + range(rand, -0.12, 0.12));
        tufts.push(paint(blade, new THREE.Color(grass[b % grass.length])));
      }

      // Flores de Aether, mais comuns perto do altar
      const nearShrine = Math.hypot(x - SHRINE.x, z - SHRINE.y) < 9;
      if (rand() < (nearShrine ? 0.45 : 0.08)) {
        const bloom = new THREE.OctahedronGeometry(0.07, 0);
        bloom.translate(x + 0.2, y + 0.28, z);
        flowers.push(paint(bloom, new THREE.Color(glow[Math.floor(rand() * glow.length)])));
      }
    }

    const group = new THREE.Group();
    group.name = 'Grama e flores';
    const tuftMesh = merged(tufts, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
    tuftMesh.castShadow = false;
    const flowerMesh = merged(flowers, new THREE.MeshBasicMaterial({ vertexColors: true }));
    flowerMesh.castShadow = false;
    group.add(tuftMesh, flowerMesh);
    return group;
  }

  private buildShrine(): { group: THREE.Group; crystal: THREE.Mesh; light: THREE.PointLight } {
    const group = new THREE.Group();
    group.name = 'Altar de Aether';
    group.position.set(SHRINE.x, 0, SHRINE.y);

    const stone = new THREE.MeshStandardMaterial({ color: PROPS.stone, flatShading: true, roughness: 0.9 });
    const stoneDark = new THREE.MeshStandardMaterial({ color: PROPS.stoneDark, flatShading: true });
    const runeMat = new THREE.MeshStandardMaterial({
      color: PART1.aetherLilac,
      emissive: PART1.aetherLilac,
      emissiveIntensity: 1.2,
      flatShading: true,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.35, 8), stoneDark);
    base.position.y = 0.17;
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.4, 8), stone);
    tier.position.y = 0.55;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 4, 24), runeMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.37;
    group.add(base, tier, ring);

    // Pedras em pé, em círculo, com uma runa acesa em cada
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * 2.6;
      const z = Math.sin(a) * 2.6;
      const h = 1.1 + (i % 2) * 0.35;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.32), stone);
      pillar.position.set(x, h / 2, z);
      pillar.lookAt(0, h / 2, 0);
      pillar.rotation.z += (i % 3) * 0.05 - 0.05;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.02), runeMat);
      rune.position.set(0, h * 0.15, 0.17);
      pillar.add(rune);
      group.add(pillar);
      this.collision.addCircle(SHRINE.x + x, SHRINE.y + z, 0.36);
    }
    this.collision.addCircle(SHRINE.x, SHRINE.y, 1.4);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: PART1.aetherCyan,
        emissive: PART1.aetherCyan,
        emissiveIntensity: 1.6,
        flatShading: true,
        roughness: 0.2,
      }),
    );
    crystal.scale.set(0.8, 1.5, 0.8);
    crystal.castShadow = false;
    group.add(crystal);

    const light = new THREE.PointLight(PART1.aetherCyan, 14, 11, 1.6);
    light.position.y = 1.9;
    group.add(light);

    group.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== crystal) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return { group, crystal, light };
  }

  /** Duas pedras com lanternas na ponta sul da trilha: o caminho de volta ao salão. */
  private buildGate(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Portal do salão';
    const stone = new THREE.MeshStandardMaterial({ color: PROPS.stone, flatShading: true });
    const glass = new THREE.MeshStandardMaterial({
      color: 0xffc27a,
      emissive: 0xffa25a,
      emissiveIntensity: 2,
      flatShading: true,
    });
    for (const x of [-2.4, 1.3]) {
      const z = 16.6;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.45), stone);
      post.position.set(x, this.height(x, z) + 0.75, z);
      post.castShadow = true;
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glass);
      lamp.position.set(x, post.position.y + 0.95, z);
      const light = new THREE.PointLight(0xffa25a, 6, 6, 1.6);
      light.position.copy(lamp.position);
      group.add(post, lamp, light);
      this.collision.addCircle(x, z, 0.35);
    }
    return group;
  }

  private buildFireflies(rand: () => number) {
    const count = 140;
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color(PART1.aetherCyan);
    const lilac = new THREE.Color(PART1.aetherLilac);

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * 26;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      base.set([x, this.height(x, z) + range(rand, 0.4, 2.6), z], i * 3);
      seed[i] = rand();
      (rand() < 0.6 ? cyan : lilac).toArray(colors, i * 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.38,
        map: glowSprite(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    );
    points.name = 'Vaga-lumes de Aether';
    points.frustumCulled = false;
    return { points, base, seed };
  }
}

// -----------------------------------------------------------------------------
// Utilitários

function distanceToPath(p: THREE.Vector2): number {
  let best = Infinity;
  const ab = new THREE.Vector2();
  const ap = new THREE.Vector2();
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    ab.subVectors(b, a);
    ap.subVectors(p, a);
    const t = THREE.MathUtils.clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
    const dx = a.x + ab.x * t - p.x;
    const dy = a.y + ab.y * t - p.y;
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** Pinta uma geometria inteira com uma cor, sem índice, pronta para juntar com outras. */
function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  if (flat !== geo) geo.dispose();
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

/** Junta várias geometrias numa só malha: uma chamada de desenho em vez de centenas. */
function merged(geos: THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh {
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Textura redonda e esfumada para as partículas. */
function glowSprite(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
