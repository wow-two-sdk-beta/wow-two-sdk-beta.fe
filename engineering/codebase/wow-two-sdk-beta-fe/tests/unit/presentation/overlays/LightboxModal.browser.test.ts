import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import { LightboxModal } from '@src/presentation/overlays';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const pixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

it('fills the viewport on a dark stage and returns focus to the thumbnail on Escape', async () => {
  wrapper = mount(LightboxModal, {
    props: {
      images: [
        { src: pixel, alt: 'Harbour' },
        { src: `${pixel}#2`, alt: 'Bridge' },
      ],
    },
    slots: {
      default: ({ openAt }: { openAt: (index: number) => void }) =>
        h('button', { 'data-thumb': '', onClick: () => openAt(0) }, 'Open'),
    },
    attachTo: document.body,
  });
  const thumb = document.querySelector<HTMLElement>('[data-thumb]')!;
  // Keyboard open: WebKit never focuses a clicked button, so a click leaves nothing to return to.
  thumb.focus();
  await userEvent.keyboard('{Enter}');
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('[role=dialog]');
  await expect.poll(() => panel() !== null).toBe(true);
  await expect
    .poll(() => {
      const { x, y, width, height } = panel()!.getBoundingClientRect();
      return [x, y, width, height].map(Math.round);
    })
    .toEqual([0, 0, window.innerWidth, window.innerHeight]);
  // Forced colors repaint the stage with the system canvas.
  if (!window.matchMedia('(forced-colors: active)').matches) {
    expect(getComputedStyle(panel()!).backgroundColor).toMatch(/^(oklab\(0 0 0\)|rgb\(0, 0, 0\))$/);
  }
  expect(getComputedStyle(panel()!.querySelector('figure img')!).objectFit).toBe('contain');
  await expect.poll(() => panel()!.contains(document.activeElement)).toBe(true);
  const previews = panel()!.querySelector('[aria-label="Image previews"]')!;
  const selected = () => previews.querySelector<HTMLButtonElement>('button[aria-current="true"]')!;
  expect(previews.getBoundingClientRect().top).toBeGreaterThanOrEqual(
    panel()!.querySelector('figure')!.getBoundingClientRect().bottom,
  );
  await userEvent.click(previews.querySelector('button[aria-label="Show image 2"]')!);
  await expect.poll(() => panel()!.querySelector('figure img')?.getAttribute('alt')).toBe('Bridge');
  selected().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => panel()!.querySelector('figure img')?.getAttribute('alt')).toBe('Harbour');
  await expect.poll(() => document.activeElement).toBe(selected());
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => panel()).toBeNull();
  expect(document.activeElement).toBe(thumb);
});
