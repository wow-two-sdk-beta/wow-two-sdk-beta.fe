import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { Tooltip } from '@src/presentation/overlays';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function mountTooltip(fadeDuration?: number): VueWrapper {
  wrapper = mount(
    {
      render: () =>
        h(Tooltip, { content: 'Every attempt', openDelay: 0, fadeDuration }, () =>
          h('button', { type: 'button' }, 'All'),
        ),
    },
    { attachTo: document.body },
  );
  return wrapper;
}

function body(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=tooltip]');
}

function opacity(): number {
  return Number(getComputedStyle(body()!).opacity);
}

it('fades the body in from transparent and out again before it unmounts', async () => {
  const trigger = mountTooltip(1200).get('button');
  await trigger.trigger('pointerenter');
  await expect.poll(() => body() !== null).toBe(true);

  // Mid-transition: not yet opaque, and it never starts above zero and jumps.
  expect(opacity()).toBeLessThan(1);
  await expect.poll(opacity, { timeout: 4000 }).toBe(1);

  await trigger.trigger('pointerleave');
  await expect.poll(opacity, { timeout: 1000 }).toBeLessThan(1);
  expect(body()).not.toBeNull();
  await expect.poll(() => body(), { timeout: 4000 }).toBeNull();
  expect(document.querySelector('[data-portal-name]')).toBeNull();
});

it('shows and removes the body at once without a fadeDuration', async () => {
  const trigger = mountTooltip().get('button');
  await trigger.trigger('pointerenter');
  await expect.poll(() => body() !== null).toBe(true);
  expect(opacity()).toBe(1);
  expect(body()!.hasAttribute('style')).toBe(false);

  await trigger.trigger('pointerleave');
  await expect.poll(() => body()).toBeNull();
});

it('skips the fade when the reader asked for reduced motion', async () => {
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          matches: true,
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        } as unknown as MediaQueryList)
      : matchMedia(query),
  );
  const trigger = mountTooltip(1200).get('button');
  await trigger.trigger('pointerenter');
  await expect.poll(() => body() !== null).toBe(true);
  expect(opacity()).toBe(1);

  await trigger.trigger('pointerleave');
  await expect.poll(() => body(), { timeout: 500 }).toBeNull();
});
