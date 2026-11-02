import type { AgentKind, StateGroup } from '@mycraft/core';
import type { Pose } from '../island/behavior.js';
import type { RideId } from './rides.js';

export type Vec3 = [number, number, number];

/** Activity spots every scene must provide. Each scene dresses them differently. */
export const ACTIVITIES = ['coffee', 'kitchen', 'ktv', 'gym', 'massage', 'ballpit', 'pingpong', 'sofa', 'nap'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export interface Spot {
  position: Vec3;
  /** Rotation around Y. Characters face +Z at rotation 0. */
  facing: number;
  /** The character sits here (chair, stool, sofa) rather than standing. */
  seated?: boolean;
  /** Sits astride, legs either side, as on a carousel horse. */
  astride?: boolean;
  /** Swims laps along z between these two points, turning at each end. */
  lap?: { from: number; to: number; seconds: number };
  /**
   * The character rides a moving seat. `position` is then where it boards; once there it follows
   * the seat, whose pose comes from the ride's own timing.
   */
  ride?: { id: RideId; seat: number; centre: Vec3; board: number };
}

export type Headwear = 'none' | 'cap' | 'swimcap' | 'mascot';
export type Extra = 'none' | 'apron' | 'balloon' | 'clownNose' | 'floatRing' | 'whistle' | 'tie';

/** How a character is dressed for one state group in one scene. */
export interface Outfit {
  /** Body colour; null keeps the agent's brand colour. */
  body: string | null;
  headwear: Headwear;
  headwearColor: string;
  extra: Extra;
}

export const SCENE_IDS = ['village', 'park', 'pool', 'office'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export interface SceneDefinition {
  id: SceneId;
  /**
   * Workstation for an agent. `index` counts every main agent; `agentIndex` counts only agents of the same kind,
   * for scenes that seat each kind in its own room. Must give a distinct spot per (agent, agentIndex).
   */
  seatAt(index: number, agent: AgentKind, agentIndex: number): Spot;
  activities: Readonly<Record<Activity, Vec3>>;
  /** How far from an activity's centre people stand. Large props such as tables need more room. */
  activityRadius?: Readonly<Partial<Record<Activity, number>>>;
  /** Scenes can dress an activity differently, e.g. the office plays arcade games where others work out. */
  activityPose?: Readonly<Partial<Record<Activity, Pose>>>;
  /**
   * Activities that are rides: the first `seats` people ride, boarding within `board` of the
   * activity spot; anyone after them waits around it. `centre` is the ride's own centre.
   */
  rides?: Readonly<Partial<Record<Activity, { id: RideId; seats: number; board: number; centre: Vec3 }>>>;
  /** Fixed seats for furniture people sit on in a row, such as a sofa. Extra people stand around it. */
  activitySeats?: Readonly<Partial<Record<Activity, readonly Spot[]>>>;
  /** Long-idle agents doze off; outdoor scenes keep them going round the attractions instead. */
  naps?: boolean;
  /** What working agents do at their spot instead of desk work, e.g. swim laps. */
  workPose?: Pose;
  outfits: Readonly<Record<StateGroup, Outfit>>;
  /** Characters are scaled up indoors so they read clearly behind desks and monitors. */
  characterScale: number;
  /** Show a name tag over every agent, not only the ones that need attention. */
  nameTags: boolean;
  /** Characters drawn as blocks with pixel faces, instead of the rounded figure. */
  figure?: 'blocky';
  /**
   * Height of the terrain under a point. Scenes with hills set it so the camera always keeps a
   * clear line of sight over them and never sinks into the ground.
   */
  terrainAt?(x: number, z: number): number;
  /** Fog start and end distance, for scenes whose ground runs out at the horizon. */
  fog?: readonly [number, number];
  /** How far the camera may pull back from its target. */
  maxDistance?: number;
  cameraTarget: Vec3;
  cameraOffset: Vec3;
  /** Camera offset from an agent when it is selected. */
  closeOffset: Vec3;
}
