import { hash, rgb, shade } from '../textures/relief.js';
import { paintTile } from '../textures/block-tiles.js';
import type { HairStyle, Look } from './look.js';

/** Every face of a blocky figure is an 8 by 8 pixel painting. */
export const SKIN_SIZE = 8;

type RGB = [number, number, number];

/** How many rows of hair hang down the sides and back of the head. */
const HAIR_ROWS: Readonly<Record<HairStyle, { side: number; back: number }>> = {
  short: { side: 2, back: 4 },
  spiky: { side: 2, back: 4 },
  buzz: { side: 1, back: 2 },
  cap: { side: 2, back: 3 },
  bob: { side: 5, back: 6 },
  long: { side: 7, back: 8 },
  ponytail: { side: 3, back: 8 },
  bun: { side: 3, back: 5 },
};

/** A colour with a faint per-pixel grain, so flat areas read as fabric or skin, not plastic. */
function grain(colour: RGB, x: number, y: number, seed: number): RGB {
  return shade(colour, 0.93 + hash(x, y, seed) * 0.1);
}

export interface HeadFaces {
  front: Uint8Array;
  side: Uint8Array;
  back: Uint8Array;
  top: Uint8Array;
  bottom: Uint8Array;
}

/** The head: a face with eyes and a mouth, and hair over the top, sides and back. */
export function headFaces(look: Look): HeadFaces {
  const skin = rgb(look.skin);
  const hair = rgb(look.hairColor);
  const rows = HAIR_ROWS[look.hair];
  const fringe = look.hair === 'buzz' ? 1 : 2;
  const lens = rgb('#2b2b33');
  const front = paintTile((x, y) => {
    // Long styles frame the face down both sides.
    if (y < fringe || (rows.side > 4 && (x === 0 || x === 7) && y < rows.side)) return grain(hair, x, y, 5);
    if (y === 4 && (x === 1 || x === 6)) return [245, 245, 245];
    if (y === 4 && (x === 2 || x === 5)) return [58, 72, 140];
    if (look.glasses && y === 3 && x >= 1 && x <= 6) return lens;
    if (y === 6 && (x === 3 || x === 4)) return shade(skin, 0.62);
    return grain(skin, x, y, 7);
  }, SKIN_SIZE);
  const side = paintTile((x, y) => (y < rows.side || (y < rows.back && x > 4) ? grain(hair, x, y, 9) : grain(skin, x, y, 11)), SKIN_SIZE);
  const back = paintTile((x, y) => (y < rows.back ? grain(hair, x, y, 13) : grain(skin, x, y, 15)), SKIN_SIZE);
  const top = paintTile((x, y) => grain(hair, x, y, 17), SKIN_SIZE);
  const bottom = paintTile((x, y) => (rows.back >= SKIN_SIZE && y > 4 ? grain(hair, x, y, 19) : grain(skin, x, y, 19)), SKIN_SIZE);
  return { front, side, back, top, bottom };
}

/** The torso: shirt with a darker collar band across the top and a seam down the middle. */
export function torsoFace(shirt: string): Uint8Array {
  const cloth = rgb(shirt);
  return paintTile((x, y) => {
    if (y === 0) return shade(cloth, 0.7);
    if (y === 7) return shade(cloth, 0.8);
    return grain(cloth, x, y, 21);
  }, SKIN_SIZE);
}

/** An arm: a short sleeve over bare skin, with the hand at the bottom. */
export function armFace(shirt: string, look: Look): Uint8Array {
  const cloth = rgb(shirt);
  const skin = rgb(look.skin);
  return paintTile((x, y) => (y < 3 ? grain(cloth, x, y, 23) : y === 3 ? shade(cloth, 0.75) : grain(skin, x, y, 25)), SKIN_SIZE);
}

/** A leg: trousers, or bare skin under a skirt, down to a shoe. */
export function legFace(look: Look): Uint8Array {
  const pants = rgb(look.skirt ? look.skin : look.pants);
  const shoe = rgb(look.shoes);
  return paintTile((x, y) => (y >= 6 ? grain(shoe, x, y, 27) : grain(pants, x, y, 29)), SKIN_SIZE);
}
