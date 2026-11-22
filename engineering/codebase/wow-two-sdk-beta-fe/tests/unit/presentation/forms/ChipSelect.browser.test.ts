import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref, type Ref } from 'vue';
import { page, userEvent } from 'vitest/browser';
import { Calendar, Gem, Hammer, Heart, Landmark, Mic, Star, Store } from 'lucide-vue-next';
import { ChipSelect, type ChipSelectOption } from '@src/presentation/forms';
import { nativeTab } from '../../../BrowserKeyboard';
import '@src/index.css';

beforeAll(async () => {
  document.body.style.margin = '0';
  await page.viewport(1440, 900);
});

afterAll(async () => {
  document.body.style.margin = '';
  await page.viewport(414, 896);
});

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const KindIcons = [Mic, Landmark, Hammer, Store, Calendar, Star, Heart, Gem];

/** Eight kinds, the shape of Ocharo's event-kind filter; the first two have a hint and the last holds nothing. */
function kindOptions(): ChipSelectOption[] {
  return ['Conference', 'Exhibition', 'Workshop', 'Fair', 'Festival', 'Concert', 'Charity', 'Auction'].map(
    (label, at) => ({
      value: label.toLowerCase(),
      label,
      count: at === 7 ? 0 : 20 - at,
      icon: KindIcons[at],
      ...(at < 2 ? { hint: { description: `About ${label.toLowerCase()} events.` } } : {}),
    }),
  );
}

const everyKind = ['conference', 'exhibition', 'workshop', 'fair', 'festival', 'concert', 'charity', 'auction'];

/** Mounts the select in a frame `width` px wide, its value behind real `v-model` state. */
function mountSelect(
  width: number | string,
  chosen: ReadonlyArray<string> = everyKind,
): { readonly frame: HTMLElement; readonly value: Ref<ReadonlyArray<string>> } {
  const value = ref<ReadonlyArray<string>>(chosen);
  wrapper = mount(
    {
      render: () =>
        h('div', { 'data-frame': '', style: { width: typeof width === 'number' ? `${width}px` : width } }, [
          h(ChipSelect, {
            options: kindOptions(),
            isMultiple: true,
            label: 'Kind',
            modelValue: value.value,
            'onUpdate:modelValue': (next: string | ReadonlyArray<string> | null) =>
              (value.value = typeof next === 'string' || next === null ? [] : next),
            hintOpenDelay: 0,
          }),
        ]),
    },
    { attachTo: document.body },
  );
  return { frame: document.querySelector<HTMLElement>('[data-frame]')!, value };
}

function fieldOf(frame: HTMLElement): HTMLElement {
  return frame.querySelector<HTMLElement>('[data-chip-select]')!;
}

function chipsIn(frame: HTMLElement): HTMLElement[] {
  return [
    ...fieldOf(frame).querySelectorAll<HTMLElement>(
      '[data-chip-select-chips] > [data-chip-select-chip], [data-chip-select-chips] > [data-chip-select-more]',
    ),
  ];
}

function moreChip(frame: HTMLElement): HTMLElement | null {
  return fieldOf(frame).querySelector<HTMLElement>('[data-chip-select-chips] > [data-chip-select-more]');
}

function stripOf(frame: HTMLElement): HTMLElement {
  return fieldOf(frame).querySelector<HTMLElement>('[data-chip-select-chips]')!;
}

