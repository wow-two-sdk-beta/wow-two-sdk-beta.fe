import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeviceClass,
  DeviceClassAttribute,
  PointerType,
  ShortHeightQuery,
  TailwindBreakpoints,
  provideDeviceTargets,
  useDeviceClass,
  type DeviceClassState,
  type DeviceScale,
} from '@src/foundation/device';

const { Phone, Tablet, Desktop } = DeviceClass;
const { Coarse, Fine } = PointerType;

interface Environment {
  width: number;
  height: number;
  pointer: PointerType;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(DeviceClassAttribute);
});

/**
 * Stubs `matchMedia` for a device and returns the queries asked plus a `set` that changes the device and notifies
 * every list whose answer flipped — a rotation, a resize, or a keyboard docked to a tablet.
 */
function device(initial: Environment) {
  let current = { ...initial };
  const asked: string[] = [];
  const lists: { query: string; last: boolean; listeners: Set<(event: { matches: boolean }) => void> }[] = [];

  const evaluate = (query: string): boolean => {
    const min = /\(min-width: (\d+)px\)/.exec(query);
    if (min) return current.width >= Number(min[1]);
    const max = /\(max-height: (\d+)px\)/.exec(query);
    if (max) return current.height <= Number(max[1]);
    const pointer = /\(pointer: (\w+)\)/.exec(query);
    return pointer ? current.pointer === pointer[1] : false;
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      asked.push(query);
      const entry = { query, last: evaluate(query), listeners: new Set<(event: { matches: boolean }) => void>() };
      lists.push(entry);
      return {
        get matches() {
          return evaluate(query);
        },
        addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
          entry.listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
          entry.listeners.delete(listener),
      };
    }),
  );

  return {
    asked,
    set(next: Partial<Environment>): void {
      current = { ...current, ...next };
      for (const entry of lists) {
        const matches = evaluate(entry.query);
        if (matches === entry.last) continue;
        entry.last = matches;
        for (const listener of entry.listeners) listener({ matches });
      }
    },
  };
}

/** Mounts a component whose setup calls `read`, and returns what it returned once mounted. */
async function readAfterMount<T>(read: () => T) {
  let result!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = read();
        return () => h('span');
      },
    }),
  );
  await nextTick();
  return { result, wrapper };
}

const view = (state: DeviceClassState): string => `${state.detected.value}/${state.effective.value}`;

describe('useDeviceClass', () => {
  it('reads a landscape phone as a phone, with its short height and coarse pointer', async () => {
    device({ width: 844, height: 390, pointer: Coarse });
    const { result } = await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints }));
    expect(view(result)).toBe('phone/phone');
    expect(result.isShortHeight.value).toBe(true);
    expect(result.isCoarsePointer.value).toBe(true);
  });

  it('reads portrait and landscape tablets, and a wide window', async () => {
    const env = device({ width: 820, height: 1180, pointer: Coarse });
    const { result } = await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints }));
    expect(result.detected.value).toBe(Tablet);
    env.set({ width: 1180, height: 820 });
    expect(result.detected.value).toBe(Desktop);
    env.set({ width: 1440, height: 900, pointer: Fine });
    expect(result.detected.value).toBe(Desktop);
    expect(result.isCoarsePointer.value).toBe(false);
  });

  it('follows a rotation without a reload', async () => {
    const env = device({ width: 390, height: 844, pointer: Coarse });
    const { result, wrapper } = await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints }));
    expect(result.detected.value).toBe(Phone);
    expect(result.isShortHeight.value).toBe(false);
    env.set({ width: 844, height: 390 });
    expect(result.detected.value).toBe(Phone);
    expect(result.isShortHeight.value).toBe(true);
    env.set({ width: 1024, height: 768 });
    expect(result.detected.value).toBe(Desktop);
    expect(result.isShortHeight.value).toBe(false);
    wrapper.unmount();
  });

  it('follows a keyboard docked to a touch device', async () => {
    const env = device({ width: 844, height: 390, pointer: Coarse });
    const { result } = await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints }));
    expect(result.detected.value).toBe(Phone);
    env.set({ pointer: Fine });
    expect(result.detected.value).toBe(Tablet);
    expect(result.isCoarsePointer.value).toBe(false);
    expect(result.isShortHeight.value).toBe(true);
  });

  it('subscribes the two thresholds, the short height and the pointer, not the whole scale', async () => {
    const env = device({ width: 1440, height: 900, pointer: Fine });
    await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints }));
    expect([...new Set(env.asked)].sort()).toEqual(
      ['(min-width: 768px)', '(min-width: 1024px)', ShortHeightQuery, '(pointer: fine)', '(pointer: coarse)'].sort(),
    );
  });

  it('serves a class the product does not declare with the nearest declared one', async () => {
    device({ width: 820, height: 1180, pointer: Coarse });
    const targets = shallowRef<readonly DeviceClass[] | undefined>([Phone, Desktop]);
    const { result } = await readAfterMount(() => useDeviceClass({ scale: TailwindBreakpoints, targets }));
    expect(view(result)).toBe('tablet/phone');
    targets.value = [Desktop];
    expect(view(result)).toBe('tablet/desktop');
    targets.value = undefined;
    expect(view(result)).toBe('tablet/tablet');
    targets.value = [];
    expect(view(result)).toBe('tablet/tablet');
  });

  it('follows a changed scale', async () => {
    device({ width: 1000, height: 900, pointer: Fine });
    const scale = shallowRef<DeviceScale>(TailwindBreakpoints);
    const { result } = await readAfterMount(() => useDeviceClass({ scale }));
    expect(result.detected.value).toBe(Tablet);
    scale.value = { md: 600, lg: 900 };
    await nextTick();
    expect(result.detected.value).toBe(Desktop);
    scale.value = { md: 1100, lg: 1400 };
    await nextTick();
    expect(result.detected.value).toBe(Phone);
  });

  it('holds desktop until mounted, then corrects', async () => {
    device({ width: 390, height: 844, pointer: Coarse });
    let beforeMount: DeviceClass | undefined;
    const { result } = await readAfterMount(() => {
      const state = useDeviceClass({ scale: TailwindBreakpoints });
      beforeMount = state.detected.value;
      return state;
    });
    expect(beforeMount).toBe(Desktop);
    expect(result.detected.value).toBe(Phone);
  });

  it('renders as desktop on the server', async () => {
    device({ width: 390, height: 844, pointer: Coarse });
    const html = await renderToString(
      h(
        defineComponent({
          setup() {
            const state = useDeviceClass({ scale: TailwindBreakpoints, targets: [Phone, Tablet] });
            return () => h('span', `${view(state)}/${state.isShortHeight.value}/${state.isCoarsePointer.value}`);
          },
        }),
      ),
    );
    expect(html).toBe('<span>desktop/tablet/false/false</span>');
  });

  it('throws without options below no provider, naming the fix', () => {
    const fail = (): void => {
      mount(
        defineComponent({
          setup() {
            useDeviceClass();
            return () => h('span');
          },
        }),
      );
    };
    expect(fail).toThrow(/provideDeviceTargets/);
  });
});

