import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { page } from 'vitest/browser';
import {
  AlertModal,
  AlertModalAction,
  AlertModalCancel,
  AlertModalContent,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@src/presentation/overlays';
import '@src/index.css';

const Phone = { width: 375, height: 812 } as const;

let wrapper: VueWrapper | null = null;
let opened: boolean[] = [];

beforeAll(async () => {
  await page.viewport(Phone.width, Phone.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  opened = [];
  document.body.innerHTML = '';
});

const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.ui-modal-content');

async function open(root: Component, content: Component, contentProps: Record<string, unknown>): Promise<HTMLElement> {
  wrapper = mount(root, {
    props: { open: true, 'onUpdate:open': (value: boolean) => opened.push(value) },
    slots: {
      default: () =>
        h(content, contentProps, () => [
          h(ModalHeader, null, () => h(ModalTitle, null, () => 'Rename product')),
          h(ModalBody, { class: 'body' }, () => h('p', { style: 'height: 2000px' }, 'Long form')),
          h(ModalFooter, { class: 'footer' }, () => h('button', { type: 'button' }, 'Save')),
        ]),
    },
    attachTo: document.body,
  });
  await nextTick();
  await expect.poll(() => panel() !== null).toBe(true);
  /* Let the rise settle so geometry reads the resting box; WebKit keeps a filled animation listed once finished. */
  await expect
    .poll(() =>
      panel()!
        .getAnimations()
        .every((a) => a.playState === 'finished'),
    )
    .toBe(true);
  return panel()!;
}

function box(element: Element): { left: number; top: number; right: number; bottom: number } {
  const rect = element.getBoundingClientRect();
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  };
}

function pointer(target: Element, type: string, clientY: number): void {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, button: 0, clientX: 180, clientY }),
  );
}

describe('form dialog on a phone', () => {
  it('fills the screen with the body scrolling and the footer pinned to the bottom', async () => {
    const element = await open(Modal, ModalContent, {});
    expect(box(element)).toEqual({ left: 0, top: 0, right: Phone.width, bottom: Phone.height });
    expect(getComputedStyle(element).animationName).toBe('sheet-in');
    expect(getComputedStyle(element).borderTopLeftRadius).toBe('0px');
    const body = element.querySelector<HTMLElement>('.body')!;
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const footer = box(element.querySelector('.footer')!);
    const paddingBottom = Math.round(parseFloat(getComputedStyle(element).paddingBottom));
    expect(footer.bottom).toBe(Phone.height - paddingBottom);
  });

  it('pins the footer through a form that wraps the parts', async () => {
    wrapper = mount(Modal, {
      props: { open: true },
      slots: {
        default: () =>
          h(ModalContent, null, () =>
            h('form', null, [
              h(ModalHeader, null, () => h(ModalTitle, null, () => 'New namespace')),
              h(ModalBody, null, () => 'Short'),
              h(ModalFooter, { class: 'footer' }, () => h('button', { type: 'submit' }, 'Create')),
            ]),
          ),
      },
      attachTo: document.body,
    });
    await expect.poll(() => panel() !== null).toBe(true);
    await expect
      .poll(() =>
        panel()!
          .getAnimations()
          .every((a) => a.playState === 'finished'),
      )
      .toBe(true);
    const paddingBottom = Math.round(parseFloat(getComputedStyle(panel()!).paddingBottom));
    expect(box(panel()!.querySelector('.footer')!).bottom).toBe(Phone.height - paddingBottom);
  });

  it('keeps the centred card when asked', async () => {
    const element = await open(Modal, ModalContent, { phoneLayout: 'card' });
    const rect = box(element);
    expect(rect.right - rect.left).toBe(Phone.width - 32);
    expect(rect.top).toBeGreaterThanOrEqual(16);
  });
});

describe('confirmation on a phone', () => {
  it('docks an alert dialog to the bottom edge with a rounded top', async () => {
    wrapper = mount(AlertModal, {
      props: { open: true },
      slots: {
        default: () =>
          h(AlertModalContent, null, () => [
            h(ModalHeader, null, () => h(ModalTitle, null, () => 'Delete product?')),
            h(ModalFooter, null, () => [
              h(AlertModalCancel, null, () => 'Cancel'),
              h(AlertModalAction, null, () => 'Delete'),
            ]),
          ]),
      },
      attachTo: document.body,
    });
    await expect.poll(() => panel() !== null).toBe(true);
    await expect
      .poll(() =>
        panel()!
          .getAnimations()
          .every((a) => a.playState === 'finished'),
      )
      .toBe(true);
    const rect = box(panel()!);
    expect(rect.left).toBe(0);
    expect(rect.right).toBe(Phone.width);
    expect(rect.bottom).toBe(Phone.height);
    expect(rect.top).toBeGreaterThan(Phone.height / 2);
    expect(parseFloat(getComputedStyle(panel()!).borderTopLeftRadius)).toBeGreaterThan(0);
    expect(getComputedStyle(panel()!).borderBottomLeftRadius).toBe('0px');
    expect(panel()!.getAttribute('role')).toBe('alertdialog');
  });

  it('dismisses a sheet dragged down by its handle', async () => {
    const element = await open(Modal, ModalContent, { phoneLayout: 'sheet', showHandle: true });
    const handle = element.querySelector('[data-modal-handle]')!;
    const top = box(handle).top;
    pointer(handle, 'pointerdown', top + 4);
    pointer(handle, 'pointermove', top + 60);
    await expect.poll(() => element.style.transform).toBe('translateY(56px)');
    pointer(handle, 'pointermove', top + 204);
    pointer(handle, 'pointerup', top + 204);
    await expect.poll(() => opened).toEqual([false]);
  });

  it('springs an alert sheet back instead of dismissing it', async () => {
    const element = await open(AlertModal, AlertModalContent, { showHandle: true });
    const handle = element.querySelector('[data-modal-handle]')!;
    const top = box(handle).top;
    pointer(handle, 'pointerdown', top + 4);
    pointer(handle, 'pointermove', top + 304);
    await expect.poll(() => element.style.transform).toBe('translateY(300px)');
    pointer(handle, 'pointerup', top + 304);
    await expect.poll(() => element.style.transform).toBe('');
    expect(opened).toEqual([]);
  });
});

describe('dialogs from sm up', () => {
  beforeAll(async () => {
    await page.viewport(1024, 768);
  });

  afterAll(async () => {
    await page.viewport(Phone.width, Phone.height);
  });

  it('centres the card whatever the phone layout', async () => {
    for (const [root, content] of [
      [Modal, ModalContent],
      [AlertModal, AlertModalContent],
    ] as const) {
      const element = await open(root, content, {});
      const rect = box(element);
      expect(rect.right - rect.left).toBe(512);
      expect(Math.abs(rect.left - (1024 - rect.right))).toBeLessThanOrEqual(1);
      expect(rect.top).toBeGreaterThanOrEqual(16);
      expect(getComputedStyle(element).animationName).toBe('pop-in');
      wrapper?.unmount();
      wrapper = null;
      document.body.innerHTML = '';
    }
  });
});
