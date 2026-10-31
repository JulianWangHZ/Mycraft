import { isOpaque, kindOf, TILES, type Tile } from './blocks.js';
import { BLOCK } from './layout.js';
import { blockAt, type World } from './world.js';

type V3 = readonly [number, number, number];

interface Face {
  normal: V3;
  /** Corners in the unit cube, bottom-left, bottom-right, top-right, top-left seen from outside. */
  corners: readonly [V3, V3, V3, V3];
  side: 'top' | 'side' | 'bottom';
}

const FACES: readonly Face[] = [
  { normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], side: 'side' },
  { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], side: 'side' },
  { normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], side: 'side' },
  { normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], side: 'side' },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], side: 'top' },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], side: 'bottom' },
];
const UVS = [0, 0, 1, 0, 1, 1, 0, 1];

/** Corner shading by how many of the three blocks round a corner are solid: none, one, two, all three. */
export const OCCLUSION = [1, 0.84, 0.68, 0.52] as const;
/** Water sits a little below the top of its block, so shores show a lip. */
export const WATER_DROP = 0.12;

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  /** One draw group per tile, in `TILES` order; `material` indexes `TILES`. */
  groups: ReadonlyArray<{ start: number; count: number; material: number }>;
}

class Builder {
  private readonly parts = TILES.map(() => ({ positions: [] as number[], normals: [] as number[], uvs: [] as number[], colors: [] as number[], indices: [] as number[] }));

  quad(tile: Tile, corners: readonly V3[], normal: V3, shade: readonly number[], flip = false, tint: V3 = WHITE) {
    const part = this.parts[TILES.indexOf(tile)] as (typeof this.parts)[number];
    const base = part.positions.length / 3;
    corners.forEach(([x, y, z], c) => {
      part.positions.push(x, y, z);
      part.normals.push(...normal);
      part.uvs.push(UVS[c * 2] as number, UVS[c * 2 + 1] as number);
      const s = shade[c] as number;
      part.colors.push(s * tint[0], s * tint[1], s * tint[2]);
    });
    // Split the quad along the diagonal that keeps corner shading smooth.
    if (flip) part.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): MeshData {
    const vertices = this.parts.reduce((n, p) => n + p.positions.length / 3, 0);
    const positions = new Float32Array(vertices * 3);
    const normals = new Float32Array(vertices * 3);
    const uvs = new Float32Array(vertices * 2);
    const colors = new Float32Array(vertices * 3);
    const indices = new Uint32Array(this.parts.reduce((n, p) => n + p.indices.length, 0));
    const groups: Array<{ start: number; count: number; material: number }> = [];
    let vertex = 0;
    let index = 0;
    this.parts.forEach((part, material) => {
      if (part.indices.length === 0) return;
      positions.set(part.positions, vertex * 3);
      normals.set(part.normals, vertex * 3);
      uvs.set(part.uvs, vertex * 2);
      colors.set(part.colors, vertex * 3);
      for (let i = 0; i < part.indices.length; i += 1) indices[index + i] = (part.indices[i] as number) + vertex;
      groups.push({ start: index, count: part.indices.length, material });
      vertex += part.positions.length / 3;
      index += part.indices.length;
    });
    return { positions, normals, uvs, colors, indices, groups };
  }
}

/** The two axes a face spans, as unit vectors. */
function tangents([nx, ny]: V3): [V3, V3] {
  if (nx !== 0) return [[0, 1, 0], [0, 0, 1]];
  if (ny !== 0) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
}

function occlusion(world: World, i: number, level: number, k: number, face: Face): number[] {
  const [u, v] = tangents(face.normal);
  const [nx, ny, nz] = face.normal;
  const solid = (du: number, dv: number) =>
    isOpaque(blockAt(world, i + nx + u[0] * du + v[0] * dv, level + ny + u[1] * du + v[1] * dv, k + nz + u[2] * du + v[2] * dv)) ? 1 : 0;
  return face.corners.map((corner) => {
    const du = (u[0] * corner[0] + u[1] * corner[1] + u[2] * corner[2]) * 2 - 1;
    const dv = (v[0] * corner[0] + v[1] * corner[1] + v[2] * corner[2]) * 2 - 1;
    const a = solid(du, 0);
    const b = solid(0, dv);
    return OCCLUSION[a && b ? 3 : a + b + solid(du, dv)] as number;
  });
}

