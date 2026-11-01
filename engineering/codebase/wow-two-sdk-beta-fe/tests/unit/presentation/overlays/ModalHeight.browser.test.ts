import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref } from 'vue';
import { page } from 'vitest/browser';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from '@src/presentation/overlays';
import '@src/index.css';

/* The card is the layout from `sm` up; the phone's full-screen height is covered in `ModalPhone.browser.test.ts`. */
beforeAll(async () => {
  await page.viewport(1024, 900);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Opens a panel whose body holds `rows` lines; the returned ref adds lines while it is open, as a stream would. */
async function openStreaming(contentProps: Record<string, unknown>) {
  const rows = ref(2);
  wrapper = mount(Modal, {
    props: { open: true },
    slots: {
      default: () =>
        h(ModalContent, contentProps, () => [
          h(ModalHeader, null, () => h(ModalTitle, null, () => 'Deploying updated services')),
          h(ModalBody, { class: 'body' }, () =>
            Array.from({ length: rows.value }, (_, index) => h('p', { style: 'height: 40px' }, `Step ${index + 1}`)),
          ),
          h(ModalFooter, null, () => h('button', { type: 'button' }, 'Close')),
        ]),
    },
    attachTo: document.body,
  });
  await nextTick();
  await expect.poll(() => document.querySelector('[role=dialog]') !== null).toBe(true);
  const panel = document.querySelector<HTMLElement>('[role=dialog]')!;
  const body = document.querySelector<HTMLElement>('.body')!;
  return { rows, panel, body };
}

const height = (element: HTMLElement): number => Math.round(element.getBoundingClientRect().height);

it('holds a fixed panel at its step while its content streams in, and scrolls the body', async () => {
  const { rows, panel, body } = await openStreaming({ size: 'lg', height: 'fixed' });
  const expected = Math.min(640, window.innerHeight - 32);
  expect(height(panel)).toBe(expected);

  rows.value = 40;
  await nextTick();
  expect(height(panel)).toBe(expected);
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
});

it('lets an auto panel grow with its content up to the window', async () => {
  const { rows, panel } = await openStreaming({ size: 'lg' });
  const before = height(panel);
  expect(before).toBeLessThan(640);

  rows.value = 40;
  await nextTick();
  expect(height(panel)).toBeGreaterThan(before);
  expect(height(panel)).toBeLessThanOrEqual(window.innerHeight - 32);
});
