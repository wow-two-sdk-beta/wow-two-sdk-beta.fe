import type { ColorMode } from './ColorModeContext';

/** The `localStorage` key `ColorModeProvider` persists to by default. */
export const ColorModeStorageKey = 'wow-color-mode';

/** Options for `colorModeScript` — pass the same values the app gives `ColorModeProvider`. */
export interface ColorModeScriptOptions {
  /** The provider's `storageKey`. Default `ColorModeStorageKey`. */
  readonly storageKey?: string;

  /** The provider's `defaultMode`. Default `'system'`. */
  readonly defaultMode?: ColorMode | 'system';
}

/* JSON is valid JavaScript; escaping `<` keeps a value from closing an inline `<script>` element. */
function literal(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Returns the source of a pre-paint script that applies the remembered colour mode before the first frame, so a
 * dark app never flashes light. It reads the provider's storage key with the provider's rules: a stored `light` or
 * `dark` wins; a stored `system`, or nothing with a `system` default, follows the OS; otherwise the default mode.
 * It toggles `dark` and sets `color-scheme` on `<html>`, exactly as the provider will on mount.
 *
 * Inline it as a classic `<script>` in `index.html`'s `<head>` (a strict CSP needs its hash), or write it to a static
 * file served from the same origin. Storage failures leave the page to the provider.
 */
export function colorModeScript(options: ColorModeScriptOptions = {}): string {
  const key = literal(options.storageKey ?? ColorModeStorageKey);
  const fallback = literal(options.defaultMode ?? 'system');
  return (
    '(function(){try{' +
    `var s=localStorage.getItem(${key}),d=${fallback},m;` +
    "if(s==='light'||s==='dark')m=s;" +
    "else if(s==='system'||d==='system')m=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';" +
    'else m=d;' +
    "var r=document.documentElement;r.classList.toggle('dark',m==='dark');r.style.colorScheme=m;" +
    '}catch(e){}})();'
  );
}
