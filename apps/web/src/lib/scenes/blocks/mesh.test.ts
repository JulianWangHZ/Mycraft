import { describe, expect, it } from 'vitest';
import { BLOCKS, TILES, type BlockId } from './blocks.js';
import { BLOCK } from './layout.js';
import { buildMeshes, OCCLUSION, WATER_DROP } from './mesh.js';
import type { World } from './world.js';

/** A tiny world, 4 blocks each way, with the given blocks placed by [i, level, k]. */
function tiny(blocks: ReadonlyArray<[number, number, number, BlockId]>): World {
  const size = 4;
  const world: World = {
    width: size,
    depth: size,
    bottom: 0,
    top: size,
    blocks: new Uint8Array(size * size * size),
    surface: new Int16Array(size * size),
    biome: [],
    tint: new Float32Array(size * size * 3).fill(1),
  };
  for (const [i, level, k, id] of blocks) world.blocks[(level * size + k) * size + i] = id;
  return world;
}

const quads = (indices: Uint32Array) => indices.length / 6;

describe('buildMeshes', () => {
  it('leaves out the cut faces round the edge of the world', () => {
    const { solid } = buildMeshes(tiny([[0, 1, 0, BLOCKS.stone]]));
    expect(quads(solid.indices)).toBe(4);
  });

  it('tints grass by its column but leaves stone alone', () => {
    const world = tiny([[1, 1, 1, BLOCKS.grass]]);
    world.tint.set([0.5, 0.75, 1], (1 * 4 + 1) * 3);
    const { solid } = buildMeshes(world);
    const top = solid.groups.find((g) => TILES[g.material] === 'grassTop');
    const vertex = solid.indices[top?.start ?? 0] as number;
    expect(Array.from(solid.colors.slice(vertex * 3, vertex * 3 + 3))).toEqual([0.5, 0.75, 1]);
  });

  it('draws glass as a cut-out, hiding only the glass next to it', () => {
    const { plants, solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.glass], [2, 1, 1, BLOCKS.glass], [1, 1, 2, BLOCKS.stone]]));
    expect(quads(plants.indices)).toBe(9);
    expect(quads(solid.indices)).toBe(6);
  });

  it('draws all six faces of a lone block', () => {
    const { solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.stone]]));
    expect(quads(solid.indices)).toBe(6);
    expect(solid.groups).toEqual([{ start: 0, count: 36, material: TILES.indexOf('stone') }]);
  });

  it('hides the faces two blocks share', () => {
    const { solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.stone], [2, 1, 1, BLOCKS.stone]]));
    expect(quads(solid.indices)).toBe(10);
  });

  it('skips the underside of the bottom layer', () => {
    const { solid } = buildMeshes(tiny([[1, 0, 1, BLOCKS.stone]]));
    expect(quads(solid.indices)).toBe(5);
  });

  it('gives grass a grass top, grass sides and a dirt bottom', () => {
    const { solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.grass]]));
    const counts = Object.fromEntries(solid.groups.map((g) => [TILES[g.material], g.count / 6]));
    expect(counts).toEqual({ grassTop: 1, grassSide: 4, dirt: 1 });
  });

  it('places a block one unit of BLOCK wide, its top at level times BLOCK', () => {
    const { solid } = buildMeshes(tiny([[0, 2, 0, BLOCKS.stone]]));
    const ys = Array.from(solid.positions).filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo(2 * BLOCK);
    expect(Math.min(...ys)).toBeCloseTo(BLOCK);
  });

  it('darkens corners tucked against neighbouring blocks', () => {
    const open = buildMeshes(tiny([[1, 1, 1, BLOCKS.stone]])).solid;
    expect(new Set(open.colors)).toEqual(new Set([OCCLUSION[0]]));
    const tucked = buildMeshes(tiny([[1, 1, 1, BLOCKS.stone], [2, 2, 1, BLOCKS.stone], [1, 2, 2, BLOCKS.stone]])).solid;
    expect(Math.min(...tucked.colors)).toBeCloseTo(OCCLUSION[3]);
  });

  it('draws water apart from land, its surface a little low, and not between water blocks', () => {
    const { water, solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.water], [2, 1, 1, BLOCKS.water]]));
    expect(quads(solid.indices)).toBe(0);
    expect(quads(water.indices)).toBe(10);
    const ys = Array.from(water.positions).filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo((2 - WATER_DROP) * BLOCK - BLOCK);
  });

  it('draws plants as two crossed quads that hide nothing', () => {
    const { plants, solid } = buildMeshes(tiny([[1, 1, 1, BLOCKS.poppy], [1, 0, 1, BLOCKS.stone]]));
    expect(quads(plants.indices)).toBe(2);
    expect(quads(solid.indices)).toBe(5);
  });
});
