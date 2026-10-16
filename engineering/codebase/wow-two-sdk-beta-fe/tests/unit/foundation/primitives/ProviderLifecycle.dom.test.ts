import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ScrollViewport from '@src/foundation/primitives/scrollViewport/ScrollViewport.vue';
import ColorModeProvider from '@src/foundation/primitives/colorModeProvider/ColorModeProvider.vue';
import { useColorMode } from '@src/foundation/primitives/colorModeProvider/ColorModeContext';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});

it('renders numeric viewport dimensions as pixels and merges string styles', () => {
  const wrapper = mount(ScrollViewport, { props: { height: 200, maxHeight: 400 }, attrs: { style: 'color: red' } });
  wrappers.push(wrapper);
  expect(wrapper.get('div').element.style.height).toBe('200px');
  expect(wrapper.get('div').element.style.maxHeight).toBe('400px');
  expect(wrapper.get('div').element.style.color).toBe('red');
});

it('keeps color-mode controls usable when persistence is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  const Control = defineComponent({
    setup() {
      const mode = useColorMode();
      return () => h('button', { onClick: mode.toggle }, mode.mode);
    },
  });
  const wrapper = mount(ColorModeProvider, { props: { defaultMode: 'light' }, slots: { default: () => h(Control) } });
  wrappers.push(wrapper);
  await nextTick();
  expect(wrapper.get('button').text()).toBe('light');
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('button').text()).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

it('follows system color changes until the reader chooses a mode', async () => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  } as unknown as MediaQueryList);
  const Control = defineComponent({
    setup() {
      const mode = useColorMode();
      return () => h('button', { onClick: mode.toggle }, mode.mode);
    },
  });
  const wrapper = mount(ColorModeProvider, {
    props: { defaultMode: 'system', storageKey: null },
    slots: { default: () => h(Control) },
  });
  wrappers.push(wrapper);
  await nextTick();
  listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
  await nextTick();
  expect(wrapper.get('button').text()).toBe('dark');
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('button').text()).toBe('light');
  listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
  await nextTick();
  listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
  await nextTick();
  expect(wrapper.get('button').text()).toBe('light');
});
