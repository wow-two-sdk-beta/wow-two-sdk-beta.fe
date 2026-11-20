import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, type Component } from 'vue';
import { page } from 'vitest/browser';
import { ToggleGroup, ToggleGroupVariant, type ToggleGroupOption } from '@src/presentation/forms';
import '@src/index.css';

/* Mirrors Ocharo Events' `CalendarPage.vue` scope pills — 3 `pill` `multi` options narrower than their row. */
const scopeOptions: ToggleGroupOption[] = [
  { value: 'national', label: 'National' },
  { value: 'central-asia', label: 'Central Asia' },
  { value: 'international', label: 'International' },
];

let wrapper: VueWrapper | null = null;

beforeAll(async () => {
  await page.viewport(390, 400);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Mounts a `ToggleGroup` inside a `width`px frame and returns the frame element. */
function mountGroup(width: number, props: Record<string, unknown>): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h('div', { 'data-frame': '', style: { width: `${width}px` } }, [h(ToggleGroup as Component, props)]),
    },
    { attachTo: document.body },
  );
  return document.querySelector<HTMLElement>('[data-frame]')!;
}

describe('ToggleGroup wrapping on a phone', () => {
  it('wraps pill items onto a second line instead of clipping them off the right edge', () => {
    // `itemVariant`/`itemTone` mirror `CalendarPage.vue`'s real pills — `ghost` (the default) draws
    // no border or fill, so an unpressed chip has zero measurable width to clip or wrap. 150px is
    // narrower than CalendarPage.vue's 390px container — these 3 labels' intrinsic width already
    // clears 390px without wrapping, so a tighter frame is what actually reproduces an overflow.
    const root = mountGroup(150, {
      options: scopeOptions,
      type: 'multi',
      variant: ToggleGroupVariant.Pill,
      itemVariant: 'solid',
      itemTone: 'neutral',
    });
    const group = root.querySelector<HTMLElement>('[role=group]')!;
    const items = [...group.querySelectorAll<HTMLElement>('button')];
    expect(items).toHaveLength(3);
    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth + 1);
    const tops = items.map((item) => Math.round(item.getBoundingClientRect().top));
    expect(tops[1]).toBeGreaterThan(tops[0]!);
    for (const item of items) {
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    }
  });

  it('wraps an attached default-variant row without widening past its container', () => {
    const root = mountGroup(200, { options: scopeOptions, type: 'single', variant: ToggleGroupVariant.Default });
    const group = root.querySelector<HTMLElement>('[role=group]')!;
    const items = [...group.querySelectorAll<HTMLElement>('button')];
    expect(items).toHaveLength(3);
    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth + 1);
    const tops = items.map((item) => Math.round(item.getBoundingClientRect().top));
    expect(new Set(tops).size).toBeGreaterThan(1);
    for (const item of items) {
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    }
  });
});
