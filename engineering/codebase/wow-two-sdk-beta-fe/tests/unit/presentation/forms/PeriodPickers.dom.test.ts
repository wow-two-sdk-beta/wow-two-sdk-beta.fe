import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, type Component } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import { MonthPicker, YearPicker } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Flushes Vue and lets the clock tick, so a freshly rendered cell's listener accepts the next event. */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountPicker(component: Component, props: Record<string, unknown>): VueWrapper {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  const wrapper = mount(component, { props, attrs: { 'aria-label': 'Period' }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

async function open(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[aria-label="Period"]').trigger('click');
  await settle();
}

function cells(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('[role=gridcell]')];
}

function cellByText(text: string): HTMLButtonElement {
  return cells().find((cell) => cell.textContent?.trim() === text)!;
}

function heading(): string | undefined {
  const id = document.querySelector('[role=grid]')?.getAttribute('aria-labelledby');
  return id ? document.getElementById(id)?.textContent?.trim() : undefined;
}

async function press(key: string, init: KeyboardEventInit = {}): Promise<void> {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
  await settle();
}

function emittedMonths(wrapper: VueWrapper): string[] {
  return (wrapper.emitted('update:modelValue') ?? []).map(([month]) => String(month));
}

describe('MonthPicker', () => {
  it('shows the preset month, pages its year and picks a month', async () => {
    const wrapper = mountPicker(MonthPicker, { defaultValue: Temporal.PlainYearMonth.from('2026-09') });
    expect(wrapper.get('[aria-label="Period"]').text()).toBe('September 2026');
    await open(wrapper);
    expect(heading()).toBe('2026');
    expect(cells().map((cell) => cell.textContent?.trim())).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    const september = cellByText('Sep');
    expect(september.getAttribute('aria-selected')).toBe('true');
    expect(september.getAttribute('aria-label')).toBe('September 2026');
    cellByText('Mar').click();
    await settle();
    expect(emittedMonths(wrapper)).toEqual(['2026-03']);
    expect(wrapper.get('[aria-label="Period"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[aria-label="Period"]').text()).toBe('March 2026');
  });

  it('moves across the year edge by arrow and a year by page', async () => {
    const wrapper = mountPicker(MonthPicker, { defaultValue: Temporal.PlainYearMonth.from('2026-12') });
    await open(wrapper);
    cellByText('Dec').focus();
    await press('ArrowRight');
    expect(heading()).toBe('2027');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('January 2027');
    await press('PageUp');
    expect(heading()).toBe('2026');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('January 2026');
    await press('End');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('March 2026');
    await press('Enter');
    expect(emittedMonths(wrapper)).toEqual(['2026-03']);
  });

  it('disables months outside min and max and holds the keyboard at the edge', async () => {
    const wrapper = mountPicker(MonthPicker, {
      defaultValue: Temporal.PlainYearMonth.from('2026-03'),
      min: Temporal.PlainYearMonth.from('2026-03'),
      max: Temporal.PlainYearMonth.from('2026-10'),
    });
    await open(wrapper);
    const disabled = cells()
      .filter((cell) => cell.getAttribute('aria-disabled') === 'true')
      .map((cell) => cell.textContent?.trim());
    expect(disabled).toEqual(['Jan', 'Feb', 'Nov', 'Dec']);
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Previous year"]')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Next year"]')!.disabled).toBe(true);
    cellByText('Mar').focus();
    await press('ArrowLeft');
    expect(document.activeElement?.textContent?.trim()).toBe('Mar');
    cellByText('Jan').click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('submits the ISO month and localizes its placeholder', () => {
    const named = mountPicker(MonthPicker, { defaultValue: Temporal.PlainYearMonth.from('2026-09'), name: 'period' });
    expect(named.get<HTMLInputElement>('input[name=period]').element.value).toBe('2026-09');
    const localized = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'MonthPicker.placeholder': 'Monat wählen' } }, () =>
            h(MonthPicker, { 'aria-label': 'Monat' }),
          ),
      }),
      { attachTo: document.body },
    );
    wrappers.push(localized);
    expect(localized.get('[aria-label="Monat"]').text()).toBe('Monat wählen');
  });
});

describe('YearPicker', () => {
  it('pages a decade framed by its neighbours and turns to an outside pick', async () => {
    const wrapper = mountPicker(YearPicker, { defaultValue: 2026 });
    expect(wrapper.get('[aria-label="Period"]').text()).toBe('2026');
    await open(wrapper);
    expect(heading()).toBe('2020 – 2029');
    const years = cells();
    expect(years.map((cell) => cell.textContent?.trim())).toEqual(
      Array.from({ length: 12 }, (_, offset) => String(2019 + offset)),
    );
    expect([years[0]!, years[11]!].every((cell) => cell.hasAttribute('data-outside'))).toBe(true);
    cellByText('2030').click();
    await settle();
    expect(wrapper.emitted('update:modelValue')).toEqual([[2030]]);
    await open(wrapper);
    expect(heading()).toBe('2030 – 2039');
  });

  it('bounds the decade by min and max and moves a row down across pages', async () => {
    const bounded = mountPicker(YearPicker, { defaultValue: 2024, min: 2021, max: 2027 });
    await open(bounded);
    expect(
      cells()
        .filter((cell) => cell.hasAttribute('data-disabled'))
        .map((cell) => cell.textContent?.trim()),
    ).toEqual(['2019', '2020', '2028', '2029', '2030']);
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Previous decade"]')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Next decade"]')!.disabled).toBe(true);
    bounded.unmount();
    wrappers.splice(0);
    document.body.innerHTML = '';

    const free = mountPicker(YearPicker, { defaultValue: 2028 });
    await open(free);
    cellByText('2028').focus();
    await press('ArrowDown');
    expect(heading()).toBe('2030 – 2039');
    expect(document.activeElement?.textContent?.trim()).toBe('2031');
    await press('PageUp', { shiftKey: true });
    expect(heading()).toBe('1930 – 1939');
  });
});
