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
  const box = panel()!.getBoundingClientRect();
  expect(box.width).toBeGreaterThan(Math.min(window.innerWidth * 0.9, 1000));
  // Forced colors repaint the stage with the system canvas; elsewhere it is 90% black.
  if (!window.matchMedia('(forced-colors: active)').matches) {
    expect(getComputedStyle(panel()!).backgroundColor).toMatch(/^(oklab\(0 0 0|rgba?\(0, 0, 0)/);
  }
  await expect.poll(() => panel()!.contains(document.activeElement)).toBe(true);
  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => panel()!.querySelector('figure img')?.getAttribute('alt')).toBe('Bridge');
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => panel()).toBeNull();
  expect(document.activeElement).toBe(thumb);
});
