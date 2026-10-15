import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick, type Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AlertModal, AlertModalContent, Modal, ModalContent, ModalPhoneLayout } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

async function openPanel(root: Component, content: Component, props: Record<string, unknown>): Promise<HTMLElement> {
  const wrapper = mount(root, {
    props: { open: true },
    slots: { default: () => h(content, props, () => 'Body') },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await nextTick();
  return document.querySelector<HTMLElement>('.ui-modal-content')!;
}

describe('modal phone layout', () => {
  it('fills the screen below sm by default', async () => {
    const panel = await openPanel(Modal, ModalContent, {});
    expect(panel.dataset.phoneLayout).toBe(ModalPhoneLayout.Fullscreen);
    expect(document.querySelector<HTMLElement>('.ui-modal-layer')!.dataset.phoneLayout).toBe('fullscreen');
    expect(panel.className).toContain('max-sm:h-dvh');
    expect(panel.className).toContain('max-sm:rounded-none');
  });

  it('opens an alert dialog as a sheet below sm by default', async () => {
    const panel = await openPanel(AlertModal, AlertModalContent, {});
    expect(panel.dataset.phoneLayout).toBe(ModalPhoneLayout.Sheet);
    expect(panel.className).toContain('max-sm:rounded-t-2xl');
    expect(document.querySelector('.ui-modal-layer')!.className).toContain('max-sm:items-end');
  });

  it('keeps the card on every screen when asked', async () => {
    const panel = await openPanel(AlertModal, AlertModalContent, { phoneLayout: ModalPhoneLayout.Card });
    expect(panel.dataset.phoneLayout).toBe('card');
    expect(panel.className).not.toContain('max-sm:');
    expect(document.querySelector('.ui-modal-layer')!.className).not.toContain('max-sm:');
  });

  it('keeps every animation behind the reduced-motion guard', async () => {
    for (const phoneLayout of Object.values(ModalPhoneLayout)) {
      const panel = await openPanel(Modal, ModalContent, { phoneLayout });
      const animations = panel.className.split(/\s+/).filter((name) => name.includes('animate-'));
      expect(animations.length).toBeGreaterThan(0);
      expect(animations.every((name) => name.includes('motion-safe:'))).toBe(true);
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    }
  });

  it('reserves the safe areas only for the phone layouts that reach the edges', async () => {
    const spacers = async (phoneLayout: ModalPhoneLayout): Promise<string[]> => {
      const panel = await openPanel(Modal, ModalContent, { phoneLayout });
      const found = [...panel.querySelectorAll<HTMLElement>('[aria-hidden="true"]')]
        .map((node) => node.className)
        .filter((name) => name.includes('safe-area'));
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      return found;
    };
    expect(await spacers(ModalPhoneLayout.Fullscreen)).toHaveLength(2);
    expect(await spacers(ModalPhoneLayout.Sheet)).toHaveLength(1);
    expect(await spacers(ModalPhoneLayout.Card)).toHaveLength(0);
  });

  it('draws the grab handle only on a sheet that asks for it', async () => {
    const handle = async (props: Record<string, unknown>): Promise<boolean> => {
      const panel = await openPanel(Modal, ModalContent, props);
      const found = panel.querySelector('[data-modal-handle]');
      wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
      return found !== null && found.getAttribute('aria-hidden') === 'true';
    };
    expect(await handle({ phoneLayout: 'sheet', showHandle: true })).toBe(true);
    expect(await handle({ phoneLayout: 'sheet' })).toBe(false);
    expect(await handle({ showHandle: true })).toBe(false);
  });

  it('lets a caller width serve the card while the phone layout still fills the screen', async () => {
    const panel = await openPanel(Modal, ModalContent, { class: 'max-w-md' });
    expect(panel.className).toContain('max-w-md');
    expect(panel.className).toContain('max-sm:max-w-none');
  });
});
