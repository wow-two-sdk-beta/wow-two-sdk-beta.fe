import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { h, nextTick, type VNode } from 'vue';
import { EmailInput, Field, LabeledField, PasswordInput, PhoneInput, TextInput } from '@src/presentation/forms';
import { mountHost, unmountAfterEach } from '../../../support/ReadOnlyHarness';

/*
 * Focusing a field must not move anything. The control's own focus look is a box-shadow ring over a constant border;
 * and a password manager (NordPass and others) adds its icon element beside a focused input, which must open no gap
 * in the field's block. The card is centred in a tall column, as on the hosted sign-in page, so a 1px growth anywhere
 * would also move every box.
 */

unmountAfterEach();

const controls: ReadonlyArray<readonly [string, () => VNode]> = [
  ['text', () => h(TextInput, { 'data-probe': 'text' })],
  ['email', () => h(EmailInput, { 'data-probe': 'email' })],
  ['password', () => h(PasswordInput, { 'data-probe': 'password' })],
  ['phone', () => h(PhoneInput, { 'data-probe': 'phone', class: 'w-full', countries: ['UZ', 'KZ'] })],
];

async function mountCard(): Promise<HTMLElement> {
  return mountHost(() =>
    h(
      'main',
      { style: 'width: 420px; min-height: 640px; display: flex; flex-direction: column; justify-content: center' },
      [
        h('div', { class: 'flex flex-col gap-4 p-6', 'data-probe': 'card' }, [
          ...controls.map(([name, make]) =>
            h(Field, { label: name, helper: 'Helper', 'data-probe': `field-${name}` }, make),
          ),
          h(LabeledField, { label: 'labeled', 'data-probe': 'field-labeled' }, () =>
            h(TextInput, { 'data-probe': 'labeled' }),
          ),
        ]),
      ],
    ),
  );
}

/** Every probed box, rounded to a hundredth of a pixel. */
function boxes(host: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    [...host.querySelectorAll<HTMLElement>('[data-probe]')].map((element) => {
      const r = element.getBoundingClientRect();
      return [element.dataset.probe!, [r.x, r.y, r.width, r.height].map((n) => n.toFixed(2)).join(' ')];
    }),
  );
}

function nationalInput(host: HTMLElement, name: string): HTMLInputElement {
  const root = host.querySelector<HTMLElement>(`[data-probe=${name}]`)!;
  return (root instanceof HTMLInputElement ? root : root.querySelector('input:not([type=hidden])'))!;
}

describe('field focus stability', () => {
  it.each([...controls.map(([name]) => name), 'labeled'])(
    'keeps every box in place when %s takes focus',
    async (name) => {
      const host = await mountCard();
      const before = boxes(host);
      await userEvent.click(nationalInput(host, name));
      await nextTick();
      expect(document.activeElement).toBe(nationalInput(host, name));
      expect(boxes(host)).toEqual(before);
    },
  );

  it.each([...controls.map(([name]) => name), 'labeled'])(
    'keeps every box in place when an extension decorates the focused %s',
    async (name) => {
      const host = await mountCard();
      const input = nationalInput(host, name);
      await userEvent.click(input);
      const before = boxes(host);

      // An in-flow, zero-size icon root beside the input.
      const inFlow = document.createElement('span');
      input.after(inFlow);
      expect(boxes(host)).toEqual(before);
      inFlow.remove();

      // An absolutely positioned icon beside the input.
      const icon = document.createElement('div');
      icon.style.cssText = 'position: absolute; width: 24px; height: 24px';
      input.after(icon);
      expect(boxes(host)).toEqual(before);
      icon.remove();

      // Inline padding on the input itself, reserving room for the icon.
      input.style.paddingRight = '40px';
      expect(boxes(host)).toEqual(before);
    },
  );
});
