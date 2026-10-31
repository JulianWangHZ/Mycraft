/**
 * Block types of the block world and how each one is drawn. Ids are small integers so a whole
 * world fits in one byte array; 0 is always air.
 */

export const TILES = [
  'grassTop',
  'grassSide',
  'dirt',
  'path',
  'farmland',
  'stone',
  'cobble',
  'gravel',
  'sand',
  'sandstoneTop',
  'sandstoneSide',
  'snow',
  'snowSide',
  'oakLog',
  'oakLogTop',
  'oakLeaves',
  'spruceLog',
  'spruceLeaves',
  'planks',
  'cactusSide',
  'cactusTop',
  'clayOrange',
  'clayRed',
  'clayCream',
  'clayBrown',
  'water',
  'tallGrass',
  'poppy',
  'dandelion',
  'deadBush',
  'wheat',
  'coalOre',
  'ironOre',
  'goldOre',
  'mossyCobble',
  'andesite',
  'glass',
  'doorTop',
  'doorBottom',
  'sprucePlanks',
  'palmLog',
  'palmLogTop',
  'palmLeaves',
  'deck',
  'deckDark',
  'poolTile',
  'poolLine',
  'concreteWhite',
  'quartzPillar',
  'quartzTop',
  'terracotta',
  'seaLantern',
  'concreteOrange',
  'concreteYellow',
  'concreteCyan',
  'woolBlue',
  'woolYellow',
  // Faces only used by the village props.
  'craftingTop',
  'craftingSide',
  'furnaceFront',
  'furnaceSide',
  'hayTop',
  'haySide',
  'jukeboxTop',
  'jukeboxSide',
  'woolRed',
  'woolWhite',
  'pumpkin',
  'lamp',
] as const;
export type Tile = (typeof TILES)[number];

/**
 * Opaque cubes are culled against each other; water is see-through; glass is a cut-out cube that
 * hides only other glass; plants are drawn as two crossed quads.
 */
export type BlockShape = 'cube' | 'water' | 'glass' | 'plant';

export interface BlockKind {
  shape: BlockShape;
  top: Tile;
  side: Tile;
  bottom: Tile;
}

const cube = (top: Tile, side: Tile = top, bottom: Tile = top): BlockKind => ({ shape: 'cube', top, side, bottom });
const plant = (tile: Tile): BlockKind => ({ shape: 'plant', top: tile, side: tile, bottom: tile });

export const BLOCKS = {
  air: 0,
  grass: 1,
  dirt: 2,
  path: 3,
  farmland: 4,
  stone: 5,
  cobble: 6,
  gravel: 7,
  sand: 8,
  sandstone: 9,
  snow: 10,
  oakLog: 11,
  oakLeaves: 12,
  spruceLog: 13,
  spruceLeaves: 14,
  planks: 15,
  cactus: 16,
  clayOrange: 17,
  clayRed: 18,
  clayCream: 19,
  clayBrown: 20,
  water: 21,
  tallGrass: 22,
  poppy: 23,
  dandelion: 24,
  deadBush: 25,
  wheat: 26,
  coalOre: 27,
  ironOre: 28,
  goldOre: 29,
  mossyCobble: 30,
  andesite: 31,
  glass: 32,
  doorLower: 33,
  doorUpper: 34,
  sprucePlanks: 35,
  palmLog: 36,
  palmLeaves: 37,
  deck: 38,
  deckDark: 39,
  poolTile: 40,
  poolLine: 41,
  concreteWhite: 42,
  quartzPillar: 43,
  terracotta: 44,
  seaLantern: 45,
} as const;
export type BlockName = keyof typeof BLOCKS;
export type BlockId = (typeof BLOCKS)[BlockName];

/** Indexed by block id. Air has no entry. */
export const KINDS: Readonly<Record<Exclude<BlockId, 0>, BlockKind>> = {
  [BLOCKS.grass]: cube('grassTop', 'grassSide', 'dirt'),
  [BLOCKS.dirt]: cube('dirt'),
  [BLOCKS.path]: cube('path', 'dirt'),
  [BLOCKS.farmland]: cube('farmland', 'dirt'),
  [BLOCKS.stone]: cube('stone'),
  [BLOCKS.cobble]: cube('cobble'),
  [BLOCKS.gravel]: cube('gravel'),
  [BLOCKS.sand]: cube('sand'),
  [BLOCKS.sandstone]: cube('sandstoneTop', 'sandstoneSide', 'sandstoneTop'),
  [BLOCKS.snow]: cube('snow', 'snowSide', 'dirt'),
  [BLOCKS.oakLog]: cube('oakLogTop', 'oakLog'),
  [BLOCKS.oakLeaves]: cube('oakLeaves'),
  [BLOCKS.spruceLog]: cube('oakLogTop', 'spruceLog'),
  [BLOCKS.spruceLeaves]: cube('spruceLeaves'),
  [BLOCKS.planks]: cube('planks'),
  [BLOCKS.cactus]: cube('cactusTop', 'cactusSide'),
  [BLOCKS.clayOrange]: cube('clayOrange'),
  [BLOCKS.clayRed]: cube('clayRed'),
  [BLOCKS.clayCream]: cube('clayCream'),
  [BLOCKS.clayBrown]: cube('clayBrown'),
  [BLOCKS.water]: { shape: 'water', top: 'water', side: 'water', bottom: 'water' },
  [BLOCKS.tallGrass]: plant('tallGrass'),
  [BLOCKS.poppy]: plant('poppy'),
  [BLOCKS.dandelion]: plant('dandelion'),
  [BLOCKS.deadBush]: plant('deadBush'),
  [BLOCKS.wheat]: plant('wheat'),
  [BLOCKS.coalOre]: cube('coalOre'),
  [BLOCKS.ironOre]: cube('ironOre'),
  [BLOCKS.goldOre]: cube('goldOre'),
  [BLOCKS.mossyCobble]: cube('mossyCobble'),
  [BLOCKS.andesite]: cube('andesite'),
  [BLOCKS.glass]: { shape: 'glass', top: 'glass', side: 'glass', bottom: 'glass' },
  [BLOCKS.doorLower]: cube('planks', 'doorBottom'),
  [BLOCKS.doorUpper]: cube('planks', 'doorTop'),
  [BLOCKS.sprucePlanks]: cube('sprucePlanks'),
  [BLOCKS.palmLog]: cube('palmLogTop', 'palmLog'),
  [BLOCKS.palmLeaves]: cube('palmLeaves'),
  [BLOCKS.deck]: cube('deck'),
  [BLOCKS.deckDark]: cube('deckDark'),
  [BLOCKS.poolTile]: cube('poolTile'),
  [BLOCKS.poolLine]: cube('poolLine'),
  [BLOCKS.concreteWhite]: cube('concreteWhite'),
  [BLOCKS.quartzPillar]: cube('quartzTop', 'quartzPillar'),
  [BLOCKS.terracotta]: cube('terracotta'),
  [BLOCKS.seaLantern]: cube('seaLantern'),
};

export function kindOf(id: number): BlockKind | null {
  return id === 0 ? null : (KINDS[id as Exclude<BlockId, 0>] ?? null);
}

/** Whether a block hides the face of the block next to it. */
export function isOpaque(id: number): boolean {
  return kindOf(id)?.shape === 'cube';
}
