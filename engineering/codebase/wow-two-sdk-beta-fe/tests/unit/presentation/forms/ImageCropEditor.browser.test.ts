import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { ImageCropEditor } from '@src/presentation/forms';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** A 200 × 100 image: red on the left half, blue on the right. */
function halves(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgb(255, 0, 0)';
  context.fillRect(0, 0, 100, 100);
  context.fillStyle = 'rgb(0, 0, 255)';
  context.fillRect(100, 0, 100, 100);
  return canvas.toDataURL('image/png');
}

async function decode(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

it('drags a square crop onto the blue half and renders exactly those pixels', async () => {
  wrapper = mount(ImageCropEditor, {
    props: { src: halves(), aspectRatio: 1 },
    attrs: { style: 'width: 400px' },
    attachTo: document.body,
  });
  const image = wrapper.get('img').element as HTMLImageElement;
  await expect.poll(() => image.complete && image.naturalWidth).toBe(200);
  await nextTick();
  const box = wrapper.get('[data-crop-box]').element as HTMLElement;
  await expect.poll(() => Math.round(box.getBoundingClientRect().width)).toBeGreaterThan(0);
  const start = box.getBoundingClientRect();
  const scale = 200 / image.getBoundingClientRect().width;
  const send = (type: string, x: number): void => {
    box.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 9,
        button: 0,
        clientX: x,
        clientY: start.top + 5,
      }),
    );
  };
  send('pointerdown', start.left + 5);
  send('pointermove', start.left + 5 + 60 / scale);
  send('pointerup', start.left + 5 + 60 / scale);
  await nextTick();
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ x: 100, y: 0, width: 100, height: 100 });
  const cropped = await decode((wrapper.vm as unknown as { toDataURL: () => string }).toDataURL());
  expect([cropped.naturalWidth, cropped.naturalHeight]).toEqual([100, 100]);
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.drawImage(cropped, 0, 0);
  expect([...probe.getImageData(50, 50, 1, 1).data]).toEqual([0, 0, 255, 255]);
});

it('keeps its size inside a shrink-wrapping parent and lays the crop over the rendered image', async () => {
  const host = document.createElement('div');
  host.style.cssText = 'display: flex; flex-direction: column; align-items: flex-start; width: 480px';
  document.body.append(host);
  const svg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640"><rect width="960" height="640"/></svg>',
  );
  wrapper = mount(ImageCropEditor, {
    props: { src: `data:image/svg+xml;charset=utf-8,${svg}`, maxHeight: '200px' },
    attachTo: host,
  });
  const image = wrapper.get('img').element as HTMLImageElement;
  await expect.poll(() => image.getBoundingClientRect().width).toBeGreaterThan(100);
  // The crop box is placed once the image has loaded, which WebKit reports after it lays the image out.
  const box = wrapper.get('[data-crop-box]').element as HTMLElement;
  await expect.poll(() => Math.round(box.getBoundingClientRect().width)).toBeGreaterThan(0);
  const imageBox = image.getBoundingClientRect();
  const crop = box.getBoundingClientRect();
  // The default free crop is the middle 80% of the rendered image.
  expect(crop.width).toBeCloseTo(imageBox.width * 0.8, 0);
  expect(crop.left).toBeCloseTo(imageBox.left + imageBox.width * 0.1, 0);
  expect(crop.top).toBeCloseTo(imageBox.top + imageBox.height * 0.1, 0);
});
