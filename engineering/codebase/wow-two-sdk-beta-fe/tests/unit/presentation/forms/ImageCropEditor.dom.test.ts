import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { ImageCropEditor } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

/** Mounts the editor over an 800 × 600 image rendered at 400 × 300 from (10, 20) — two natural px per px. */
async function mountEditor(props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const wrapper = mount(ImageCropEditor, {
    props: { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', ...props },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  const image = wrapper.get('img').element as HTMLImageElement;
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 800 });
  Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 600 });
  image.getBoundingClientRect = () => ({ left: 10, top: 20, width: 400, height: 300 }) as DOMRect;
  image.dispatchEvent(new Event('load'));
  await nextTick();
  return wrapper;
}

function box(wrapper: VueWrapper): HTMLElement {
  return wrapper.get('[data-crop-box]').element as HTMLElement;
}

function pointer(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 5, button: 0, clientX, clientY }),
  );
}

async function key(wrapper: VueWrapper, init: KeyboardEventInit): Promise<void> {
  box(wrapper).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  await nextTick();
}

function lastCrop(wrapper: VueWrapper): unknown {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0];
}

describe('ImageCropEditor', () => {
  it('frames 80% of the image by default and moves the crop by keyboard', async () => {
    const wrapper = await mountEditor();
    const style = box(wrapper).style;
    expect([style.left, style.top, style.width, style.height]).toEqual(['10%', '10%', '80%', '80%']);
    expect(box(wrapper).getAttribute('aria-label')).toBe('Crop area');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await key(wrapper, { key: 'ArrowRight' });
    expect(lastCrop(wrapper)).toEqual({ x: 82, y: 60, width: 640, height: 480 });
    await key(wrapper, { key: 'ArrowDown', shiftKey: true });
    expect(lastCrop(wrapper)).toEqual({ x: 82, y: 80, width: 640, height: 480 });
    expect(wrapper.get('[aria-live]').text()).toBe('640 × 480 at 82, 80');
    await key(wrapper, { key: 'ArrowLeft', altKey: true });
    expect(lastCrop(wrapper)).toEqual({ x: 82, y: 80, width: 638, height: 480 });
  });

  it('keeps a locked ratio from its centered default through a corner drag', async () => {
    const wrapper = await mountEditor({ aspectRatio: 1 });
    expect(wrapper.findAll('[data-handle]').map((handle) => handle.attributes('data-handle'))).toEqual([
      'nw',
      'ne',
      'sw',
      'se',
    ]);
    const corner = wrapper.get('[data-handle=se]').element;
    pointer(corner, 'pointerdown', 360, 320);
    pointer(corner, 'pointermove', 310, 250);
    await nextTick();
    expect(wrapper.attributes('data-dragging')).toBe('');
    pointer(corner, 'pointerup', 310, 250);
    await nextTick();
    expect(lastCrop(wrapper)).toEqual({ x: 100, y: 0, width: 500, height: 500 });
    expect(wrapper.attributes('data-dragging')).toBeUndefined();
  });

  it('drags the whole crop but never past the image edge', async () => {
    const wrapper = await mountEditor();
    pointer(box(wrapper), 'pointerdown', 210, 170);
    pointer(box(wrapper), 'pointermove', 400, 400);
    pointer(box(wrapper), 'pointerup', 400, 400);
    await nextTick();
    expect(lastCrop(wrapper)).toEqual({ x: 160, y: 120, width: 640, height: 480 });
  });

  it('shows a read-only crop without handles and ignores keys', async () => {
    const wrapper = await mountEditor({ isReadOnly: true, defaultValue: { x: 0, y: 0, width: 400, height: 300 } });
    expect(wrapper.findAll('[data-handle]')).toHaveLength(0);
    expect(box(wrapper).style.width).toBe('50%');
    await key(wrapper, { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
