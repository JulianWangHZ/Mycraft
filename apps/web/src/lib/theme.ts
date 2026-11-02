/** One switch for both the interface (light / dark) and the 3D scenes (day / night). */
export type Theme = 'day' | 'night';

export const THEME_KEY = 'mycraft.theme';

export function loadTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): Theme {
  const saved = storage.getItem(THEME_KEY);
  if (saved === 'day' || saved === 'night') return saved;
  return prefersDark ? 'night' : 'day';
}

export function saveTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  storage.setItem(THEME_KEY, theme);
}
