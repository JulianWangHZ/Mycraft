export const LANGUAGES = ['en', 'zh-TW'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'mycraft.language';

export function pickLanguage(saved: string | null, browser: string): Language {
  if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  return browser.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en';
}
