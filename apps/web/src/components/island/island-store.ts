import { create } from 'zustand';
import { SCENE_IDS, type SceneId } from '../../lib/scenes/types.js';

export const SCENE_STORAGE_KEY = 'mycraft.scene';

export function readSavedScene(storage: Pick<Storage, 'getItem'>): SceneId {
  const saved = storage.getItem(SCENE_STORAGE_KEY);
  return (SCENE_IDS as readonly string[]).includes(saved ?? '') ? (saved as SceneId) : 'village';
}

interface IslandStore {
  scene: SceneId;
  selectedSession: string | null;
  hoveredSession: string | null;
  /** Screen point the session card is placed next to: the pointer while hovering, the click once pinned. */
  tipAt: { x: number; y: number } | null;
  /** The user has rotated or zoomed away from the overview. */
  cameraMoved: boolean;
  /** Bumped to ask the camera to glide back to the overview. */
  overviewRequest: number;
  setScene(scene: SceneId): void;
  setCameraMoved(moved: boolean): void;
  /** Back to the starting view: the camera returns to the overview and any pinned card closes. */
  resetView(): void;
  select(sessionId: string | null, at?: { x: number; y: number }): void;
  hover(sessionId: string | null, at?: { x: number; y: number }): void;
}

export const useIslandStore = create<IslandStore>()((set) => ({
  scene: 'village',
  selectedSession: null,
  hoveredSession: null,
  tipAt: null,
  cameraMoved: false,
  overviewRequest: 0,
  setScene: (scene) => set({ scene, cameraMoved: false }),
  setCameraMoved: (cameraMoved) => set({ cameraMoved }),
  resetView: () => set((state) => ({ selectedSession: null, cameraMoved: false, overviewRequest: state.overviewRequest + 1 })),
  select: (sessionId, at) => set((state) => ({ selectedSession: sessionId, tipAt: at ?? state.tipAt })),
  // While a card is pinned, hovering others does not move it.
  hover: (sessionId, at) => set((state) => ({ hoveredSession: sessionId, tipAt: state.selectedSession || !at ? state.tipAt : at })),
}));
