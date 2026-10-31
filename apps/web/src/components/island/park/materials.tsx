import { DataTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { boards, grass, paint, setts, type SurfacePixels } from '../../../lib/textures/park-surfaces.js';

export interface SurfaceMaps {
  map: Texture;
  roughnessMap: Texture;
  normalMap: Texture;
}

const cache = new Map<string, SurfaceMaps>();

function upload(pixels: Uint8Array, size: number, colour: boolean): Texture {
  const texture = new DataTexture(pixels, size, size);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  if (colour) texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function maps(key: string, make: () => SurfacePixels): SurfaceMaps {
  const hit = cache.get(key);
  if (hit) return hit;
  const { size, color, roughness, normal } = make();
  const made = { map: upload(color, size, true), roughnessMap: upload(roughness, size, false), normalMap: upload(normal, size, false) };
  cache.set(key, made);
  return made;
}

/** A copy of a surface tiled `x` by `y` times; the pixels are shared, only the repeat differs. */
function tiled(source: SurfaceMaps, x: number, y: number): SurfaceMaps {
  const copy = (texture: Texture) => {
    const clone = texture.clone();
    clone.repeat.set(x, y);
    clone.needsUpdate = true;
    return clone;
  };
  return { map: copy(source.map), roughnessMap: copy(source.roughnessMap), normalMap: copy(source.normalMap) };
}

export const surfaces = {
  lawn: (night: boolean, x: number, y: number) => tiled(maps(`lawn:${night}`, () => grass(night ? '#3f6a52' : '#a9dc95')), x, y),
  paving: (night: boolean, x: number, y: number) =>
    tiled(maps(`setts:${night}`, () => (night ? setts('#6d6488', '#4e4766') : setts('#efe2cc', '#c7b597'))), x, y),
  deck: (x: number, y: number) => tiled(maps('deck', () => boards('#c99d76')), x, y),
  steel: (colour: string) => maps(`paint:${colour}`, () => paint(colour)),
};
