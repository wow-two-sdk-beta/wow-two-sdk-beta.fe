import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import {
  ChatComposerInput,
  ColorSwatchPicker,
  EditableInput,
  EditableInputCancel,
  EditableInputInput,
  EditableInputPreview,
  EditableInputSubmit,
} from '@src/presentation/forms';
import { ProgressBar } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

describe('EditableInput', () => {
  function mountEditable(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(EditableInput, {
      props: { defaultValue: 'Draft title', ...props },
      slots: {
        default: () => [
          h(EditableInputPreview),
          h(EditableInputInput),
          h(EditableInputSubmit, () => 'Save'),
          h(EditableInputCancel, () => 'Cancel'),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function input(): HTMLInputElement | null {
    return document.querySelector<HTMLInputElement>('input:not([type=hidden])');
  }

  async function startEditing(wrapper: VueWrapper): Promise<void> {
    await wrapper.get('[data-part=preview], [role=button], button').trigger('click');
    await settle();
  }

  it('commits the draft with Enter and leaves edit mode', async () => {
    const wrapper = mountEditable();
    expect(wrapper.text()).toContain('Draft title');
    await startEditing(wrapper);
    expect(wrapper.emitted('update:editing')?.[0]).toEqual([true]);
    const field = input()!;
    field.value = 'Final title';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('update:modelValue')).toEqual([['Final title']]);
    expect(wrapper.text()).toContain('Final title');
  });

  it('discards the draft with Escape', async () => {
    const wrapper = mountEditable();
    await startEditing(wrapper);
    const field = input()!;
    field.value = 'Thrown away';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.text()).toContain('Draft title');
  });
});

describe('ChatComposerInput', () => {
  function mountComposer(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(ChatComposerInput, { props, attachTo: document.body });
    wrappers.push(wrapper);
    return wrapper;
  }

  function type(wrapper: VueWrapper, text: string): HTMLTextAreaElement {
    const area = wrapper.get<HTMLTextAreaElement>('textarea').element;
    area.value = text;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    return area;
  }

  it('sends the trimmed message on Enter and keeps Shift+Enter for a new line', async () => {
    const wrapper = mountComposer();
    const area = type(wrapper, '  hello there  ');
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('submit')).toBeUndefined();
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('submit')).toEqual([['hello there']]);
  });

  it('never sends an empty message and locks while disabled', async () => {
    const wrapper = mountComposer();
    const area = type(wrapper, '   ');
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('submit')).toBeUndefined();
    const locked = mountComposer({ isDisabled: true });
    expect(locked.get<HTMLTextAreaElement>('textarea').element.disabled).toBe(true);
  });
});

describe('ColorSwatchPicker', () => {
  it('reports the picked swatch and marks it selected', async () => {
    const wrapper = mount(ColorSwatchPicker, {
      props: { colors: ['#ff0000', '#00ff00', '#0000ff'], 'aria-label': 'Colour' },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    const swatches = wrapper.findAll('[role=radio], button');
    expect(swatches.length).toBeGreaterThanOrEqual(3);
    await swatches[1]!.trigger('click');
    await settle();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['#00ff00']);
  });
});

describe('ProgressBar', () => {
  it('exposes determinate and indeterminate progress to assistive tech', () => {
    const determinate = mount(ProgressBar, { props: { value: 42, label: 'Upload' } });
    wrappers.push(determinate);
    const bar = determinate.get('[role=progressbar]');
    expect(bar.attributes('aria-valuenow')).toBe('42');
    expect(bar.attributes('aria-valuemax')).toBe('100');
    expect(bar.attributes('aria-label')).toBe('Upload');
    const indeterminate = mount(ProgressBar, { props: { label: 'Loading' } });
    wrappers.push(indeterminate);
    expect(indeterminate.get('[role=progressbar]').attributes('aria-valuenow')).toBeUndefined();
  });
});
