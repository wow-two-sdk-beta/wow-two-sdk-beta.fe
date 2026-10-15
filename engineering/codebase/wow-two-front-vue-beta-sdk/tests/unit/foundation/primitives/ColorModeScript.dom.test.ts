import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import {
  ColorModeProvider,
  ColorModeStorageKey,
  colorModeScript,
  type ColorModeScriptOptions,
} from '@src/foundation/primitives/colorModeProvider';

const StorageKey = 'app.theme';

function stubOs(isDark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isDark && query.includes('dark'),
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

function resetRoot(): void {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.removeProperty('color-scheme');
}

function runScript(options: ColorModeScriptOptions): string {
  resetRoot();
  new Function(colorModeScript(options))();
  return document.documentElement.style.colorScheme;
}

async function providerMode(options: ColorModeScriptOptions): Promise<string> {
  resetRoot();
  const wrapper = mount(ColorModeProvider, {
    props: { storageKey: options.storageKey, defaultMode: options.defaultMode },
    slots: { default: () => h('span') },
  });
  await nextTick();
  const mode = document.documentElement.style.getPropertyValue('color-scheme');
  wrapper.unmount();
  return mode;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  resetRoot();
});

describe('colorModeScript', () => {
  const stored = [null, 'light', 'dark', 'system', 'unknown'] as const;
  const defaults = ['system', 'light', 'dark'] as const;

  it.each(stored.flatMap((value) => defaults.flatMap((mode) => [true, false].map((os) => [value, mode, os] as const))))(
    'applies what the provider will choose — stored %s, default %s, OS dark %s',
    async (value, defaultMode, isOsDark) => {
      stubOs(isOsDark);
      if (value !== null) window.localStorage.setItem(StorageKey, value);
      const options = { storageKey: StorageKey, defaultMode };
      const scripted = runScript(options);
      expect(document.documentElement.classList.contains('dark')).toBe(scripted === 'dark');
      expect(scripted).toBe(await providerMode(options));
    },
  );

  it('reads the provider default key when none is given', () => {
    stubOs(false);
    window.localStorage.setItem(ColorModeStorageKey, 'dark');
    expect(runScript({})).toBe('dark');
  });

  it('cannot close an inline script element through its key', () => {
    expect(colorModeScript({ storageKey: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });

  it('leaves the page to the provider when storage throws', () => {
    stubOs(true);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
    });
    expect(() => runScript({})).not.toThrow();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
