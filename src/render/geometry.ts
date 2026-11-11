import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Ângulo acima do qual uma aresta fica marcada (quinas de casa); abaixo, a superfície fica lisa. */
const CREASE = THREE.MathUtils.degToRad(48);

/** Pinta uma geometria inteira com uma cor, sem índice, pronta para juntar com outras. */
export function paint(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  if (flat !== geo) geo.dispose();
  const c = new THREE.Color(color);
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) c.toArray(colors, i * 3);
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

/** Junta várias geometrias numa só malha: uma chamada de desenho em vez de centenas. */
export function merged(geos: THREE.BufferGeometry[], material: THREE.Material, shadows = true): THREE.Mesh {
  let geo = geos.length > 0 ? mergeGeometries(geos, false) : new THREE.BufferGeometry();
  for (const g of geos) g.dispose();
  // Superfícies redondas ficam lisas; quinas fortes (caixas, telhados) continuam marcadas.
  if (geos.length > 0) {
    const smooth = toCreasedNormals(geo, CREASE);
    geo.dispose();
    geo = smooth;
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

/** Material padrão do cenário, com cor por vértice e sombreamento liso. */
export function vertexMaterial(roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness });
}

/** Alisa uma geometria solta (sem `merged`), mantendo quinas fortes. */
export function smoothed(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = toCreasedNormals(geo, CREASE);
  geo.dispose();
  return out;
}

/** Distância de um ponto a uma linha quebrada (trilhas, cercas). */
export function distanceToPolyline(p: THREE.Vector2, points: THREE.Vector2[]): number {
  let best = Infinity;
  const ab = new THREE.Vector2();
  const ap = new THREE.Vector2();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    ab.subVectors(b, a);
    ap.subVectors(p, a);
    const t = THREE.MathUtils.clamp(ap.dot(ab) / (ab.lengthSq() || 1), 0, 1);
    best = Math.min(best, Math.hypot(a.x + ab.x * t - p.x, a.y + ab.y * t - p.y));
  }
  return best;
}

/** Textura redonda e esfumada para partículas. */
export function glowSprite(): THREE.Texture {
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
