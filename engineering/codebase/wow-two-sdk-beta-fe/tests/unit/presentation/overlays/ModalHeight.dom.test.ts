import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AlertModal, AlertModalContent, Modal, ModalContent, ModalHeight, ModalSize } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

async function panel(contentProps: Record<string, unknown>): Promise<HTMLElement> {
  const wrapper = mount(Modal, {
    props: { open: true },
    slots: { default: () => h(ModalContent, contentProps, () => 'Body') },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await nextTick();
  return document.querySelector<HTMLElement>('.ui-modal-content')!;
}

/** The card's own height classes; the phone layout's `max-sm:` height is not one. */
const heights = (element: HTMLElement): string[] =>
  element.className.split(/\s+/).filter((name) => name.startsWith('h-'));

describe('modal height', () => {
  it('fits its content by default, under the window cap', async () => {
    const element = await panel({});
    expect(element.dataset['height']).toBe(ModalHeight.Auto);
    expect(heights(element)).toEqual([]);
    expect(element.className).toContain('max-h-[calc(100dvh-2rem)]');
  });

  it.each([
    [ModalSize.Sm, 'h-[min(24rem,calc(100dvh-2rem))]'],
    [ModalSize.Md, 'h-[min(32rem,calc(100dvh-2rem))]'],
    [ModalSize.Lg, 'h-[min(40rem,calc(100dvh-2rem))]'],
    [ModalSize.Xl, 'h-[min(48rem,calc(100dvh-2rem))]'],
    [ModalSize.Full, 'h-[calc(100dvh-2rem)]'],
  ])('holds a fixed %s panel at %s', async (size, expected) => {
    const element = await panel({ size, height: ModalHeight.Fixed });
    expect(element.dataset['height']).toBe(ModalHeight.Fixed);
    expect(heights(element)).toEqual([expected]);
  });

  it('keeps the full-screen phone height over the fixed card height', async () => {
    const element = await panel({ size: ModalSize.Lg, height: ModalHeight.Fixed });
    /* Both stay: `max-sm:` wins below `sm`, the fixed step from `sm` up. */
    expect(element.className).toContain('max-sm:h-dvh');
    expect(element.className).toContain('h-[min(40rem,calc(100dvh-2rem))]');
  });

  it('lets an alert dialog keep fitting its content', async () => {
    const wrapper = mount(AlertModal, {
      props: { open: true },
      slots: { default: () => h(AlertModalContent, { size: 'sm' }, () => 'Delete this key?') },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await nextTick();
    const element = document.querySelector<HTMLElement>('.ui-modal-content')!;
    expect(element.dataset['height']).toBe(ModalHeight.Auto);
    expect(heights(element)).toEqual([]);
  });
});
