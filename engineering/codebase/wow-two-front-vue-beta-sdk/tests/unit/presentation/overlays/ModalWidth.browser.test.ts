import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Modal, ModalContent, ModalTitle } from '@src/presentation/overlays';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

async function openPanel(contentProps: Record<string, unknown>): Promise<HTMLElement> {
  wrapper = mount(Modal, {
    props: { open: true },
    slots: { default: () => h(ModalContent, contentProps, () => h(ModalTitle, null, () => 'Short')) },
    attachTo: document.body,
  });
  await nextTick();
  await expect.poll(() => document.querySelector('[role=dialog]') !== null).toBe(true);
  return document.querySelector<HTMLElement>('[role=dialog]')!;
}

it('widens the panel to its max width even when the content is short', async () => {
  const panel = await openPanel({ class: 'max-w-2xl' });
  const expected = Math.min(672, window.innerWidth - 32);
  expect(Math.round(panel.getBoundingClientRect().width)).toBe(expected);
});

it('centers the panel horizontally in the window', async () => {
  const panel = await openPanel({});
  const box = panel.getBoundingClientRect();
  expect(Math.abs(box.left - (window.innerWidth - box.right))).toBeLessThanOrEqual(1);
});
