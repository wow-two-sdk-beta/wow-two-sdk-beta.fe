import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { SignatureInput } from '@src/presentation/forms';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number): void {
  const box = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      button: 0,
      clientX: box.left + x,
      clientY: box.top + y,
    }),
  );
}

it('inks a bitmap sized to the device pixel ratio and exports PNG', async () => {
  wrapper = mount(SignatureInput, {
    props: { format: 'png', penColor: 'rgb(0, 0, 128)', penWidth: 4 },
    attrs: { style: 'width: 320px' },
    attachTo: document.body,
  });
  await nextTick();
  const canvas = wrapper.get('canvas').element as HTMLCanvasElement;
  const box = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  await expect.poll(() => canvas.width).toBe(Math.round(box.width * ratio));
  // The pad is h-40 (160px) inside a 1px border.
  expect(box.height).toBe(158);
  pointer(canvas, 'pointerdown', 20, 20);
  pointer(canvas, 'pointermove', 70, 40);
  pointer(canvas, 'pointermove', 120, 60);
  pointer(canvas, 'pointerup', 120, 60);
  await nextTick();
  const ink = canvas.getContext('2d')!.getImageData(Math.round(70 * ratio), Math.round(40 * ratio), 1, 1).data;
  expect(ink[3]).toBeGreaterThan(0);
  expect(ink[2]).toBeGreaterThan(ink[0]!);
  const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
  expect(String(value)).toMatch(/^data:image\/png;base64,/);
});
