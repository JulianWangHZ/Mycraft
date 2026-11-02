import { describe, expect, it } from 'vitest';
import { readSavedScene, SCENE_STORAGE_KEY, useIslandStore } from './island-store.js';

const storage = (value: string | null) => ({ getItem: (key: string) => (key === SCENE_STORAGE_KEY ? value : null) });

describe('readSavedScene', () => {
  it('returns a saved scene', () => {
    expect(readSavedScene(storage('pool'))).toBe('pool');
  });

  it.each([null, 'moon'])('falls back to the village for %s', (value) => {
    expect(readSavedScene(storage(value))).toBe('village');
  });
});

describe('useIslandStore', () => {
  it('switches scene, selects and hovers agents', () => {
    const store = useIslandStore.getState();
    store.setScene('park');
    store.select('s1');
    store.hover('s2');
    expect(useIslandStore.getState()).toMatchObject({ scene: 'park', selectedSession: 's1', hoveredSession: 's2' });
    store.select(null);
    expect(useIslandStore.getState().selectedSession).toBeNull();
  });

  it('returns to the overview, closing any pinned card', () => {
    const store = useIslandStore.getState();
    store.select('s1');
    store.setCameraMoved(true);
    const before = useIslandStore.getState().overviewRequest;
    store.resetView();
    expect(useIslandStore.getState()).toMatchObject({ selectedSession: null, cameraMoved: false, overviewRequest: before + 1 });
  });

  it('forgets a moved camera when the scene changes', () => {
    useIslandStore.getState().setCameraMoved(true);
    useIslandStore.getState().setScene('pool');
    expect(useIslandStore.getState().cameraMoved).toBe(false);
  });
});
