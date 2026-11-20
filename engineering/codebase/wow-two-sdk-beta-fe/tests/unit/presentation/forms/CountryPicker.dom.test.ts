import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { CountryPicker } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

interface Mounted {
  readonly wrapper: VueWrapper;
  readonly picker: () => VueWrapper;
}

/** Mounts the picker in a locale; `aria-label` names its trigger. */
function mountPicker(props: Record<string, unknown> = {}, locale = 'en'): Mounted {
  const wrapper = mount(LocaleProvider, {
    props: { locale },
    slots: { default: () => h(CountryPicker as Component, { 'aria-label': 'Country', ...props }) },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return { wrapper, picker: () => wrapper.findComponent({ name: 'CountryPicker' }) };
}

const trigger = (): HTMLElement => document.querySelector<HTMLElement>('[role=combobox][aria-label="Country"]')!;

async function open(): Promise<void> {
  trigger().click();
  await settle();
}

async function search(text: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type=search]')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
}

/** The country rows now listed, each as its flag then its name. */
function rows(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[role=option]')]
    .map((row) => row.textContent?.trim() ?? '')
    .filter((text) => /^\p{Regional_Indicator}{2}/u.test(text));
}

/** The rule between the preferred countries and the rest. */
const RuleSelector = '[role=listbox] > div[aria-hidden=true]';

describe('CountryPicker labels', () => {
  it.each([
    ['en', 'Uzbekistan'],
    ['ru', 'Узбекистан'],
    ['uz', 'Oʻzbekiston'],
  ])('writes the picked country in %s before the list ever opens', (locale, name) => {
    mountPicker({ defaultValue: 'UZ' }, locale);
    expect(trigger().textContent).toContain(`🇺🇿 ${name}`);
  });

  it('shows the placeholder with nothing picked', () => {
    mountPicker();
    expect(trigger().textContent).toContain('Select a country');
  });

  it('lists every region in the locale, sorted by its names', async () => {
    mountPicker({}, 'ru');
    await open();
    const names = rows();
    expect(names).toHaveLength(249);
    expect(names).toContain('🇺🇿Узбекистан');
    const plain = names.map((row) => row.replace(/^\p{Regional_Indicator}{2}/u, ''));
    expect(plain).toEqual([...plain].sort((left, right) => left.localeCompare(right, 'ru')));
  });
});

describe('CountryPicker search', () => {
  it('finds a country by its name in the picker language', async () => {
    mountPicker({}, 'ru');
    await open();
    await search('Узбекистан');
    expect(rows()).toEqual(['🇺🇿Узбекистан']);
  });

  it('finds it by its English name while the picker speaks another language', async () => {
    mountPicker({}, 'ru');
    await open();
    await search('uzbekistan');
    expect(rows()).toEqual(['🇺🇿Узбекистан']);
  });

  it('finds it by its code', async () => {
    mountPicker();
    await open();
    await search('uz');
    expect(rows().some((row) => row.endsWith('Uzbekistan'))).toBe(true);
    expect(rows().length).toBeLessThan(20);
  });

  it.each(['O‘zbekiston', 'O’zbekiston', "O'zbekiston", 'Oʻzbekiston', 'ozbekiston'])(
    'finds Oʻzbekiston however the apostrophe is typed: %s',
    async (typed) => {
      mountPicker({}, 'uz');
      await open();
      await search(typed);
      expect(rows()).toEqual(['🇺🇿Oʻzbekiston']);
    },
  );

  it('says when nothing matches', async () => {
    mountPicker();
    await open();
    await search('zzzzzz');
    expect(rows()).toEqual([]);
    expect(document.body.textContent).toContain('No countries found');
  });
});

describe('CountryPicker lists', () => {
  it('lists the preferred countries first, in the order given, with a rule before the rest', async () => {
    mountPicker({ preferred: ['uz', 'KZ', 'KG', 'XX'] });
    await open();
    const names = rows();
    expect(names.slice(0, 3)).toEqual(['🇺🇿Uzbekistan', '🇰🇿Kazakhstan', '🇰🇬Kyrgyzstan']);
    expect(names).toHaveLength(249);
    expect(names.filter((row) => row.endsWith('Uzbekistan'))).toHaveLength(1);
    expect(names[3]).toBe('🇦🇫Afghanistan');
    const rule = document.querySelector(RuleSelector)!;
    expect(rule.previousElementSibling?.textContent).toContain('Kyrgyzstan');
    expect(rule.nextElementSibling?.textContent).toContain('Afghanistan');
  });

  it('drops the rule while a search narrows the list', async () => {
    mountPicker({ preferred: ['UZ'] });
    await open();
    await search('kaz');
    expect(document.querySelector(RuleSelector)).toBeNull();
  });

  it('offers only the countries given, ignoring unknown codes and preferred codes outside them', async () => {
    mountPicker({ countries: ['uz', 'KZ', 'KG', 'nope'], preferred: ['UZ', 'US'] });
    await open();
    expect(rows()).toEqual(['🇺🇿Uzbekistan', '🇰🇿Kazakhstan', '🇰🇬Kyrgyzstan']);
  });

  it('labels a picked code outside the restricted list', () => {
    mountPicker({ countries: ['UZ'], defaultValue: 'FR' });
    expect(trigger().textContent).toContain('🇫🇷 France');
  });
});

describe('CountryPicker model', () => {
  it('emits the uppercase code on a pick', async () => {
    const { picker } = mountPicker({}, 'ru');
    await open();
    await search('Узбекистан');
    document.querySelector<HTMLElement>('[role=option]')!.click();
    await settle();
    expect(picker().emitted('update:modelValue')).toEqual([['UZ']]);
    expect(trigger().textContent).toContain('🇺🇿 Узбекистан');
  });

  it('follows a controlled value', async () => {
    const { wrapper } = mountPicker({ modelValue: 'KZ' });
    expect(trigger().textContent).toContain('Kazakhstan');
    await wrapper.setProps({ locale: 'ru' });
    expect(trigger().textContent).toContain('Казахстан');
  });

  it('emits null when the clear button empties it', async () => {
    const { picker } = mountPicker({ defaultValue: 'UZ', isClearable: true });
    const clear = document.querySelector<HTMLElement>('button[aria-label="Clear selection"]')!;
    clear.click();
    await settle();
    expect(picker().emitted('update:modelValue')).toEqual([[null]]);
    expect(trigger().textContent).toContain('Select a country');
  });

  it('submits the code under its name', () => {
    mountPicker({ defaultValue: 'UZ', name: 'country' });
    expect(document.querySelector<HTMLInputElement>('input[name=country]')?.value).toBe('UZ');
  });

  it('blocks a disabled picker and marks an invalid one', async () => {
    mountPicker({ isDisabled: true, isInvalid: true });
    expect((trigger() as HTMLButtonElement).disabled).toBe(true);
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });

  it('forwards id and aria-describedby to the trigger', () => {
    mountPicker({ id: 'country-field', 'aria-describedby': 'country-help' });
    expect(trigger().id).toBe('country-field');
    expect(trigger().getAttribute('aria-describedby')).toBe('country-help');
  });
});
