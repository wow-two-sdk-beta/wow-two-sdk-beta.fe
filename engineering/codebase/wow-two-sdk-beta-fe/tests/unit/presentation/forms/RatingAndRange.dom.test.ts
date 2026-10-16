import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { FormControlProvider } from '@src/foundation/primitives';
import { LocaleProvider } from '@src/foundation/i18n';
import { RangeSliderInput, RatingPicker, type RangeSliderValue } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function radios(wrapper: VueWrapper): HTMLInputElement[] {
  return wrapper.findAll('input[type=radio]').map((node) => node.element as HTMLInputElement);
}

function fills(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[data-fill]').map((node) => node.attributes('data-fill')!);
}

/** Checks a radio the way a pointer press does, then reports the change. */
async function choose(radio: HTMLInputElement, detail = 1): Promise<void> {
  const wasChecked = radio.checked;
  radio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
  if (!wasChecked && radio.checked) radio.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
}

function key(target: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('RatingPicker', () => {
  it('names one radio per mark and fills the marks up to the picked rating', async () => {
    const wrapper = track(mount(RatingPicker, { attrs: { 'aria-label': 'Quality' }, attachTo: document.body }));
    expect(wrapper.get('[role=radiogroup]').attributes('aria-label')).toBe('Quality');
    expect(radios(wrapper).map((radio) => radio.getAttribute('aria-label'))).toEqual([
      '1 of 5',
      '2 of 5',
      '3 of 5',
      '4 of 5',
      '5 of 5',
    ]);
    await choose(radios(wrapper)[2]!);
    expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
    expect(fills(wrapper)).toEqual(['full', 'full', 'full', 'empty', 'empty']);
  });

  it('splits every mark into two halves in half steps', async () => {
    const wrapper = track(mount(RatingPicker, { props: { step: 0.5, max: 3 }, attachTo: document.body }));
    expect(radios(wrapper).map((radio) => Number(radio.value))).toEqual([0.5, 1, 1.5, 2, 2.5, 3]);
    await choose(radios(wrapper)[4]!);
    expect(wrapper.emitted('update:modelValue')).toEqual([[2.5]]);
    expect(fills(wrapper)).toEqual(['full', 'full', 'partial']);
  });

  it('clears on a pointer press of the picked rating, on Backspace, and never on a keyboard click', async () => {
    const wrapper = track(mount(RatingPicker, { props: { defaultValue: 4 }, attachTo: document.body }));
    const fourth = radios(wrapper)[3]!;
    expect(fourth.checked).toBe(true);
    await choose(fourth, 0);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await choose(fourth, 1);
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    expect(fills(wrapper)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    await choose(radios(wrapper)[1]!);
    key(radios(wrapper)[1]!, 'Backspace');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
  });

  it('keeps the rating when clearing is turned off', async () => {
    const wrapper = track(
      mount(RatingPicker, { props: { defaultValue: 2, isClearable: false }, attachTo: document.body }),
    );
    await choose(radios(wrapper)[1]!, 1);
    key(radios(wrapper)[1]!, 'Delete');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('previews the rating under a mouse and restores the committed one when the pointer leaves', async () => {
    const wrapper = track(mount(RatingPicker, { props: { defaultValue: 1 }, attachTo: document.body }));
    const labels = wrapper.findAll('label');
    await labels[3]!.trigger('pointermove', { pointerType: 'mouse' });
    expect(fills(wrapper)).toEqual(['full', 'full', 'full', 'full', 'empty']);
    await labels[3]!.trigger('pointermove', { pointerType: 'touch' });
    await wrapper.get('[role=radiogroup]').trigger('pointerleave');
    expect(fills(wrapper)).toEqual(['full', 'empty', 'empty', 'empty', 'empty']);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('renders a read-only rating as one image and keeps its value in the form', () => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h('form', [
              h(FormControlProvider, { isReadOnly: true }, () => h(RatingPicker, { name: 'score', defaultValue: 3 })),
            ]),
        }),
        { attachTo: document.body },
      ),
    );
    const image = wrapper.get('[role=img]');
    expect(image.attributes('aria-label')).toBe('3 of 5');
    expect(radios(wrapper)).toHaveLength(0);
    expect(new FormData(wrapper.get('form').element as HTMLFormElement).get('score')).toBe('3');
  });

  it('blocks a disabled rating and leaves its value out of the form', async () => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () => h('form', [h(RatingPicker, { name: 'score', defaultValue: 2, isDisabled: true })]),
        }),
        { attachTo: document.body },
      ),
    );
    const picker = wrapper.findComponent(RatingPicker);
    expect(radios(wrapper).every((radio) => radio.disabled)).toBe(true);
    radios(wrapper)[4]!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(picker.emitted('update:modelValue')).toBeUndefined();
    expect(new FormData(wrapper.get('form').element as HTMLFormElement).get('score')).toBeNull();
  });

  it('submits the picked rating under its name and restores the seed on form reset', async () => {
    const wrapper = track(
      mount(defineComponent({ render: () => h('form', [h(RatingPicker, { name: 'score', defaultValue: 2 })]) }), {
        attachTo: document.body,
      }),
    );
    const form = wrapper.get('form').element as HTMLFormElement;
    await choose(radios(wrapper)[4]!);
    expect(new FormData(form).get('score')).toBe('5');
    form.reset();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(radios(wrapper).find((radio) => radio.checked)?.value).toBe('2');
  });

  it('keeps max within 1–20 and localizes the value text', () => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'RatingPicker.valueText': '{value} von {max}' } }, () =>
              h(RatingPicker, { max: 40 }),
            ),
        }),
      ),
    );
    expect(radios(wrapper)).toHaveLength(20);
    expect(radios(wrapper)[0]!.getAttribute('aria-label')).toBe('1 von 20');
  });
});

