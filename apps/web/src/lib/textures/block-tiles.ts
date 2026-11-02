import type { Tile } from '../scenes/blocks/blocks.js';
import { hash, rgb, shade } from './relief.js';

/** Block faces are tiny pixel-art squares, drawn with hard pixels. */
export const TILE_SIZE = 16;

type RGB = [number, number, number];
/** Colour of one pixel, or null where the tile is see-through. `y` counts down from the top edge. */
type Painter = (x: number, y: number) => RGB | null;

/** Run a painter over every pixel. Rows are stored bottom first, the way textures are uploaded. */
export function paintTile(painter: Painter, size = TILE_SIZE): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const colour = painter(x, y);
      const p = ((size - 1 - y) * size + x) * 4;
      if (!colour) continue;
      out[p] = colour[0];
      out[p + 1] = colour[1];
      out[p + 2] = colour[2];
      out[p + 3] = 255;
    }
  }
  return out;
}

/** A base colour with every pixel nudged lighter or darker, so flat faces read as a material. */
function speckle(base: string, seed: number, spread = 0.18): Painter {
  const tone = rgb(base);
  return (x, y) => shade(tone, 1 - spread / 2 + hash(x, y, seed) * spread);
}

function blend(a: RGB, b: RGB, t: number): RGB {
  return [0, 1, 2].map((c) => Math.round((a[c] as number) + ((b[c] as number) - (a[c] as number)) * t)) as RGB;
}

/** A dirt side under a cap of another colour that hangs down unevenly. */
function capped(cap: string, seed: number): Painter {
  const top = speckle(cap, seed + 1, 0.2);
  const dirt = speckle('#866043', seed, 0.22);
  return (x, y) => (y < 3 + Math.floor(hash(x, 0, seed) * 2.4) ? top(x, y) : dirt(x, y));
}

/** Irregular stones set in darker mortar: each pixel belongs to its nearest jittered centre. */
function stones(base: string, mortar: string, seed: number, cells = 4): Painter {
  const tone = rgb(base);
  const joint = rgb(mortar);
  const step = TILE_SIZE / cells;
  const centre = (cx: number, cy: number) => {
    const wx = ((cx % cells) + cells) % cells;
    const wy = ((cy % cells) + cells) % cells;
    return [cx * step + hash(wx, wy, seed) * step, cy * step + hash(wx, wy, seed + 1) * step, hash(wx, wy, seed + 2)] as const;
  };
  return (x, y) => {
    let first = Infinity;
    let second = Infinity;
    let id = 0;
    const gx = Math.floor(x / step);
    const gy = Math.floor(y / step);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const [px, py, value] = centre(gx + dx, gy + dy);
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        if (d < first) {
          second = first;
          first = d;
          id = value;
        } else if (d < second) second = d;
      }
    }
    if (second - first < 1.1) return joint;
    return shade(tone, 0.82 + id * 0.3 + hash(x, y, seed + 3) * 0.08);
  };
}

/** Wood grain running down the face, in vertical strips. */
function bark(base: string, seed: number): Painter {
  const tone = rgb(base);
  return (x, y) => {
    const strip = hash(x, 0, seed) * 0.3;
    const knot = hash(x, Math.floor(y / 3), seed + 1) > 0.9 ? 0.75 : 1;
    return shade(tone, (0.8 + strip + hash(x, y, seed + 2) * 0.08) * knot);
  };
}

/** Cut end of a log: growth rings round the middle, bark round the rim. */
function rings(wood: string, rim: string, seed: number): Painter {
  const tone = rgb(wood);
  const edge = rgb(rim);
  return (x, y) => {
    if (x === 0 || y === 0 || x === TILE_SIZE - 1 || y === TILE_SIZE - 1) return shade(edge, 0.9 + hash(x, y, seed) * 0.15);
    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    return shade(tone, Math.floor(ring) % 2 ? 0.88 : 1.02);
  };
}

/** Leaves: mid greens with scattered dark gaps where the canopy is thin. */
function foliage(base: string, seed: number): Painter {
  const tone = rgb(base);
  return (x, y) => {
    const v = hash(x, y, seed);
    return shade(tone, v < 0.16 ? 0.55 : 0.85 + v * 0.3);
  };
}

