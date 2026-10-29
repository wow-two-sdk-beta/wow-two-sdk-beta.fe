import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TailwindBreakpoints, useBreakpointBelow, useBreakpointUp } from '@src/foundation/device';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stubs `matchMedia` for a viewport `width` pixels wide and returns the queries asked. */
function viewport(width: number): string[] {
  const asked: string[] = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      asked.push(query);
      const min = /min-width: (\d+)px/.exec(query);
      return {
        matches: min ? width >= Number(min[1]) : false,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }),
  );
  return asked;
}

function probe(setup: () => () => unknown) {
  return mount(defineComponent({ setup }));
}

describe('useBreakpointUp / useBreakpointBelow', () => {
  it('asks one min-width query for the named breakpoint', async () => {
    const asked = viewport(800);
    const wrapper = probe(() => {
      const up = useBreakpointUp(TailwindBreakpoints, 'md');
      const below = useBreakpointBelow(TailwindBreakpoints, 'lg');
      return () => h('span', `${up.value}/${below.value}`);
    });
    await nextTick();
    expect(wrapper.text()).toBe('true/true');
    expect(asked).toEqual(['(min-width: 768px)', '(min-width: 1024px)']);
  });

  it('reads a phone below md', async () => {
    viewport(390);
    const wrapper = probe(() => {
      const isPhone = useBreakpointBelow(TailwindBreakpoints, 'md');
      return () => h('span', String(isPhone.value));
    });
    await nextTick();
    expect(wrapper.text()).toBe('true');
  });

  it('follows a changed key', async () => {
    const asked = viewport(1100);
    const key = shallowRef<'md' | 'xl'>('md');
    const wrapper = probe(() => {
      const up = useBreakpointUp(TailwindBreakpoints, key);
      return () => h('span', String(up.value));
    });
    await nextTick();
    expect(wrapper.text()).toBe('true');
    key.value = 'xl';
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toBe('false');
    expect(asked.at(-1)).toBe('(min-width: 1280px)');
  });

  it('never matches a key the scale lacks', async () => {
    const asked = viewport(2000);
    const wrapper = probe(() => {
      const up = useBreakpointUp({ md: Number.NaN } as Record<string, number>, 'md');
      return () => h('span', String(up.value));
    });
    await nextTick();
    expect(wrapper.text()).toBe('false');
    expect(asked).toEqual(['not all']);
  });

  it('renders the mobile-first base on the server', async () => {
    const html = await renderToString(
      h(
        defineComponent({
          setup() {
            const up = useBreakpointUp(TailwindBreakpoints, 'lg');
            const below = useBreakpointBelow(TailwindBreakpoints, 'md');
            return () => h('span', `${up.value}/${below.value}`);
          },
        }),
      ),
    );
    expect(html).toBe('<span>false/true</span>');
  });
});
