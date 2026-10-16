import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import {
  ThemeCatalog,
  generateTheme,
  getTheme,
  themeToCss,
  type Theme,
  type ThemeSeed,
} from '@wow-two-beta/ui-vue/foundation/themes';
import { GeneratedThemeId, seedFromQuery, seedToQuery } from './content/seedQuery';

/** The atlas opens on the house theme; any catalog theme can be applied from the top bar or the themes page. */
export const DEFAULT_THEME = 'wow';
const STYLE_ID = 'atlas-theme';
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

/* The studio's applied seed persists as its own query string, so reading it back runs the same validation a
   shared studio link does. */
const storedSeed = readPreference('atlas:seed');

/** The studio seed applied atlas-wide, or `null` until the studio applies one. */
export const generatedSeed = shallowRef<ThemeSeed | null>(
  storedSeed === null ? null : seedFromQuery(new URLSearchParams(storedSeed)),
);

function isKnown(id: string): boolean {
  return ids.has(id) || (id === GeneratedThemeId && generatedSeed.value !== null);
}

const storedTheme = readPreference('atlas:theme');
export const themeId = shallowRef(storedTheme !== null && isKnown(storedTheme) ? storedTheme : DEFAULT_THEME);
export const isDark = shallowRef(readPreference('atlas:dark') === 'true');

/** Applies a studio seed to the whole atlas and remembers it across reloads. */
export function applyGeneratedSeed(seed: ThemeSeed): void {
  generatedSeed.value = { ...seed, id: GeneratedThemeId };
  savePreference('atlas:seed', new URLSearchParams(seedToQuery(seed)).toString());
  themeId.value = GeneratedThemeId;
}

/** The theme a catalog id or the generated id resolves to. */
export function resolveTheme(id: string): Theme | undefined {
  if (id === GeneratedThemeId) return generatedSeed.value ? generateTheme(generatedSeed.value) : undefined;
  return ids.has(id) ? getTheme(id) : undefined;
}

/** Emits only the selected theme's CSS and keeps the root classes in step; returns a disposer. */
export function installTheme(): () => void {
  const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
  style.id = STYLE_ID;
  if (!style.isConnected) document.head.append(style);
  const stopTheme = watch(
    [themeId, generatedSeed],
    ([id]) => {
      const theme = resolveTheme(id);
      if (!theme) {
        themeId.value = DEFAULT_THEME;
        return;
      }
      style.textContent = themeToCss(theme);
      const root = document.documentElement;
      for (const value of [...root.classList]) {
        if (value.startsWith('theme-')) root.classList.remove(value);
      }
      root.classList.add(`theme-${id}`);
      savePreference('atlas:theme', id);
    },
    { immediate: true, flush: 'sync' },
  );
  const stopDark = watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      savePreference('atlas:dark', String(dark));
    },
    { immediate: true, flush: 'sync' },
  );
  /* A device-preview iframe shares this origin's storage: another document changing the theme lands here as a
     `storage` event, so the frame follows the atlas without a message channel. */
  function onStorage(event: StorageEvent): void {
    if (event.key === 'atlas:seed') {
      generatedSeed.value = event.newValue === null ? null : seedFromQuery(new URLSearchParams(event.newValue));
    } else if (event.key === 'atlas:theme' && event.newValue !== null && isKnown(event.newValue)) {
      themeId.value = event.newValue;
    } else if (event.key === 'atlas:dark') {
      isDark.value = event.newValue === 'true';
    }
  }
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
    stopTheme();
    stopDark();
    style.remove();
  };
}

/** The preview class a scoped token set resolves under, per mode. */
export function previewClass(id: string, dark: boolean): string {
  return `theme-${id}-preview-${dark ? 'dark' : 'light'}`;
}

/**
 * Keeps a `<style>` with a theme's two PREVIEW blocks mounted for the calling component's lifetime.
 *
 * A plain `.theme-{id}` block cannot preview light mode inside a dark atlas: the emitter's `.dark .theme-{id}`
 * selector matches any `.dark` ancestor. Each preview class therefore carries one mode's tokens in both blocks.
 */
export function useThemePreviewCss(theme: Readonly<Ref<Theme | undefined>>): void {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.dataset.atlasPreview = '';
  document.head.append(style);
  const stop = watch(
    theme,
    (value) => {
      if (!value) {
        style.textContent = '';
        return;
      }
      const light = { ...value, id: `${value.id}-preview-light`, dark: value.light };
      const dark = { ...value, id: `${value.id}-preview-dark`, light: value.dark };
      style.textContent = `${themeToCss(light)}\n\n${themeToCss(dark)}`;
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    stop();
    style.remove();
  });
}
