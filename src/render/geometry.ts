import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  const geo = geos.length > 0 ? mergeGeometries(geos, false) : new THREE.BufferGeometry();
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  return mesh;
}

/** Material padrão do cenário low-poly, com cor por vértice. */
export function vertexMaterial(roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness });
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
