import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { SignatureInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

const saved = 'data:image/png;base64,iVBORw0KGgo=';

function mountPad(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(SignatureInput, { props: { penColor: 'navy', ...props }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

/** Sends one pointer event to the pad. */
function pointer(wrapper: VueWrapper, type: string, x: number, y: number): void {
  wrapper
    .get('canvas')
    .element.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: x, clientY: y }),
    );
}

/** Draws a stroke through the given points. */
async function stroke(wrapper: VueWrapper, ...points: ReadonlyArray<readonly [number, number]>): Promise<void> {
  const [first, ...others] = points;
  pointer(wrapper, 'pointerdown', first![0], first![1]);
  for (const [x, y] of others) pointer(wrapper, 'pointermove', x, y);
  const last = points[points.length - 1]!;
  pointer(wrapper, 'pointerup', last[0], last[1]);
  await nextTick();
}

function svgPaths(dataUrl: unknown): string[] {
  const svg = decodeURIComponent(String(dataUrl).replace('data:image/svg+xml;charset=utf-8,', ''));
  return [...svg.matchAll(/<path d="([^"]+)"\/>/g)].map((match) => match[1]!);
}

function lastValue(wrapper: VueWrapper): unknown {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0];
}

function button(wrapper: VueWrapper, text: string): HTMLButtonElement {
  return wrapper.findAll('button').find((node) => node.text() === text)!.element as HTMLButtonElement;
}

describe('SignatureInput', () => {
  it('exports strokes as SVG paths, then undoes and clears them', async () => {
    const wrapper = mountPad();
    expect(wrapper.get('canvas').attributes('aria-label')).toBe('Signature');
    expect(wrapper.text()).toContain('Not signed');
    await stroke(wrapper, [10, 10], [20, 15], [30, 12]);
    await stroke(wrapper, [50, 50]);
    const value = lastValue(wrapper);
    expect(String(value)).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(String(value))).toContain('stroke="navy"');
    expect(svgPaths(value)).toEqual(['M10 10 L20 15 L30 12', 'M50 50 L50 50']);
    expect(wrapper.text()).toContain('Signed');
    button(wrapper, 'Undo').click();
    await nextTick();
    expect(svgPaths(lastValue(wrapper))).toEqual(['M10 10 L20 15 L30 12']);
    button(wrapper, 'Clear').click();
    await nextTick();
    expect(lastValue(wrapper)).toBeNull();
    expect(button(wrapper, 'Undo').disabled).toBe(true);
    expect(button(wrapper, 'Clear').disabled).toBe(true);
  });

  it('shows a saved signature until the reader signs again', async () => {
    const wrapper = mountPad({ defaultValue: saved, name: 'signature' });
    expect(wrapper.get('img[data-saved]').attributes('src')).toBe(saved);
    expect(wrapper.get<HTMLInputElement>('input[name=signature]').element.value).toBe(saved);
    expect(button(wrapper, 'Undo').disabled).toBe(true);
    expect(button(wrapper, 'Clear').disabled).toBe(false);
    pointer(wrapper, 'pointerdown', 5, 5);
    await nextTick();
    expect(wrapper.find('img[data-saved]').exists()).toBe(false);
  });

  it('ignores the pen while read-only and localizes its name', async () => {
    const readOnly = mountPad({ defaultValue: saved, isReadOnly: true });
    await stroke(readOnly, [1, 1], [9, 9]);
    expect(readOnly.emitted('update:modelValue')).toBeUndefined();
    expect(button(readOnly, 'Clear').disabled).toBe(true);
    const localized = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'SignatureInput.label': 'Unterschrift' } }, () => h(SignatureInput)),
      }),
    );
    wrappers.push(localized);
    expect(localized.get('canvas').attributes('aria-label')).toBe('Unterschrift');
  });
});
