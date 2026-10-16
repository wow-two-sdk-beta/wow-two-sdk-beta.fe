import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import {
  ColorMode,
  ColorModeProvider,
  ColorModeSystemValue,
  useColorMode,
  type ColorModeContextValue,
} from '@src/foundation/primitives/colorModeProvider';

const StorageKey = 'test.color-mode';

/** Stubs the OS preference as dark. */
function preferDark(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
}

/** Mounts a provider and returns its context. */
function mountProvider(defaultMode: ColorMode | 'system'): { context: ColorModeContextValue; unmount: () => void } {
  let context: ColorModeContextValue | undefined;
  const Probe = defineComponent({
    setup() {
      context = useColorMode();
      return () => h('span');
    },
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () => h(ColorModeProvider, { defaultMode, storageKey: StorageKey }, () => h(Probe)),
    }),
  );
  return { context: context!, unmount: () => wrapper.unmount() };
}

beforeEach(() => {
  preferDark();
  localStorage.removeItem(StorageKey);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.removeItem(StorageKey);
});

describe('color mode — following the system', () => {
  it('hands a chosen mode back to the OS preference and remembers it', async () => {
    const { context, unmount } = mountProvider('system');
    await nextTick();

    context.setMode(ColorMode.Light);
    expect(context.followsSystem).toBe(false);

    context.followSystem();
    await nextTick();

    expect(context.followsSystem).toBe(true);
    expect(context.mode).toBe(ColorMode.Dark);
    expect(localStorage.getItem(StorageKey)).toBe(ColorModeSystemValue);
    unmount();
  });

  it('follows the OS on load when system was stored, even with a fixed default', async () => {
    localStorage.setItem(StorageKey, ColorModeSystemValue);

    const { context, unmount } = mountProvider(ColorMode.Light);
    await nextTick();

    expect(context.followsSystem).toBe(true);
    expect(context.mode).toBe(ColorMode.Dark);
    unmount();
  });
});
