import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { userEvent } from 'vitest/browser';
import { MentionInput } from '@src/presentation/forms';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

it('opens the suggestions under the typed trigger and inserts one from the keyboard', async () => {
  wrapper = mount(MentionInput, {
    props: {
      options: [
        { value: 'ada', label: 'Ada Lovelace' },
        { value: 'alan', label: 'Alan Turing' },
      ],
    },
    attrs: { 'aria-label': 'Comment', style: 'width: 420px' },
    attachTo: document.body,
  });
  const textarea = wrapper.get('textarea').element as HTMLTextAreaElement;
  textarea.focus();
  await userEvent.keyboard('Thanks for the review @a');
  const list = (): HTMLElement | null => document.querySelector<HTMLElement>('[role=listbox]');
  await expect.poll(() => list() !== null).toBe(true);
  const field = textarea.getBoundingClientRect();
  const box = list()!.getBoundingClientRect();
  // Anchored under the "@", well right of the field's start and below the first line.
  expect(box.left).toBeGreaterThan(field.left + 100);
  expect(box.top).toBeGreaterThan(field.top + 10);
  expect(box.top).toBeLessThan(field.top + 60);
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await expect.poll(() => textarea.value).toBe('Thanks for the review @Alan Turing ');
  expect(document.activeElement).toBe(textarea);
});
