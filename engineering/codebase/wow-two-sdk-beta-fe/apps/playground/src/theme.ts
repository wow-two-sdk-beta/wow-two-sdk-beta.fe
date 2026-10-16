import { ref, watch } from 'vue';
import { ThemeCatalog, getTheme, themeToCss } from '@wow-two-beta/ui-vue/foundation/themes';

/** The pilot theme is also the gallery default; lifecycle status comes from the catalog. */
export const DEFAULT_THEME = 'smart-qr';
const STYLE_ID = 'wow-two-themes';
export const themes = ThemeCatalog;
const ids = new Set(themes.map((theme) => theme.id));

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage can be unavailable in embedded previews. */
  }
}

const storedTheme = readPreference('pg:theme');
export const themeId = ref(storedTheme !== null && ids.has(storedTheme) ? storedTheme : DEFAULT_THEME);
export const isDark = ref(readPreference('pg:dark') === 'true');

/** Generates only the selected theme; the root class also reaches portalled overlays. */
export function installThemesCss(): () => void {
  const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
  style.id = STYLE_ID;
  if (!style.isConnected) document.head.append(style);
  const stopTheme = watch(
    themeId,
    (id) => {
      if (!ids.has(id)) {
        themeId.value = DEFAULT_THEME;
        return;
      }
      const theme = getTheme(id);
      if (!theme) return;
      style.textContent = themeToCss(theme);
      const root = document.documentElement;
      for (const value of [...root.classList]) {
        if (value.startsWith('theme-')) root.classList.remove(value);
      }
      root.classList.add(`theme-${id}`);
      savePreference('pg:theme', id);
    },
    { immediate: true, flush: 'sync' },
  );
  const stopDark = watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      savePreference('pg:dark', String(dark));
    },
    { immediate: true, flush: 'sync' },
  );
  return () => {
    stopTheme();
    stopDark();
    style.remove();
  };
}
