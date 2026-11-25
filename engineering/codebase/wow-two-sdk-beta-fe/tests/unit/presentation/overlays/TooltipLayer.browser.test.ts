import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import { Layer, layerStyle } from '@src/foundation/styles';
import { Tooltip } from '@src/presentation/overlays';
import '@src/index.css';

/*
 * The browser keeps one real pointer per page, and it outlives a test and, when a page is reused, a test file. If it
 * rests where a trigger mounts, the browser fires a trusted `pointerenter` on that trigger after the first layout,
 * and that takes the tooltip over mid-test. The tests below drive a trigger with synthetic events, so the file starts
 * with the real pointer parked in a corner nothing mounts into. Only the last test moves it, so the file parks it
 * again at the end rather than leave it over that test's triggers for the next file.
 */
async function parkPointer(): Promise<void> {
  const corner = document.createElement('div');
  corner.style.cssText = 'position: fixed; left: 0; bottom: 0; width: 8px; height: 8px';
  document.body.append(corner);
  await userEvent.hover(corner);
  corner.remove();
}

let wrapper: VueWrapper | null = null;
beforeAll(parkPointer);
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});
afterAll(parkPointer);

/* A tooltip opened from a sticky filter bar overlaps the bar itself; the bar must not paint over it. */
it('paints a tooltip opened from a sticky bar above that bar', async () => {
  wrapper = mount(
    {
      render: () =>
        h(
          'div',
          {
            'data-bar': '',
            style: {
              position: 'sticky',
              top: '0',
              height: '160px',
              paddingTop: '112px',
              background: 'white',
              ...layerStyle('Sticky'),
            },
          },
          [
            h(Tooltip, { content: 'Every attempt', defaultOpen: true }, () =>
              h('button', { type: 'button' }, 'All attempts'),
            ),
          ],
        ),
    },
    { attachTo: document.body },
  );
  await expect.poll(() => document.querySelector('[role=tooltip]') !== null).toBe(true);
  const tooltip = document.querySelector<HTMLElement>('[role=tooltip]')!;
  const bar = document.querySelector<HTMLElement>('[data-bar]')!;

  // The positioned root carries the layer, above the sticky tier and the popover and menu tiers.
  const root = tooltip.parentElement!;
  expect(Number(getComputedStyle(root).zIndex)).toBe(Layer.Tooltip);
  expect(Layer.Tooltip).toBeGreaterThan(Math.max(Layer.Sticky, Layer.Dropdown, Layer.Popover));

  // The tooltip opens above its trigger, inside the bar, and wins the hit test there.
  const trigger = wrapper.get('button').element;
  // Browser engines round fractional layout coordinates differently; allow subpixel rounding.
  await expect
    .poll(() => trigger.getBoundingClientRect().top - tooltip.getBoundingClientRect().bottom)
    .toBeCloseTo(6, 1);
  const box = tooltip.getBoundingClientRect();
  expect(box.top).toBeGreaterThanOrEqual(bar.getBoundingClientRect().top);
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  expect(tooltip.contains(hit)).toBe(true);
});

it('switches between neighbouring tooltips without replaying a fade or leaving the first visible', async () => {
  wrapper = mount(
    {
      render: () =>
        h('div', [
          h(Tooltip, { content: 'First hint', openDelay: 0 }, () => h('button', 'First')),
          h(Tooltip, { content: 'Second hint', openDelay: 0 }, () => h('button', 'Second')),
        ]),
    },
    { attachTo: document.body },
  );
  const first = wrapper.get('button:first-child');
  const second = wrapper.get('button:last-child');
  await first.trigger('pointerenter');
  await expect.poll(() => document.querySelector('[role=tooltip]')?.textContent).toBe('First hint');

  const observed: string[][] = [];
  const observer = new MutationObserver(() => {
    const hints = Array.from(document.querySelectorAll('[role=tooltip]'), (element) => element.textContent ?? '');
    if (hints.includes('Second hint')) observed.push(hints);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  try {
    await first.trigger('pointerleave');
    await second.trigger('pointerenter');
    await expect.poll(() => observed[0]).toEqual(['Second hint']);
    const activeHint = document.querySelector<HTMLElement>('[role=tooltip]')!;
    expect(getComputedStyle(activeHint).animationName).toBe('none');
    expect(getComputedStyle(activeHint).opacity).toBe('1');
  } finally {
    observer.disconnect();
  }
});

it('replaces a focused tooltip when another trigger is hovered, with one visible body throughout', async () => {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: { padding: '80px' } }, [
          h(Tooltip, { content: 'Focused hint', openDelay: 0, fadeDuration: 200 }, () => h('button', 'Focused')),
          h(Tooltip, { content: 'Hover hint', openDelay: 0, fadeDuration: 200 }, () => h('button', 'Hovered')),
        ]),
    },
    { attachTo: document.body },
  );
  const first = wrapper.get<HTMLButtonElement>('button:first-child').element;
  const second = wrapper.get<HTMLButtonElement>('button:last-child').element;
  first.focus();
  await expect.poll(() => document.querySelector('[role=tooltip]')?.textContent).toBe('Focused hint');

  const counts: number[] = [];
  const observer = new MutationObserver(() => counts.push(document.querySelectorAll('[role=tooltip]').length));
  observer.observe(document.body, { childList: true, subtree: true });
  try {
    await userEvent.hover(second);
    await expect.poll(() => document.querySelector('[role=tooltip]')?.textContent).toBe('Hover hint');
    expect(document.activeElement).toBe(first);
    expect(Math.max(...counts)).toBe(1);
  } finally {
    observer.disconnect();
  }
});
