import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { computed, nextTick, ref, type Ref } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { DeviceClass, DeviceClassKey, type DeviceClassState } from '@src/foundation/device';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

const focus = Temporal.ZonedDateTime.from('2026-09-25T12:00:00Z[UTC]');

/** Answers every media query with `matches`: `true` is a viewport narrower than `sm`, `false` a wide one. */
function viewport(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

/** What an app root's `provideDeviceTargets` would provide, with the effective class held in the given ref. */
function deviceState(effective: Ref<DeviceClass>): DeviceClassState {
  return {
    detected: computed(() => effective.value),
    effective: computed(() => effective.value),
    isShortHeight: computed(() => false),
    isCoarsePointer: computed(() => false),
  };
}

async function mountMonth(effective?: Ref<DeviceClass>): Promise<VueWrapper> {
  const wrapper = mount(EventCalendarViewer, {
    props: { events: [], date: focus, view: 'month' },
    global: effective ? { provide: { [DeviceClassKey as symbol]: deviceState(effective) } } : {},
  });
  wrappers.push(wrapper);
  await nextTick();
  return wrapper;
}

/** The month grid's single-day event columns exist only in the wide layout; the phone puts dots in the date button. */
const isWideLayout = (wrapper: VueWrapper): boolean => wrapper.find('[data-day]').exists();

describe('EventCalendarViewer layout without a device class provider', () => {
  it('serves the wide layout to a viewport at or above sm', async () => {
    viewport(false);
    expect(isWideLayout(await mountMonth())).toBe(true);
  });

  it('serves the phone layout to a viewport narrower than sm', async () => {
    viewport(true);
    expect(isWideLayout(await mountMonth())).toBe(false);
  });
});

describe('EventCalendarViewer layout under a provided device class', () => {
  it('serves the phone layout to a phone class on a wide viewport', async () => {
    viewport(false);
    expect(isWideLayout(await mountMonth(ref(DeviceClass.Phone)))).toBe(false);
  });

  it('serves the wide layout to a desktop class on a narrow viewport', async () => {
    viewport(true);
    expect(isWideLayout(await mountMonth(ref(DeviceClass.Desktop)))).toBe(true);
  });

  it('serves the wide layout to a tablet class on a narrow viewport', async () => {
    viewport(true);
    expect(isWideLayout(await mountMonth(ref(DeviceClass.Tablet)))).toBe(true);
  });

  it('follows the class when it changes, without a reload', async () => {
    viewport(false);
    const effective = ref<DeviceClass>(DeviceClass.Desktop);
    const wrapper = await mountMonth(effective);
    expect(isWideLayout(wrapper)).toBe(true);

    effective.value = DeviceClass.Phone;
    await nextTick();
    expect(isWideLayout(wrapper)).toBe(false);

    effective.value = DeviceClass.Desktop;
    await nextTick();
    expect(isWideLayout(wrapper)).toBe(true);
  });

  it('never reads window.innerWidth', async () => {
    viewport(false);
    const width = vi.spyOn(window, 'innerWidth', 'get');
    await mountMonth(ref(DeviceClass.Phone));
    await mountMonth();
    expect(width).not.toHaveBeenCalled();
  });
});
