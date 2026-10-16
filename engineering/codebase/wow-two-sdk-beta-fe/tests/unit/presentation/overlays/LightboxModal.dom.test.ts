import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { LightboxModal, type LightboxImage } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const pixel = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const photos: ReadonlyArray<LightboxImage> = [
  { src: `${pixel}#harbour`, alt: 'Harbour at dawn', caption: 'Dawn over the harbour' },
  { src: `${pixel}#market`, alt: 'Market street' },
  { src: `${pixel}#bridge`, alt: 'Old bridge' },
];

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountLightbox(props: Record<string, unknown> = {}): VueWrapper {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(LightboxModal, {
    props: { images: photos, ...props },
    slots: {
      default: ({ openAt }: { openAt: (index: number) => void }) =>
        photos.map((photo, index) => h('button', { 'data-thumb': index, onClick: () => openAt(index) }, photo.alt)),
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=dialog]');
}

function shownAlt(): string | null | undefined {
  return dialog()?.querySelector('figure img')?.getAttribute('alt');
}

function stepButton(label: string): HTMLButtonElement {
  return dialog()!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
}

async function press(key: string): Promise<void> {
  dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle();
}

async function swipe(from: number, to: number, pointerType = 'touch'): Promise<void> {
  const figure = dialog()!.querySelector('figure')!;
  figure.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3, pointerType, clientX: from }));
  figure.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3, pointerType, clientX: to }));
  await settle();
}

describe('LightboxModal', () => {
  it('opens on a thumbnail, names the dialog and announces the image', async () => {
    const wrapper = mountLightbox();
    await wrapper.get('[data-thumb="1"]').trigger('click');
    await settle();
    const titleId = dialog()!.getAttribute('aria-labelledby')!;
    expect(document.getElementById(titleId)?.textContent?.trim()).toBe('Image viewer');
    expect(shownAlt()).toBe('Market street');
    expect(dialog()!.querySelector('[data-counter]')?.textContent?.trim()).toBe('2 of 3');
    expect(dialog()!.querySelector('[aria-live]')?.textContent?.trim()).toBe('2 of 3: Market street');
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(wrapper.emitted('update:index')).toEqual([[1]]);
  });

  it('steps by buttons, arrows, Home and End, wrapping while looping', async () => {
    mountLightbox({ defaultOpen: true });
    await settle();
    expect(dialog()!.querySelector('figcaption')?.textContent).toBe('Dawn over the harbour');
    stepButton('Next image').click();
    await settle();
    expect(shownAlt()).toBe('Market street');
    await press('ArrowRight');
    expect(shownAlt()).toBe('Old bridge');
    await press('ArrowRight');
    expect(shownAlt()).toBe('Harbour at dawn');
    stepButton('Previous image').click();
    await settle();
    expect(shownAlt()).toBe('Old bridge');
    await press('Home');
    expect(shownAlt()).toBe('Harbour at dawn');
    await press('End');
    expect(shownAlt()).toBe('Old bridge');
  });

  it('holds at the ends without looping and steps on a touch swipe only', async () => {
    const wrapper = mountLightbox({ defaultOpen: true, isLooping: false });
    await settle();
    expect(stepButton('Previous image').disabled).toBe(true);
    await swipe(200, 100);
    expect(shownAlt()).toBe('Market street');
    await swipe(100, 220);
    expect(shownAlt()).toBe('Harbour at dawn');
    await swipe(200, 100, 'mouse');
    expect(shownAlt()).toBe('Harbour at dawn');
    await press('ArrowLeft');
    expect(wrapper.emitted('update:index')).toEqual([[1], [0]]);
  });

  it('closes on Escape and drops the counter and steps for one image', async () => {
    const wrapper = mountLightbox({ defaultOpen: true, images: photos.slice(0, 1) });
    await settle();
    expect(dialog()!.querySelector('[data-counter]')).toBeNull();
    expect(dialog()!.querySelectorAll('figure button')).toHaveLength(0);
    expect(dialog()!.querySelector('[aria-live]')?.textContent?.trim()).toBe('Harbour at dawn');
    await press('Escape');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});