describe('provideDeviceTargets', () => {
  /** An app root that declares `targets` and a child that reads the app's class with no options. */
  function mountApp(targets: readonly DeviceClass[] | undefined) {
    const states: DeviceClassState[] = [];
    const Child = defineComponent({
      setup() {
        const state = useDeviceClass();
        states.push(state);
        return () => h('span', view(state));
      },
    });
    const Root = defineComponent({
      setup() {
        states.push(provideDeviceTargets(targets, TailwindBreakpoints));
        return () => h(Child);
      },
    });
    const wrapper = mount(Root);
    return { wrapper, states };
  }

  it('gives a no-options call below it the app effective class, from one shared state', async () => {
    device({ width: 820, height: 1180, pointer: Coarse });
    const { wrapper, states } = mountApp([Phone, Desktop]);
    await nextTick();
    expect(states).toHaveLength(2);
    expect(states[1]).toBe(states[0]);
    expect(wrapper.text()).toBe('tablet/phone');
  });

  it('keeps the effective class on the document element and restores it on unmount', async () => {
    document.documentElement.setAttribute(DeviceClassAttribute, 'before');
    const env = device({ width: 820, height: 1180, pointer: Coarse });
    const { wrapper } = mountApp([Phone, Desktop]);
    await nextTick();
    expect(document.documentElement.getAttribute(DeviceClassAttribute)).toBe('phone');
    env.set({ width: 1180, height: 820 });
    await nextTick();
    expect(document.documentElement.getAttribute(DeviceClassAttribute)).toBe('desktop');
    wrapper.unmount();
    expect(document.documentElement.getAttribute(DeviceClassAttribute)).toBe('before');
  });

  it('removes the attribute on unmount when it was not there before', async () => {
    device({ width: 1440, height: 900, pointer: Fine });
    const { wrapper } = mountApp(undefined);
    await nextTick();
    expect(document.documentElement.getAttribute(DeviceClassAttribute)).toBe('desktop');
    wrapper.unmount();
    expect(document.documentElement.hasAttribute(DeviceClassAttribute)).toBe(false);
  });

  it('writes no attribute during a server render', async () => {
    device({ width: 390, height: 844, pointer: Coarse });
    const html = await renderToString(
      h(
        defineComponent({
          setup() {
            const state = provideDeviceTargets([Phone], TailwindBreakpoints);
            return () => h('span', view(state));
          },
        }),
      ),
    );
    expect(html).toBe('<span>desktop/phone</span>');
    expect(document.documentElement.hasAttribute(DeviceClassAttribute)).toBe(false);
  });
});
