import { BUILDING } from './office.js';

/**
 * Heights of the street surfaces. The office's ground floor sits at 0, raised above the pavement so
 * the slab edge, its light strip and the 1F tag all stay clear of it.
 */
export const LEVEL = { road: -0.56, walk: -0.42, base: -0.62 } as const;

/** Bands running left to right in front of the office: near pavement, the road, far pavement. */
export const STREET = {
  length: 180,
  nearWalk: { z1: BUILDING.front, z2: 4.8 },
  road: { z1: 4.8, z2: 11.6 },
  farWalk: { z1: 11.6, z2: 14.6 },
} as const;

/** Zebra crossing at the office door. Lane lines stop short of it on both sides. */
export const CROSSING = { x: 0, width: 3.2, gap: 0.5 } as const;

export interface Run {
  /** Centre of the painted run along the street. */
  x: number;
  length: number;
}

/** A lane line along the whole street, broken where it meets the zebra crossing. */
export function lineRuns(length = STREET.length): Run[] {
  const half = length / 2;
  const left = CROSSING.x - CROSSING.width / 2 - CROSSING.gap;
  const right = CROSSING.x + CROSSING.width / 2 + CROSSING.gap;
  return [
    { x: (-half + left) / 2, length: left + half },
    { x: (right + half) / 2, length: half - right },
  ];
}

/** One lane each way; cars on the near lane drive to the right. */
export const LANES = [
  { z: 6.5, direction: 1 },
  { z: 9.9, direction: -1 },
] as const;

/** Parking lot to the right of the office, open onto the road. */
export const LOT = { x1: 11.4, x2: 25.2, z1: -5.6, z2: STREET.road.z1, bayWidth: 2.72, bayDepth: 5.4 } as const;

export type CarModel = 'y' | 'x' | '3';

export interface Bay {
  /** Centre of the bay across the lot. */
  x: number;
  /** Centre of the parked car, which has backed in so its charge port faces the charger. */
  carZ: number;
  model: CarModel;
  color: string;
  charging: boolean;
}

const PARKED: ReadonlyArray<Pick<Bay, 'model' | 'color' | 'charging'>> = [
  { model: 'y', color: '#f2f3f5', charging: true },
  { model: 'x', color: '#1d1f24', charging: false },
  { model: 'y', color: '#b3202c', charging: true },
  { model: 'x', color: '#c7ccd3', charging: true },
  { model: 'y', color: '#2b4f8e', charging: false },
];

/** Bays along the back of the lot, each with a charger behind it. */
export function parkingBays(): Bay[] {
  const count = Math.floor((LOT.x2 - LOT.x1) / LOT.bayWidth);
  return Array.from({ length: count }, (_, index) => ({
    x: LOT.x1 + LOT.bayWidth * (index + 0.5),
    carZ: LOT.z1 + LOT.bayDepth / 2 + 0.4,
    ...(PARKED[index % PARKED.length] as (typeof PARKED)[number]),
  }));
}

export interface TrafficCar {
  lane: 0 | 1;
  /** Where along the street the car starts, as a share of the street length. */
  phase: number;
  /** Units per second. */
  speed: number;
  model: CarModel;
  color: string;
}

export const TRAFFIC: readonly TrafficCar[] = [
  { lane: 0, phase: 0.05, speed: 6.5, model: '3', color: '#e8e9ec' },
  { lane: 0, phase: 0.42, speed: 6.5, model: 'y', color: '#1d1f24' },
  { lane: 0, phase: 0.74, speed: 6.5, model: '3', color: '#b3202c' },
  { lane: 1, phase: 0.18, speed: 5.4, model: 'x', color: '#c7ccd3' },
  { lane: 1, phase: 0.55, speed: 5.4, model: '3', color: '#2b4f8e' },
  { lane: 1, phase: 0.86, speed: 5.4, model: 'y', color: '#f2f3f5' },
];

/** Position of a car along the street at a given time, wrapping round at either end. */
export function trafficX(car: TrafficCar, seconds: number, length: number = STREET.length): number {
  const direction = LANES[car.lane].direction;
  const travelled = car.phase * length + car.speed * seconds;
  const along = ((travelled % length) + length) % length;
  return direction * (along - length / 2);
}

/** Whether x is past the office front, so a tall prop there never blocks the view into the rooms. */
function clearOfOffice(x: number, margin: number): boolean {
  return x < BUILDING.left - margin || x > BUILDING.right + margin;
}

/** Whether a spot on the near pavement is clear of both the office front and the lot entrance. */
function clearOfFront(x: number, margin: number): boolean {
  return clearOfOffice(x, margin) && (x < LOT.x1 - margin || x > LOT.x2 + margin);
}

/** Spots spaced along the street that pass the given test. */
function along(step: number, offset: number, keep: (x: number) => boolean): number[] {
  const half = STREET.length / 2 - 10;
  const count = Math.floor((2 * half) / step) + 1;
  return Array.from({ length: count }, (_, i) => -half + offset + i * step).filter(keep);
}

/**
 * Street trees. The camera looks across the street at the office, so neither side gets a tall tree
 * in front of the rooms; the near side also leaves the lot entrance open.
 */
export function treeSpots(): Array<[number, number]> {
  const near = along(7, 0, (x) => clearOfFront(x, 1.6)).map((x): [number, number] => [x, 3.8]);
  const far = along(7, 3.5, (x) => clearOfOffice(x, 4)).map((x): [number, number] => [x, 13.2]);
  return [...near, ...far];
}

export interface LampSpot {
  x: number;
  z: number;
  /** The arm reaches out over the road, so it points +z on the near side and -z on the far side. */
  facing: 1 | -1;
}

export function lampSpots(): LampSpot[] {
  const near = along(14, 3.5, (x) => clearOfFront(x, 1)).map((x): LampSpot => ({ x, z: 4.45, facing: 1 }));
  const far = along(14, 10.5, (x) => clearOfOffice(x, 4)).map((x): LampSpot => ({ x, z: 11.95, facing: -1 }));
  return [...near, ...far];
}