/** Boards stacked in rows with dark seams and staggered joints. */
function boards(base: string, seed: number): Painter {
  const tone = rgb(base);
  return (x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return shade(tone, 0.62);
    if (x === ((row * 7 + 3) % TILE_SIZE)) return shade(tone, 0.7);
    return shade(tone, 0.9 + hash(row, 0, seed) * 0.14 + hash(x, y, seed + 1) * 0.06);
  };
}

/** Rows of light and dark stripes across the face. */
function bands(base: string, seed: number, every: number): Painter {
  const tone = rgb(base);
  return (x, y) => shade(tone, (Math.floor(y / every) % 2 ? 0.9 : 1.02) + hash(x, y, seed) * 0.06);
}

/** Grass blades rising from the bottom edge, some taller than others. */
function blades(base: string, seed: number): Painter {
  const tone = rgb(base);
  return (x, y) => {
    const tall = 5 + Math.floor(hash(x, 0, seed) * 10);
    if (hash(x, 1, seed) < 0.35 || TILE_SIZE - y > tall) return null;
    return shade(tone, 0.75 + (y / TILE_SIZE) * 0.25 + hash(x, y, seed + 1) * 0.1);
  };
}

/** One flower: a stem, two leaves and a round head of petals. */
function flower(petal: string, centre: string): Painter {
  const head = rgb(petal);
  const eye = rgb(centre);
  const stem = rgb('#4f8a2e');
  return (x, y) => {
    const d = Math.hypot(x - 7.5, y - 5.5);
    if (d < 1) return eye;
    if (d < 3.2) return shade(head, 0.9 + (3.2 - d) * 0.05);
    if ((x === 7 || x === 8) && y > 7) return stem;
    if (y === 11 && (x === 5 || x === 6 || x === 9 || x === 10)) return stem;
    return null;
  };
}

/** Bare twigs forking out of the ground. */
function twigs(base: string): Painter {
  const tone = rgb(base);
  return (x, y) => {
    const fromBottom = TILE_SIZE - 1 - y;
    const spread = fromBottom * 0.45;
    const on = [7.5 - spread, 7.5 + spread, 7.5 - spread * 0.4, 7.5 + spread * 0.6].some((t) => Math.abs(x - t) < 0.6);
    return on && fromBottom < 12 ? shade(tone, 0.85 + hash(x, y, 9) * 0.25) : null;
  };
}

/** Ripe wheat: stalks topped with golden ears. */
function wheat(): Painter {
  const ear = rgb('#d9b24a');
  const stalk = rgb('#a6973a');
  return (x, y) => {
    if (x % 3 === 2) return null;
    if (y < 7 && hash(x, y, 31) > 0.25) return shade(ear, 0.85 + hash(x, y, 32) * 0.3);
    return y >= 7 && x % 3 === 0 ? stalk : null;
  };
}

/** Water: deep blue with pale ripple lines. */
function ripples(base: string): Painter {
  const tone = rgb(base);
  const crest = rgb('#a9c8ff');
  return (x, y) => {
    const wave = Math.sin((x + y * 0.5) * 0.8) + Math.sin(y * 1.3 - x * 0.4);
    return wave > 1.55 ? blend(tone, crest, 0.45) : shade(tone, 0.94 + hash(x, y, 41) * 0.1);
  };
}

/** Stone with clusters of mineral flecks: a few lumps, each a small blob of pixels. */
function ore(fleck: string, seed: number): Painter {
  const rock = speckle('#8f8f93', 6, 0.2);
  const tone = rgb(fleck);
  const lumps = Array.from({ length: 4 }, (_, i) => [2 + hash(i, 0, seed) * 12, 2 + hash(i, 1, seed) * 12] as const);
  return (x, y) => {
    const near = lumps.some(([lx, ly]) => Math.hypot(x - lx, y - ly) < 1.6 && hash(x, y, seed + 1) > 0.25);
    return near ? shade(tone, 0.85 + hash(x, y, seed + 2) * 0.3) : rock(x, y);
  };
}

/** A window pane: a pale frame and a couple of glints, see-through everywhere else. */
function pane(): Painter {
  const frame = rgb('#d6eef5');
  return (x, y) => {
    if (x === 0 || y === 0 || x === TILE_SIZE - 1 || y === TILE_SIZE - 1) return frame;
    if ((x - y === 3 || x - y === 4) && x > 4 && x < 11) return [255, 255, 255];
    return null;
  };
}

