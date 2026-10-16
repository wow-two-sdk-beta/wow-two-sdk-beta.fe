<script lang="ts">
import type { InjectionKey } from 'vue';

interface ColorModeOwner {
  readonly parent: ColorModeOwner | null;
  readonly mode: () => ColorMode;
}
interface RootColorModes {
  readonly owners: ColorModeOwner[];
  readonly dark: boolean;
  readonly colorScheme: string;
  readonly priority: string;
}
const ColorModeOwnerKey: InjectionKey<ColorModeOwner> = Symbol('wow-two.colorModeOwner');
const RootOwners = new WeakMap<HTMLElement, RootColorModes>();

function isDescendant(owner: ColorModeOwner, ancestor: ColorModeOwner): boolean {
  for (let entry: ColorModeOwner | null = owner; entry; entry = entry.parent) {
    if (entry === ancestor) return true;
  }
  return false;
}

function applyRootMode(root: HTMLElement): void {
  const state = RootOwners.get(root);
  if (!state) return;
  const owner = state.owners.at(-1);
  if (owner) {
    const mode = owner.mode();
    root.classList.toggle('dark', mode === 'dark');
    root.style.setProperty('color-scheme', mode);
  } else {
    root.classList.toggle('dark', state.dark);
    if (state.colorScheme) root.style.setProperty('color-scheme', state.colorScheme, state.priority);
    else root.style.removeProperty('color-scheme');
    RootOwners.delete(root);
  }
}
// `ColorMode` is imported as a value by `<script setup>` below; both blocks
// share one module scope, so re-importing the type here would duplicate it.
export interface ColorModeProviderProps {
  /** The mode used when nothing is persisted. `'system'` follows the OS preference. Default `'system'`. */
  readonly defaultMode?: ColorMode | 'system';

  /** The `localStorage` key for persistence; pass `null` to disable. Default `'wow-color-mode'`. */
  readonly storageKey?: string | null;
}
</script>

<script setup lang="ts">
import { inject, onMounted, onScopeDispose, provide, shallowRef, watch } from 'vue';
import { useMediaQuery } from '../../device';
import { ColorMode, ColorModeKey, ColorModeSystemValue, type ColorModeContextValue } from './ColorModeContext';
import { ColorModeStorageKey } from './ColorModeScript';

/**
 * Renders no element of its own — the slot passes straight through — while owning the app's light/dark mode:
 * toggles the `dark` class on `<html>` (which flips every semantic token) + sets `color-scheme`, persists the
 * choice, and falls back to the OS preference. Wrap the app once; read via `useColorMode()`. This is the
 * canonical `.dark` mechanism for the design tokens.
 */
defineOptions({ name: 'ColorModeProvider' });

const props = withDefaults(defineProps<ColorModeProviderProps>(), {
  defaultMode: 'system',
  storageKey: ColorModeStorageKey,
});

defineSlots<{
  /** The subtree that reads the active color mode. */
  default(): unknown;
}>();

/** Explicit defaults are shared by SSR and the first client render. */
const mode = shallowRef<ColorMode>(props.defaultMode === 'system' ? ColorMode.Light : props.defaultMode);
let root: HTMLElement | undefined;
const owner: ColorModeOwner = { parent: inject(ColorModeOwnerKey, null), mode: () => mode.value };
provide(ColorModeOwnerKey, owner);
const followsSystem = shallowRef(false);
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

onMounted(() => {
  let stored: string | null = null;
  try {
    stored = props.storageKey ? window.localStorage.getItem(props.storageKey) : null;
  } catch {
    // Storage denial must not disable the in-memory theme control.
  }
  // A stored `system` choice follows the OS even when the default names a fixed mode.
  followsSystem.value =
    stored === ColorModeSystemValue ||
    (stored !== ColorMode.Light && stored !== ColorMode.Dark && props.defaultMode === 'system');
  mode.value =
    stored === ColorMode.Light || stored === ColorMode.Dark
      ? stored
      : followsSystem.value
        ? prefersDark.value
          ? ColorMode.Dark
          : ColorMode.Light
        : mode.value;
  root = document.documentElement;
  const state: RootColorModes = RootOwners.get(root) ?? {
    owners: [],
    dark: root.classList.contains('dark'),
    colorScheme: root.style.getPropertyValue('color-scheme'),
    priority: root.style.getPropertyPriority('color-scheme'),
  };
  RootOwners.set(root, state);
  const descendant = state.owners.findIndex((candidate) => isDescendant(candidate, owner));
  if (descendant < 0) state.owners.push(owner);
  else state.owners.splice(descendant, 0, owner);
  applyRootMode(root);
});

onScopeDispose(() => {
  if (!root) return;
  const state = RootOwners.get(root);
  const index = state?.owners.indexOf(owner) ?? -1;
  if (state && index >= 0) state.owners.splice(index, 1);
  applyRootMode(root);
  root = undefined;
});

watch(prefersDark, (dark) => {
  if (followsSystem.value) mode.value = dark ? ColorMode.Dark : ColorMode.Light;
});

watch(mode, () => {
  if (root) applyRootMode(root);
});

function setMode(next: ColorMode): void {
  followsSystem.value = false;
  mode.value = next;
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(props.storageKey, next);
  } catch {
    // Storage may be disabled or full; the chosen mode remains active.
  }
}

function followSystem(): void {
  followsSystem.value = true;
  mode.value = prefersDark.value ? ColorMode.Dark : ColorMode.Light;
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(props.storageKey, ColorModeSystemValue);
  } catch {
    // Storage may be disabled or full; following the OS stays active for this session.
  }
}

// A getter, so consumers read `ctx.mode` as a plain value exactly like the
// React context object — and tracking still happens on access.
const context: ColorModeContextValue = {
  get mode() {
    return mode.value;
  },
  get followsSystem() {
    return followsSystem.value;
  },
  setMode,
  followSystem,
  toggle: () => setMode(mode.value === ColorMode.Dark ? ColorMode.Light : ColorMode.Dark),
};

provide(ColorModeKey, context);
</script>

<template>
  <slot />
</template>