describe('ChipSelect field', () => {
  it('shows every chip and no +N in a field wide enough, each chip inside the field', async () => {
    const { frame } = mountSelect(1440);
    await expect.poll(() => chipsIn(frame).length).toBe(8);
    expect(moreChip(frame)).toBeNull();
    const strip = stripOf(frame).getBoundingClientRect();
    for (const chip of chipsIn(frame)) {
      const rect = chip.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(strip.left - 0.5);
      expect(rect.right).toBeLessThanOrEqual(strip.right + 0.5);
      expect(chip.querySelector('svg')).not.toBeNull();
      expect(chip.textContent!.trim()).toBe('');
    }
  });

  it('replaces the chips a narrow field has no room for with a +N chip that stays inside it', async () => {
    const { frame } = mountSelect(200);
    await expect.poll(() => moreChip(frame) !== null).toBe(true);
    const shown = chipsIn(frame).length - 1;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(8);
    expect(moreChip(frame)!.textContent!.trim()).toBe(`+${8 - shown}`);
    expect(moreChip(frame)!.getAttribute('aria-label')).toBe(`${8 - shown} more selected`);
    const strip = stripOf(frame).getBoundingClientRect();
    for (const chip of chipsIn(frame)) {
      const rect = chip.getBoundingClientRect();
      expect(rect.right).toBeLessThanOrEqual(strip.right + 0.5);
      expect(rect.left).toBeGreaterThanOrEqual(strip.left - 0.5);
    }
    // The field itself never grows past the frame, and no scrollbar opens.
    expect(fieldOf(frame).getBoundingClientRect().right).toBeLessThanOrEqual(frame.getBoundingClientRect().right + 0.5);
    expect(fieldOf(frame).scrollWidth).toBeLessThanOrEqual(fieldOf(frame).clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  it('follows its container as it narrows and widens, with no fixed count', async () => {
    const { frame } = mountSelect(1440);
    await expect.poll(() => chipsIn(frame).length).toBe(8);
    const countAt = async (width: number): Promise<number> => {
      frame.style.width = `${width}px`;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return chipsIn(frame).filter((chip) => chip.hasAttribute('data-chip-select-chip')).length;
    };
    const wide = await countAt(300);
    const mid = await countAt(240);
    const narrow = await countAt(200);
    expect(narrow).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThanOrEqual(wide);
    expect(narrow).toBeLessThan(8);
    expect(await countAt(1440)).toBe(8);
    expect(moreChip(frame)).toBeNull();
  });

  it('keeps the field between 12rem and 18rem, and never wider than its container', async () => {
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const widthAt = async (width: number | string): Promise<{ field: number; frame: number }> => {
      wrapper?.unmount();
      wrapper = null;
      document.body.innerHTML = '';
      const { frame } = mountSelect(width);
      await nextTick();
      return { field: fieldOf(frame).getBoundingClientRect().width, frame: frame.getBoundingClientRect().width };
    };
    const wide = await widthAt(1440);
    expect(wide.field).toBeCloseTo(18 * rem, 0);
    const mid = await widthAt(15 * rem);
    expect(mid.field).toBeGreaterThanOrEqual(12 * rem - 0.5);
    expect(mid.field).toBeLessThanOrEqual(18 * rem + 0.5);
    expect(mid.field).toBeLessThanOrEqual(mid.frame + 0.5);
    const low = await widthAt(12 * rem);
    expect(low.field).toBeCloseTo(12 * rem, 0);
    const tight = await widthAt(10 * rem);
    expect(tight.field).toBeLessThanOrEqual(tight.frame + 0.5);
  });

  it('shows the label as the placeholder in the field with nothing chosen', async () => {
    const { frame } = mountSelect(1440, []);
    await nextTick();
    expect(fieldOf(frame).textContent!.trim()).toBe('Kind');
    expect(chipsIn(frame)).toHaveLength(0);
  });
});

describe('ChipSelect panel', () => {
  function panelRows(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[role=listbox] [role=option]')];
  }

  it('opens below the field with every option, a check on the chosen ones, and toggles per click', async () => {
    const { frame, value } = mountSelect(1440, ['workshop']);
    await userEvent.click(fieldOf(frame));
    await expect.poll(() => panelRows().length).toBe(8);
    const listbox = document.querySelector<HTMLElement>('[role=listbox]')!;
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(fieldOf(frame).getAttribute('aria-expanded')).toBe('true');
    const field = fieldOf(frame).getBoundingClientRect();
    const panelEl = document.querySelector<HTMLElement>('[data-chip-select-panel]')!;
    expect(panelEl.getBoundingClientRect().top).toBeGreaterThanOrEqual(field.bottom - 1);
    // The layout width, which the panel's pop-in scale does not touch, is at least the field's.
    expect(panelEl.offsetWidth).toBeGreaterThanOrEqual(field.width - 1);
    expect(panelRows().map((row) => row.querySelector('[data-chip-select-check]') !== null)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    const auction = panelRows()[7]!;
    expect(auction.hasAttribute('data-empty')).toBe(true);
    expect(Number(getComputedStyle(auction).opacity)).toBeCloseTo(0.6, 2);
    expect(Number(getComputedStyle(panelRows()[0]!).opacity)).toBe(1);

    // The rows animate in; a DOM click skips the driver's wait for a stable box, which a loaded host can stretch.
    panelRows()[0]!.click();
    await expect.poll(() => value.value).toEqual(['workshop', 'conference']);
    auction.click();
    await expect.poll(() => value.value).toEqual(['workshop', 'conference', 'auction']);
    expect(document.querySelector('[role=listbox]')).not.toBeNull();
  });

  it('opens by keyboard, keeps focus in the panel, and Escape returns it to the field', async () => {
    // The real pointer stays where the last test left it; park it away from the panel, which a pointer over a row
    // would otherwise make the active one.
    await userEvent.unhover(document.body);
    const { frame, value } = mountSelect(1440, []);
    fieldOf(frame).focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => document.querySelector('[role=listbox]') !== null).toBe(true);
    const listbox = document.querySelector<HTMLElement>('[role=listbox]')!;
    await expect.poll(() => document.activeElement === listbox).toBe(true);

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(panelRows().findIndex((row) => row.id === listbox.getAttribute('aria-activedescendant'))).toBe(2);
    await userEvent.keyboard('{Enter}');
    expect(value.value).toEqual(['workshop']);
    await userEvent.keyboard('{End}');
    await userEvent.keyboard(' ');
    expect(value.value).toEqual(['workshop', 'auction']);

    await nativeTab();
    expect(document.activeElement).toBe(listbox);
    await nativeTab({ shift: true });
    expect(document.activeElement).toBe(listbox);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.querySelector('[role=listbox]')).toBeNull();
    expect(document.activeElement).toBe(fieldOf(frame));
    expect(fieldOf(frame).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a hinted row card beside it, never over it, on hover and on the keyboard', async () => {
    const { frame } = mountSelect(1440, []);
    await userEvent.click(fieldOf(frame));
    await expect.poll(() => panelRows().length).toBe(8);
    const target = panelRows()[1]!;
    await userEvent.hover(target);
    await expect.poll(() => document.querySelector('[role=tooltip]') !== null).toBe(true);
    const body = document.querySelector<HTMLElement>('[role=tooltip]')!.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    expect(
      body.right <= rect.left + 1 ||
        body.left >= rect.right - 1 ||
        body.bottom <= rect.top + 1 ||
        body.top >= rect.bottom - 1,
    ).toBe(true);
    expect(document.querySelector('[role=tooltip]')!.textContent).toContain('Exhibition');

    // The keyboard moves to the plain third row: the card goes; back on the hinted first row it returns.
    await userEvent.unhover(target);
    await userEvent.keyboard('{Home}');
    await expect.poll(() => document.querySelector('[role=tooltip]')?.textContent ?? '').toContain('Conference');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.poll(() => document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('stays inside a 375px screen', async () => {
    await page.viewport(375, 800);
    const { frame } = mountSelect('100%', ['conference']);
    fieldOf(frame).click();
    await expect.poll(() => panelRows().length).toBe(8);
    const panel = document.querySelector<HTMLElement>('[data-chip-select-panel]')!.getBoundingClientRect();
    expect(panel.left).toBeGreaterThanOrEqual(0);
    expect(panel.right).toBeLessThanOrEqual(375);
    expect(fieldOf(frame).getBoundingClientRect().width).toBeLessThanOrEqual(18 * 16 + 1);
    await page.viewport(1440, 900);
  });
});