/** One half of a plank door: framed boards, with windows in the top half and a handle low down. */
function door(top: boolean): Painter {
  const wood = rgb('#a2794a');
  const dark = shade(wood, 0.62);
  return (x, y) => {
    if (x <= 1 || x >= 14 || (top ? y <= 1 : y >= 14)) return dark;
    if (top && y > 3 && y < 11 && x > 3 && x < 12 && x !== 7 && x !== 8) return shade(rgb('#9fc7d9'), 0.9 + hash(x, y, 71) * 0.15);
    if (!top && x === 11 && (y === 2 || y === 3)) return rgb('#3b3b40');
    return shade(wood, (x % 4 === 0 ? 0.82 : 1) * (0.94 + hash(x, y, 72) * 0.1));
  };
}

const PAINTERS: Readonly<Record<Tile, Painter>> = {
  grassTop: speckle('#78b84c', 1, 0.26),
  grassSide: capped('#78b84c', 2),
  dirt: speckle('#866043', 3, 0.26),
  path: speckle('#a7864f', 4, 0.16),
  farmland: (x, y) => shade(rgb('#5c3b22'), (y % 4 === 0 ? 0.75 : 1) + hash(x, y, 5) * 0.12),
  stone: speckle('#8f8f93', 6, 0.2),
  cobble: stones('#8a8a8e', '#4b4b50', 7),
  gravel: (x, y) => shade(hash(x, y, 8) > 0.6 ? rgb('#7a6e66') : rgb('#9a958f'), 0.85 + hash(x, y, 9) * 0.3),
  sand: speckle('#e2d49c', 10, 0.12),
  sandstoneTop: speckle('#d9c58c', 11, 0.1),
  sandstoneSide: bands('#d9c58c', 12, 4),
  snow: speckle('#f2f7fb', 13, 0.06),
  snowSide: capped('#f2f7fb', 14),
  oakLog: bark('#6b5133', 15),
  oakLogTop: rings('#b8935a', '#6b5133', 16),
  oakLeaves: foliage('#4f9a36', 17),
  spruceLog: bark('#4a3524', 18),
  spruceLeaves: foliage('#355f3d', 19),
  planks: boards('#b88c56', 20),
  cactusSide: (x, y) => shade(rgb('#5b9e3c'), x % 4 === 0 ? 0.7 : hash(x, y, 21) > 0.94 ? 1.4 : 0.95 + hash(x, y, 22) * 0.1),
  cactusTop: rings('#7dbb55', '#4f8a33', 23),
  clayOrange: speckle('#c47a3e', 24, 0.08),
  clayRed: speckle('#a6513a', 25, 0.08),
  clayCream: speckle('#d9b99a', 26, 0.08),
  clayBrown: speckle('#7c5638', 27, 0.08),
  water: ripples('#3f74d8'),
  tallGrass: blades('#6aae44', 28),
  poppy: flower('#d8322c', '#2b2b2b'),
  dandelion: flower('#f4d23a', '#e2a51f'),
  deadBush: twigs('#8a6a3a'),
  wheat: wheat(),
  coalOre: ore('#262626', 64),
  ironOre: ore('#d8af93', 65),
  goldOre: ore('#f6d34a', 66),
  mossyCobble: (x, y) => (hash(Math.floor(x / 2), Math.floor(y / 2), 67) > 0.6 ? shade(rgb('#5f7f3a'), 0.85 + hash(x, y, 68) * 0.3) : stones('#8a8a8e', '#4b4b50', 7)(x, y)),
  andesite: (x, y) => shade(rgb('#8a8b8d'), 0.82 + hash(Math.floor(x / 2) + y, Math.floor(y / 2), 69) * 0.3),
  glass: pane(),
  doorTop: door(true),
  doorBottom: door(false),
  sprucePlanks: boards('#6e5034', 73),
  // Palm bark in rough rings, rather than the long grain of oak.
  palmLog: (x, y) => shade(rgb('#8a6a46'), (y % 4 === 0 ? 0.72 : 0.92) + hash(x, y, 74) * 0.14),
  palmLogTop: rings('#b39469', '#7a5c3a', 75),
  palmLeaves: foliage('#5aa83a', 76),
  // Pale stone deck slabs with a fine bevel round each one.
  deck: (x, y) => shade(rgb('#efe3c8'), (x === 0 || y === 0 ? 1.06 : x === 15 || y === 15 ? 0.84 : 1) * (0.95 + hash(x, y, 77) * 0.07)),
  deckDark: (x, y) => shade(rgb('#d9c7a2'), (x === 0 || y === 0 ? 1.06 : x === 15 || y === 15 ? 0.84 : 1) * (0.95 + hash(x, y, 78) * 0.07)),
  // Small glazed pool tiles, four by four, with pale grout.
  poolTile: (x, y) => (x % 4 === 3 || y % 4 === 3 ? rgb('#d8eef2') : shade(rgb('#4fb8d6'), 0.9 + hash(Math.floor(x / 4), Math.floor(y / 4), 79) * 0.2)),
  poolLine: (x, y) => (x % 4 === 3 || y % 4 === 3 ? rgb('#c9dde3') : shade(rgb('#1f4f9a'), 0.92 + hash(x, y, 80) * 0.1)),
  concreteWhite: speckle('#e9ecec', 81, 0.05),
  quartzPillar: (x, y) => shade(rgb('#efece6'), (x === 2 || x === 13 ? 0.86 : 1) * (0.97 + hash(x, y, 82) * 0.04)),
  quartzTop: (x, y) => shade(rgb('#efece6'), (x === 0 || y === 0 || x === 15 || y === 15 ? 0.88 : 1) * (0.97 + hash(x, y, 83) * 0.04)),
  terracotta: (x, y) => shade(rgb('#b8623a'), (y % 8 === 7 ? 0.78 : 1) * (0.93 + hash(x, Math.floor(y / 8), 84) * 0.1)),
  // A glowing block: pale aqua panes in a frame.
  glowPane: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || y === 7 ? rgb('#9fd8d0') : shade(rgb('#e6fbf6'), 0.94 + hash(x, y, 85) * 0.06)),
  concreteOrange: speckle('#e4782a', 86, 0.05),
  concreteYellow: speckle('#f2c43a', 87, 0.05),
  concreteCyan: speckle('#2aa6b8', 88, 0.05),
  woolBlue: speckle('#3a5fc2', 89, 0.12),
  woolYellow: speckle('#f2cf3c', 90, 0.12),
  // Stone bricks: two courses per face, each brick half the width, joints offset course to course.
  stoneBricks: (x, y) => {
    const course = Math.floor(y / 8);
    const joint = y % 8 === 7 || (x + (course % 2) * 8) % 16 === 15;
    return joint ? rgb('#5e5e62') : shade(rgb('#8c8c90'), 0.9 + hash(x, y, 91) * 0.14);
  },
  // Track seen from above: plank sleepers across, two iron rails along, the rest open.
  rail: (x, y) => {
    if (x === 3 || x === 12) return shade(rgb('#a8a8ae'), 0.9 + hash(x, y, 92) * 0.15);
    if (y % 4 < 2) return shade(rgb('#7a5a36'), 0.9 + hash(x, y, 93) * 0.12);
    return null;
  },
  ironBlock: (x, y) => shade(rgb('#c9c9cf'), (x === 0 || y === 0 ? 1.08 : x === 15 || y === 15 ? 0.8 : 1) * (0.95 + hash(x, y, 94) * 0.05)),
  woolPink: speckle('#ef8fb3', 95, 0.12),
  woolPurple: speckle('#8a4fc2', 96, 0.12),
  woolGreen: speckle('#5aa83a', 97, 0.12),
  asphalt: (x, y) => shade(rgb('#3d3f45'), 0.86 + hash(x, y, 99) * 0.24),
  // Road paint: a white bar down the middle of the block, on asphalt.
  roadLine: (x, y) => (x >= 5 && x <= 10 ? shade(rgb('#f1f1ec'), 0.95 + hash(x, y, 100) * 0.05) : shade(rgb('#3d3f45'), 0.86 + hash(x, y, 101) * 0.24)),
  woolOrange: speckle('#e8823a', 102, 0.12),
  woolCyan: speckle('#2fb8a0', 103, 0.12),
  woolGrey: speckle('#6b6e78', 104, 0.12),
  // A dark screen with a few rows of light text.
  screen: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? rgb('#1d1d22') : y % 3 === 1 && x > 1 && x < 4 + Math.floor(hash(y, 0, 105) * 10) ? rgb('#9be3c0') : rgb('#22303a')),
  // Office windows: two panes of dark glass set in a pale concrete frame.
  facade: (x, y) => (x % 8 < 2 || y < 3 || y > 12 ? shade(rgb('#d4d8de'), 0.94 + hash(x, y, 106) * 0.08) : shade(rgb('#5f7896'), 0.9 + (y > 8 ? 0.12 : 0) + hash(x, y, 107) * 0.06)),
  facadeLit: (x, y) => (x % 8 < 2 || y < 3 || y > 12 ? shade(rgb('#2a2d38'), 0.94 + hash(x, y, 108) * 0.08) : shade(rgb('#ffd79a'), 0.9 + hash(x, y, 109) * 0.12)),
  lantern: (x, y) => (x <= 2 || x >= 13 || y <= 2 || y >= 13 ? rgb('#3b3b42') : shade(rgb('#ffcf6a'), 0.92 + hash(x, y, 98) * 0.12)),
  workbenchTop: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? rgb('#6b4a2a') : x % 5 === 2 || y % 5 === 2 ? rgb('#8d6a3e') : shade(rgb('#c09359'), 0.92 + hash(x, y, 51) * 0.12)),
  workbenchSide: (x, y) => (y < 3 ? shade(rgb('#a77a47'), 0.9) : (x === 3 || x === 12) && y > 5 && y < 13 ? rgb('#7d7d82') : boards('#b88c56', 52)(x, y)),
  furnaceFront: (x, y) => (x > 3 && x < 12 && y > 8 && y < 14 ? (y > 11 ? rgb('#ff9a3c') : rgb('#2b2522')) : stones('#8a8a8e', '#4b4b50', 53)(x, y)),
  furnaceSide: stones('#8a8a8e', '#4b4b50', 54),
  hayTop: (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 2 ? rgb('#a4882e') : shade(rgb('#d8b844'), 0.85 + hash(x, y, 55) * 0.25)),
  haySide: (x, y) => (y === 4 || y === 11 ? rgb('#9b3a2a') : shade(rgb('#d8b844'), 0.8 + hash(x, 0, 56) * 0.2 + hash(x, y, 57) * 0.1)),
  jukeboxTop: (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 3 ? rgb('#24201e') : shade(rgb('#7a4e33'), 0.9 + hash(x, y, 58) * 0.12)),
  jukeboxSide: (x, y) => (x === 0 || x === 15 ? rgb('#4c2f1e') : shade(rgb('#7a4e33'), 0.9 + hash(x, y, 59) * 0.12)),
  woolRed: speckle('#c2352f', 60, 0.12),
  woolWhite: speckle('#eceae4', 61, 0.08),
  pumpkin: (x, y) => (x % 4 === 0 ? rgb('#c46a14') : shade(rgb('#e3861c'), 0.92 + hash(x, y, 62) * 0.12)),
  lamp: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || y === 7 ? rgb('#4a3a2a') : shade(rgb('#ffe2a0'), 0.9 + hash(x, y, 63) * 0.15)),
  // A blocky sun: a stepped disc (no anti-aliasing, so the rim reads as jagged pixels) with a brighter core.
  sunDisc: (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.5) return null;
    return shade(rgb('#fff1a6'), d < 4 ? 1.1 : 0.9 + (7.5 - d) * 0.02);
  },
  // A blocky moon: a paler stepped disc with a few square craters.
  moonDisc: (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.5) return null;
    const craters: ReadonlyArray<readonly [number, number]> = [[5, 5], [10, 6], [7, 10], [4, 11]];
    const crater = craters.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 1.4);
    return shade(rgb('#dfe4f2'), crater ? 0.8 : 0.96 + hash(x, y, 110) * 0.08);
  },
};

export function tilePixels(tile: Tile): Uint8Array {
  return paintTile(PAINTERS[tile]);
}
