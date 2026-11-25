import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { page } from 'vitest/browser';
import { defineComponent, h } from 'vue';
import {
  DeviceClass,
  DeviceClassAttribute,
  TailwindBreakpoints,
  provideDeviceTargets,
  type DeviceClassState,
} from '@src/foundation/device';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

/** Mounts an app root that declares phone and desktop, and returns the state it provides. */
function mountApp(): DeviceClassState {
  let state!: DeviceClassState;
  wrapper = mount(
    defineComponent({
      setup() {
        state = provideDeviceTargets([DeviceClass.Phone, DeviceClass.Desktop], TailwindBreakpoints);
        return () => h('span');
      },
    }),
  );
  return state;
}

/** What a viewport of this shape is, given the pointer this browser really has. */
const expectedDetected = (width: number): DeviceClass => {
  if (width < TailwindBreakpoints.md) return DeviceClass.Phone;
  return width < TailwindBreakpoints.lg ? DeviceClass.Tablet : DeviceClass.Desktop;
};

it('classifies the real viewport and follows it as it is resized and rotated', async () => {
  await page.viewport(1440, 900);
  const state = mountApp();
  await expect.poll(() => state.detected.value).toBe(DeviceClass.Desktop);
  expect(state.isShortHeight.value).toBe(false);

  // Portrait phone, then rotated: the width alone would now read as a tablet, so the pointer decides.
  await page.viewport(390, 844);
  await expect.poll(() => state.detected.value).toBe(DeviceClass.Phone);
  await page.viewport(844, 390);
  await expect.poll(() => state.isShortHeight.value).toBe(true);
  const coarse = matchMedia('(pointer: coarse)').matches;
  expect(state.isCoarsePointer.value).toBe(coarse);
  await expect.poll(() => state.detected.value).toBe(coarse ? DeviceClass.Phone : expectedDetected(844));
});

it('puts the short-height line between 499px and 500px', async () => {
  await page.viewport(900, 500);
  const state = mountApp();
  await expect.poll(() => state.isShortHeight.value).toBe(false);
  await page.viewport(900, 499);
  await expect.poll(() => state.isShortHeight.value).toBe(true);
  await page.viewport(900, 500);
  await expect.poll(() => state.isShortHeight.value).toBe(false);
});

it('serves an undeclared tablet with the phone layout and keeps the attribute in step', async () => {
  await page.viewport(900, 800);
  const state = mountApp();
  await expect.poll(() => state.detected.value).toBe(DeviceClass.Tablet);
  expect(state.effective.value).toBe(DeviceClass.Phone);
  await expect.poll(() => document.documentElement.getAttribute(DeviceClassAttribute)).toBe('phone');

  await page.viewport(1300, 800);
  await expect.poll(() => document.documentElement.getAttribute(DeviceClassAttribute)).toBe('desktop');

  wrapper?.unmount();
  wrapper = null;
  expect(document.documentElement.hasAttribute(DeviceClassAttribute)).toBe(false);
});
