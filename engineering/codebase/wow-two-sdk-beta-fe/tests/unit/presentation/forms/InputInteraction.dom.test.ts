import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { CodeEditor, MaskedInput, TagsInput, TextInput } from '@src/presentation/forms';

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

describe('input ownership and composition', () => {
  it('reports controlled edits without re-emitting external updates', async () => {
    const wrapper = mount(TextInput, { props: { modelValue: 'saved' } });
    mounted.push(wrapper);
    await wrapper.get('input').setValue('edited');
    expect(wrapper.emitted('update:modelValue')).toEqual([['edited']]);
    await wrapper.setProps({ modelValue: 'external' });
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('external');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
  });

  it('does not mask an unfinished IME composition', async () => {
    const wrapper = mount(MaskedInput, { props: { mask: '###-###' } });
    mounted.push(wrapper);
    const input = wrapper.get('input').element as HTMLInputElement;
    input.value = '123456';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(input.value).toBe('123456');
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['123-456']]);
  });

  it('does not tokenize composing Enter and lets Tab leave after committing a tag', async () => {
    const wrapper = mount(TagsInput);
    mounted.push(wrapper);
    const input = wrapper.get('input');
    await input.setValue('hello');
    const composing = new KeyboardEvent('keydown', {
      key: 'Enter',
      isComposing: true,
      cancelable: true,
      bubbles: true,
    });
    input.element.dispatchEvent(composing);
    await nextTick();
    expect(composing.defaultPrevented).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    input.element.dispatchEvent(tab);
    await nextTick();
    expect(tab.defaultPrevented).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toEqual([[['hello']]]);
  });
});

describe('CodeEditor keyboard exit', () => {
  it('advertises and honors Escape then Tab without changing the source', async () => {
    const wrapper = mount(CodeEditor, { props: { defaultValue: 'source' } });
    mounted.push(wrapper);
    const input = wrapper.get('textarea');
    expect(wrapper.text()).toContain('Escape, then Tab');
    const hint = wrapper.get('p');
    expect(input.attributes('aria-describedby')).toContain(hint.attributes('id'));
    await input.trigger('keydown', { key: 'Escape' });
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    input.element.dispatchEvent(tab);
    await nextTick();
    expect(tab.defaultPrevented).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it.each(['Alt', 'Shift', 'Control', 'Meta'])('keeps Escape exit armed across the %s modifier', async (key) => {
    const wrapper = mount(CodeEditor, { props: { defaultValue: 'value' } });
    try {
      const input = wrapper.get('textarea');
      await input.trigger('keydown', { key: 'Escape' });
      await input.trigger('keydown', { key });
      const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
      input.element.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('leaves Tab native when indentation is disabled', async () => {
    const wrapper = mount(CodeEditor, { props: { canIndentOnTab: false } });
    mounted.push(wrapper);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    wrapper.get('textarea').element.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(wrapper.find('p').exists()).toBe(false);
  });
});
