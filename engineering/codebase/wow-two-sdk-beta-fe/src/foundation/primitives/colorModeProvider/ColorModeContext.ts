import { inject, type InjectionKey } from 'vue';

/** Defines the light/dark colour mode of the app. */
export const ColorMode = {
  /** Refers to light mode. */
  Light: 'light',
  /** Refers to dark mode. */
  Dark: 'dark',
} as const;

export type ColorMode = (typeof ColorMode)[keyof typeof ColorMode];

export interface ColorModeContextValue {
  /** The active mode. A reactive property — read it, never destructure it. */
  readonly mode: ColorMode;
  /** Whether the mode follows the OS preference rather than a person's choice. Reactive, like `mode`. */
  readonly followsSystem: boolean;
  setMode: (mode: ColorMode) => void;
  /** Hands the mode back to the OS preference and remembers that choice. */
  followSystem: () => void;
  toggle: () => void;
}

/** The value a provider persists when a person hands the mode back to the OS preference. */
export const ColorModeSystemValue = 'system';

export const ColorModeKey: InjectionKey<ColorModeContextValue> = Symbol('wow-two.colorMode');

/** The OS preference, used when nothing is persisted. SSR-safe — falls back to light. */
export const systemMode = (): ColorMode =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? ColorMode.Dark
    : ColorMode.Light;

/**
 * Read the surrounding colour-mode context.
 *
 * The returned object is `reactive`: `ctx.mode` re-evaluates on every change,
 * so it can be read directly in a template or computed. Destructuring `mode`
 * off it takes a one-time snapshot — bind to the object instead.
 */
export function useColorMode(): ColorModeContextValue {
  const context = inject(ColorModeKey, null);
  if (!context) throw new Error('useColorMode must be used within a <ColorModeProvider>.');
  return context;
}