function place(world: World, i: number, level: number, k: number, [x, y, z]: V3, height = 1): V3 {
  return [(i - world.width / 2 + x) * BLOCK, (level - 1 + y * height) * BLOCK, (k - world.depth / 2 + z) * BLOCK];
}

const NO_SHADE = [1, 1, 1, 1];
const WHITE: V3 = [1, 1, 1];
/** Tiles coloured by the biome they grow in. */
const TINTED: ReadonlySet<Tile> = new Set(['grassTop', 'tallGrass', 'oakLeaves', 'palmLeaves']);

function tintAt(world: World, i: number, k: number, tile: Tile): V3 {
  if (!TINTED.has(tile)) return WHITE;
  const column = (k * world.width + i) * 3;
  return [world.tint[column] as number, world.tint[column + 1] as number, world.tint[column + 2] as number];
}

/** Two quads crossed through the middle of the block, for grass, flowers and crops. */
function plant(builder: Builder, world: World, i: number, level: number, k: number, tile: Tile) {
  const inset = 0.15;
  const crossings: Array<[V3, V3, V3]> = [
    [[inset, 0, inset], [1 - inset, 0, 1 - inset], [0.7071, 0, -0.7071]],
    [[1 - inset, 0, inset], [inset, 0, 1 - inset], [0.7071, 0, 0.7071]],
  ];
  for (const [a, b, normal] of crossings) {
    const corners = [a, b, [b[0], 1 - inset, b[2]] as V3, [a[0], 1 - inset, a[2]] as V3].map((c) => place(world, i, level, k, c));
    builder.quad(tile, corners, normal, NO_SHADE, false, tintAt(world, i, k, tile));
  }
}

export interface WorldMeshes {
  solid: MeshData;
  water: MeshData;
  /** Cut-out blocks: crossed plant sprites and glass panes. */
  plants: MeshData;
}

/** Turn a world into drawable surfaces: only faces that touch open space are kept. */
export function buildMeshes(world: World): WorldMeshes {
  const solid = new Builder();
  const water = new Builder();
  const plants = new Builder();
  for (let level = world.bottom; level < world.top; level += 1) {
    for (let k = 0; k < world.depth; k += 1) {
      for (let i = 0; i < world.width; i += 1) {
        const id = blockAt(world, i, level, k);
        const kind = kindOf(id);
        if (!kind) continue;
        if (kind.shape === 'plant') {
          plant(plants, world, i, level, k, kind.top);
          continue;
        }
        const wet = kind.shape === 'water';
        const glass = kind.shape === 'glass';
        for (const face of FACES) {
          const [nx, ny, nz] = face.normal;
          const next = blockAt(world, i + nx, level + ny, k + nz);
          if (isOpaque(next) || ((wet || glass) && next === id)) continue;
          // Nobody looks at the underside of the world, nor at the cut faces round its edge.
          if (face.side === 'bottom' && level === world.bottom) continue;
          if (i + nx < 0 || k + nz < 0 || i + nx >= world.width || k + nz >= world.depth) continue;
          const tile = face.side === 'top' ? kind.top : face.side === 'side' ? kind.side : kind.bottom;
          const height = wet && blockAt(world, i, level + 1, k) !== id ? 1 - WATER_DROP : 1;
          const corners = face.corners.map((c) => place(world, i, level, k, c, height));
          if (wet || glass) {
            (wet ? water : plants).quad(tile, corners, face.normal, NO_SHADE);
            continue;
          }
          const shade = occlusion(world, i, level, k, face);
          const flip = (shade[0] as number) + (shade[2] as number) < (shade[1] as number) + (shade[3] as number);
          solid.quad(tile, corners, face.normal, shade, flip, tintAt(world, i, k, tile));
        }
      }
    }
  }
  return { solid: solid.build(), water: water.build(), plants: plants.build() };
}
