import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { PhoneInput, TextInput } from '@src/presentation/forms';
import { nativeTab } from '../../../BrowserKeyboard';
import { mountHost, unmountAfterEach } from '../../../support/ReadOnlyHarness';

/*
 * The phone frame sits in a column of ordinary inputs, so its height must be theirs: the border used to add 2px to its
 * 40px parts. Its focus is one focus: Tab between the country select and the number field stays inside the control.
 */

unmountAfterEach();

const heightOf = (host: HTMLElement, probe: string): number =>
  host.querySelector<HTMLElement>(`[data-probe=${probe}]`)!.getBoundingClientRect().height;

describe('PhoneInput frame', () => {
  it.each([
    ['a country select', ['UZ', 'KZ']],
    ['a fixed prefix', ['UZ']],
  ])('matches the text input height with %s', async (_, countries) => {
    const host = await mountHost(() =>
      h('div', { style: 'width: 360px; display: flex; flex-direction: column; gap: 8px' }, [
        h(TextInput, { 'data-probe': 'text' }),
        h(PhoneInput, { 'data-probe': 'phone', class: 'w-full', countries }),
      ]),
    );

    expect(heightOf(host, 'text')).toBe(40);
    expect(heightOf(host, 'phone')).toBe(40);
  });

  it('fires blur once, when Tab leaves the whole control', async () => {
    const onBlur = vi.fn();
    const host = await mountHost(() =>
      h('div', [
        h('button', { 'data-probe': 'before' }, 'Before'),
        h(PhoneInput, { countries: ['UZ', 'KZ'], onBlur }),
        h('button', { 'data-probe': 'after' }, 'After'),
      ]),
    );
    host.querySelector<HTMLButtonElement>('[data-probe=before]')!.focus();

    await nativeTab();
    expect(document.activeElement?.tagName).toBe('SELECT');
    await nativeTab();
    expect(document.activeElement?.getAttribute('type')).toBe('tel');
    expect(onBlur).not.toHaveBeenCalled();

    await nativeTab();
    expect(document.activeElement).toBe(host.querySelector('[data-probe=after]'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
