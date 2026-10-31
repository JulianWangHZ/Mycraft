import {
  DataTexture,
  DoubleSide,
  LinearMipmapLinearFilter,
  MeshLambertMaterial,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Material,
} from 'three';
import { SIGHT_TUNNEL } from '../../../lib/island/sight-line.js';
import { TILES, type Tile } from '../../../lib/scenes/blocks/blocks.js';
import { TILE_SIZE, tilePixels } from '../../../lib/textures/block-tiles.js';

const textures = new Map<Tile, DataTexture>();

/** Camera and target, shared by every terrain material; the scene updates them each frame. */
export const sightUniforms = {
  uSightCamera: { value: new Vector3() },
  uSightTarget: { value: new Vector3() },
};

const { near, far, until, above, ghost, below } = SIGHT_TUNNEL;
const glsl = (n: number) => n.toFixed(4);

/**
 * Fades anything between the camera and its target, so hills never hide the village. Faded
 * pixels are dropped in an ordered dither pattern rather than blended, so the terrain needs no
 * sorting and still casts its full shadow. Mirrors `sightFade`.
 */
function seeThrough(material: MeshLambertMaterial): MeshLambertMaterial {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sightUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSightWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSightWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vSightWorld;
uniform vec3 uSightCamera;
uniform vec3 uSightTarget;
const float SIGHT_DITHER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
{
  vec3 seg = uSightTarget - uSightCamera;
  vec3 rel = vSightWorld - uSightCamera;
  float t = dot(rel, seg) / max(dot(seg, seg), 1e-4);
  if (t > 0.0 && t < ${glsl(until)} && vSightWorld.y > ${glsl(above)}) {
    float radius = mix(${glsl(near)}, ${glsl(far)}, t);
    vec3 off = rel - seg * t;
    float edge = smoothstep(radius * 0.65, radius, length(off) * (off.y < 0.0 ? ${glsl(below)} : 1.0));
    float solid = mix(${glsl(ghost)}, 1.0, edge);
    ivec2 cell = ivec2(mod(gl_FragCoord.xy, 4.0));
    if (solid < (SIGHT_DITHER[cell.y * 4 + cell.x] + 0.5) / 16.0) discard;
  }
}`,
      );
  };
  return material;
}

/** Hard pixels up close; blended mipmaps far off, so distant hillsides do not shimmer. */
export function tileTexture(tile: Tile): DataTexture {
  const hit = textures.get(tile);
  if (hit) return hit;
  const texture = new DataTexture(tilePixels(tile), TILE_SIZE, TILE_SIZE);
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textures.set(tile, texture);
  return texture;
}

let terrain: Material[] | null = null;
let plants: Material[] | null = null;
let water: Material[] | null = null;

/** One material per tile, indexed like `TILES`, for the terrain mesh and its per-corner shading. */
export function terrainMaterials(): Material[] {
  terrain ??= TILES.map((tile) => seeThrough(new MeshLambertMaterial({ map: tileTexture(tile), vertexColors: true })));
  return terrain;
}

/** Cut-out sprites and panes, seen from both sides; grass takes its biome tint from the vertices. */
export function plantMaterials(): Material[] {
  plants ??= TILES.map((tile) => seeThrough(new MeshLambertMaterial({ map: tileTexture(tile), alphaTest: 0.5, side: DoubleSide, vertexColors: true })));
  return plants;
}

/** The water surface texture; it repeats so it can be scrolled to make the water flow. */
export function waterTexture(): DataTexture {
  const texture = tileTexture('water');
  if (texture.wrapS !== RepeatWrapping) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
  }
  return texture;
}

export function waterMaterials(): Material[] {
  waterTexture();
  water ??= TILES.map((tile) => new MeshLambertMaterial({ map: tileTexture(tile), transparent: true, opacity: 0.78, depthWrite: false }));
  return water;
}

const faces = new Map<string, MeshLambertMaterial[]>();

/**
 * Materials for a box drawn as a block, in three.js box face order: right, left, top, bottom,
 * front, back. `front` replaces the +z side, for blocks with a face such as a furnace.
 */
export function blockFaces(top: Tile, side: Tile = top, bottom: Tile = top, front: Tile = side, glow = false): MeshLambertMaterial[] {
  const key = `${top}:${side}:${bottom}:${front}:${glow}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const make = (tile: Tile) =>
    new MeshLambertMaterial({ map: tileTexture(tile), alphaTest: 0.5, ...(glow ? { emissive: '#ffd27a', emissiveMap: tileTexture(tile), emissiveIntensity: 0.9 } : {}) });
  const made = [make(side), make(side), make(top), make(bottom), make(front), make(side)];
  faces.set(key, made);
  return made;
}
