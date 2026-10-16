import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { MentionInput, type MentionOption } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

const people: ReadonlyArray<MentionOption> = [
  { value: 'ada', label: 'Ada Lovelace', description: 'Analyst' },
  { value: 'alan', label: 'Alan Turing' },
  { value: 'grace', label: 'Grace Hopper' },
];

function mountMention(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(MentionInput, {
    props: { options: people, ...props },
    attrs: { 'aria-label': 'Comment' },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function field(wrapper: VueWrapper): HTMLTextAreaElement {
  return wrapper.get('textarea').element as HTMLTextAreaElement;
}

/** Types text with the caret at its end, the way a reader would. */
async function type(wrapper: VueWrapper, text: string): Promise<void> {
  const element = field(wrapper);
  element.value = text;
  element.setSelectionRange(text.length, text.length);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
}

async function press(wrapper: VueWrapper, key: string): Promise<void> {
  field(wrapper).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await nextTick();
}

function listed(): string[] {
  return [...document.querySelectorAll('[role=option]')].map(
    (option) => option.querySelector('.truncate')?.textContent?.trim() ?? '',
  );
}

describe('MentionInput', () => {
  it('suggests matches after the trigger and inserts the highlighted one', async () => {
    const wrapper = mountMention();
    await type(wrapper, 'Hi @a');
    expect(listed()).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper']);
    const list = document.querySelector('[role=listbox]')!;
    expect(field(wrapper).getAttribute('aria-controls')).toBe(list.id);
    expect(field(wrapper).getAttribute('aria-activedescendant')).toBe(list.querySelector('[role=option]')!.id);
    expect(wrapper.get('[aria-live]').text()).toBe('3 suggestions');
    await press(wrapper, 'ArrowDown');
    expect(document.querySelectorAll('[role=option]')[1]!.getAttribute('aria-selected')).toBe('true');
    await press(wrapper, 'Enter');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Hi @Alan Turing ']);
    expect(wrapper.emitted('mention')).toEqual([[people[1]]]);
    expect(document.querySelector('[role=listbox]')).toBeNull();
    expect(field(wrapper).selectionStart).toBe('Hi @Alan Turing '.length);
  });

  it('ignores a trigger inside a word and closes at whitespace', async () => {
    const wrapper = mountMention();
    await type(wrapper, 'mail@a');
    expect(document.querySelector('[role=listbox]')).toBeNull();
    await type(wrapper, 'Hi @al');
    expect(listed()).toEqual(['Alan Turing']);
    await type(wrapper, 'Hi @al ');
    expect(document.querySelector('[role=listbox]')).toBeNull();
    expect(field(wrapper).hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('reports each query, and Escape dismisses until a new mention starts', async () => {
    const wrapper = mountMention();
    await type(wrapper, '@g');
    await type(wrapper, '@gr');
    expect(wrapper.emitted('search')).toEqual([['g'], ['gr']]);
    await press(wrapper, 'Escape');
    expect(document.querySelector('[role=listbox]')).toBeNull();
    await type(wrapper, '@gra');
    expect(document.querySelector('[role=listbox]')).toBeNull();
    await type(wrapper, '@gra @a');
    expect(listed()).toHaveLength(3);
  });

  it('inserts a clicked suggestion with a custom format and stays quiet while read-only', async () => {
    const wrapper = mountMention({ format: (option: MentionOption) => `[${option.value}]` });
    await type(wrapper, 'cc @gr');
    (document.querySelector('[role=option]') as HTMLElement).click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['cc [grace] ']);
    const locked = mountMention({ isReadOnly: true, name: 'comment', defaultValue: 'Hi' });
    expect(field(locked).name).toBe('comment');
    await type(locked, 'Hi @a');
    expect(document.querySelectorAll('[role=listbox]')).toHaveLength(0);
  });
});