describe('RangeSliderInput', () => {
  function thumbs(wrapper: VueWrapper): HTMLElement[] {
    return wrapper.findAll('[role=slider]').map((node) => node.element as HTMLElement);
  }

  function values(wrapper: VueWrapper): number[] {
    return thumbs(wrapper).map((thumb) => Number(thumb.getAttribute('aria-valuenow')));
  }

  /** Gives the track a 200px box at x = 0 so pointer positions map to values. */
  function sizeTrack(wrapper: VueWrapper): void {
    const trackNode = wrapper.get('[role=group] > div').element as HTMLElement;
    trackNode.getBoundingClientRect = () =>
      ({ left: 0, right: 200, width: 200, top: 0, bottom: 8, height: 8 }) as DOMRect;
  }

  it('names both thumbs and bounds each by the other', () => {
    const wrapper = track(mount(RangeSliderInput, { props: { defaultValue: [20, 60], minDistance: 5 } }));
    const [start, end] = thumbs(wrapper);
    expect(start!.getAttribute('aria-label')).toBe('Minimum');
    expect(end!.getAttribute('aria-label')).toBe('Maximum');
    expect(start!.getAttribute('aria-valuemax')).toBe('55');
    expect(end!.getAttribute('aria-valuemin')).toBe('25');
    expect(values(wrapper)).toEqual([20, 60]);
  });

  it('steps a thumb with the arrows, pages and edges, and reports each settled range', async () => {
    const wrapper = track(mount(RangeSliderInput, { props: { defaultValue: [10, 50], minDistance: 10 } }));
    const [start, end] = thumbs(wrapper);
    key(start!, 'ArrowRight');
    await nextTick();
    key(start!, 'PageUp');
    await nextTick();
    expect(values(wrapper)).toEqual([21, 50]);
    key(start!, 'End');
    await nextTick();
    expect(values(wrapper)).toEqual([40, 50]);
    key(end!, 'Home');
    await nextTick();
    expect(values(wrapper)).toEqual([40, 50]);
    key(end!, 'ArrowDown');
    await nextTick();
    expect(values(wrapper)).toEqual([40, 50]);
    expect(wrapper.emitted('update:modelValue')).toEqual([[[11, 50]], [[21, 50]], [[40, 50]]]);
    expect(wrapper.emitted('commit')).toEqual([[[11, 50]], [[21, 50]], [[40, 50]]]);
  });

  it('drags the nearer thumb and commits once when the pointer lifts', async () => {
    const wrapper = track(mount(RangeSliderInput, { attachTo: document.body }));
    sizeTrack(wrapper);
    const root = wrapper.get('[role=group]');
    await root.trigger('pointerdown', { button: 0, clientX: 150, pointerId: 1 });
    expect(document.activeElement).toBe(thumbs(wrapper)[1]);
    await root.trigger('pointermove', { clientX: 190, pointerId: 1 });
    await root.trigger('pointermove', { clientX: 10, pointerId: 1 });
    await root.trigger('pointerup', { clientX: 10, pointerId: 1 });
    expect(values(wrapper)).toEqual([0, 5]);
    expect(wrapper.emitted('update:modelValue')).toEqual([[[0, 75]], [[0, 95]], [[0, 5]]]);
    expect(wrapper.emitted('commit')).toEqual([[[0, 5]]]);
  });

  it('mirrors the pointer and arrow directions right to left', async () => {
    const wrapper = track(mount(RangeSliderInput, { attrs: { style: 'direction: rtl' }, attachTo: document.body }));
    sizeTrack(wrapper);
    await wrapper.get('[role=group]').trigger('pointerdown', { button: 0, clientX: 180, pointerId: 1 });
    await wrapper.get('[role=group]').trigger('pointerup', { pointerId: 1 });
    expect(values(wrapper)).toEqual([10, 100]);
    key(thumbs(wrapper)[0]!, 'ArrowLeft');
    await nextTick();
    expect(values(wrapper)).toEqual([11, 100]);
  });

  it('requests changes without applying them while controlled and commits the requested range', async () => {
    const wrapper = track(mount(RangeSliderInput, { props: { modelValue: [30, 70] as RangeSliderValue } }));
    key(thumbs(wrapper)[1]!, 'ArrowUp');
    await nextTick();
    expect(values(wrapper)).toEqual([30, 70]);
    expect(wrapper.emitted('update:modelValue')).toEqual([[[30, 71]]]);
    expect(wrapper.emitted('commit')).toEqual([[[30, 71]]]);
  });

  it('orders, clamps and snaps a supplied range without floating-point residue', async () => {
    const wrapper = track(
      mount(RangeSliderInput, { props: { min: 0, max: 1, step: 0.1, defaultValue: [0.9, -3] as RangeSliderValue } }),
    );
    expect(values(wrapper)).toEqual([0, 0.9]);
    key(thumbs(wrapper)[0]!, 'ArrowRight');
    await nextTick();
    key(thumbs(wrapper)[0]!, 'ArrowRight');
    await nextTick();
    key(thumbs(wrapper)[0]!, 'ArrowRight');
    await nextTick();
    expect(thumbs(wrapper)[0]!.getAttribute('aria-valuenow')).toBe('0.3');
  });

  it('blocks disabled and read-only edits and submits both ends under one name', async () => {
    const value = ref<'disabled' | 'readonly'>('readonly');
    const wrapper = track(
      mount(
        defineComponent({
          setup: () => () =>
            h('form', [
              h(RangeSliderInput, {
                name: 'price',
                defaultValue: [5, 50],
                isDisabled: value.value === 'disabled',
                isReadOnly: value.value === 'readonly',
              }),
            ]),
        }),
        { attachTo: document.body },
      ),
    );
    const slider = wrapper.findComponent(RangeSliderInput);
    key(thumbs(wrapper)[0]!, 'ArrowRight');
    expect(slider.emitted('update:modelValue')).toBeUndefined();
    expect(new FormData(wrapper.get('form').element as HTMLFormElement).getAll('price')).toEqual(['5', '50']);
    value.value = 'disabled';
    await nextTick();
    expect(thumbs(wrapper).every((thumb) => thumb.tabIndex === -1)).toBe(true);
    expect(new FormData(wrapper.get('form').element as HTMLFormElement).getAll('price')).toEqual([]);
  });

  it('formats thumb value text and takes localized thumb names', () => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'RangeSliderInput.startLabel': 'Von' } }, () =>
              h(RangeSliderInput, { formatValue: (v: number) => `$${v}` }),
            ),
        }),
      ),
    );
    const [start, end] = wrapper.findAll('[role=slider]');
    expect(start!.attributes('aria-label')).toBe('Von');
    expect(end!.attributes('aria-label')).toBe('Maximum');
    expect(end!.attributes('aria-valuetext')).toBe('$100');
  });
});
