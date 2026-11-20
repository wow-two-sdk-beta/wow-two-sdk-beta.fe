import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { FacetBar, type FacetDefinition, type FacetSelection } from '@src/presentation/forms';
import '@src/index.css';

/* `sm:` answers to the viewport, so each test sets the one it needs; the suite restores the default phone size. */
beforeAll(() => {
  document.body.style.margin = '0';
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

/** Two inline facets of four options each, one popover facet and a toggle — the shape of a feed toolbar. */
function facets(): FacetDefinition[] {
  return [
    {
      key: 'scope',
      label: 'Scope',
      kind: 'single',
      placement: 'inline',
      options: [
        { value: 'all', label: 'All', count: 72 },
        { value: 'local', label: 'Local', count: 31 },
        { value: 'regional', label: 'Regional', count: 24 },
        { value: 'intl', label: 'International', count: 17 },
      ],
    },
    {
      key: 'kind',
      label: 'Format',
      kind: 'multi',
      placement: 'inline',
      options: [
        { value: 'conference', label: 'Conference', count: 22 },
        { value: 'expo', label: 'Exhibition', count: 18 },
        { value: 'workshop', label: 'Workshop', count: 9 },
        { value: 'fair', label: 'Fair', count: 14 },
      ],
    },
    {
      key: 'city',
      label: 'City',
      kind: 'single',
      placement: 'popover',
      options: [
        { value: 'tashkent', label: 'Tashkent', count: 40 },
        { value: 'samarkand', label: 'Samarkand', count: 12 },
      ],
    },
  ];
}

/** Mounts the bar `width` px wide with a search, a pill, and a sort plus an "Add" button after the facets. */
function mountBar(width: number | string, selection: FacetSelection = {}): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h('div', { 'data-frame': '', style: { width: typeof width === 'number' ? `${width}px` : width } }, [
          h(
            FacetBar,
            { facets: facets(), modelValue: selection, matchCount: 12, totalCount: 72 },
            {
              trailing: () => [
                h('button', { type: 'button', 'data-sort': '', class: 'h-9 rounded-full border px-3' }, 'Sort: starts'),
                h('button', { type: 'button', 'data-add': '', class: 'h-9 rounded-full border px-3' }, '+ Add'),
              ],
            },
          ),
        ]),
    },
    { attachTo: document.body },
  );
  return document.querySelector<HTMLElement>('[data-frame]')!;
}

function filtersButton(root: HTMLElement): HTMLElement {
  return [...root.querySelectorAll<HTMLElement>('button')].find((button) =>
    button.textContent?.trim().startsWith('Filters'),
  )!;
}

/** Every control of the bar, the search input first. */
function controls(root: HTMLElement): HTMLElement[] {
  return [
    root.querySelector<HTMLElement>('input[type=search]')!,
    ...root.querySelectorAll<HTMLElement>('[data-facet-inline] button'),
    filtersButton(root),
    root.querySelector<HTMLElement>('[data-sort]')!,
    root.querySelector<HTMLElement>('[data-add]')!,
  ];
}

const centerOf = (element: Element): number => {
  const rect = element.getBoundingClientRect();
  return rect.top + rect.height / 2;
};

describe('FacetBar layout at 1440px', () => {
  beforeAll(async () => {
    await page.viewport(1440, 900);
  });

  it('keeps the search, the inline chips, Filters, the sort and the add button on one row', async () => {
    const root = mountBar(1440);
    await nextTick();
    const all = controls(root);
    expect(all).toHaveLength(1 + 8 + 3);
    const first = all[0]!.getBoundingClientRect().top;
    for (const control of all) {
      expect(Math.abs(control.getBoundingClientRect().top - first)).toBeLessThanOrEqual(4);
    }
    const pill = root.querySelector('[data-facet-match] > *')!;
    expect(Math.abs(centerOf(pill) - centerOf(all[0]!))).toBeLessThanOrEqual(4);
    expect(root.querySelector('[data-facet-row]')!.getBoundingClientRect().height).toBeLessThan(60);
    expect(root.querySelector('[data-facet-chips]')).toBeNull();
  });

  it('orders the row pill, search, chips, then Filters, sort and add at the end', async () => {
    const root = mountBar(1440);
    await nextTick();
    const left = (element: Element) => element.getBoundingClientRect().left;
    const pill = root.querySelector('[data-facet-match] > *')!;
    const search = root.querySelector('input[type=search]')!;
    const chips = root.querySelector('[data-facet-inline]')!;
    const sequence = [
      pill,
      search,
      chips,
      filtersButton(root),
      root.querySelector('[data-sort]')!,
      root.querySelector('[data-add]')!,
    ];
    for (let at = 1; at < sequence.length; at += 1)
      expect(left(sequence[at]!)).toBeGreaterThan(left(sequence[at - 1]!));

    const frame = root.getBoundingClientRect();
    expect(frame.right - root.querySelector('[data-add]')!.getBoundingClientRect().right).toBeLessThanOrEqual(1);
    const searchBox = root.querySelector('[data-facet-search]')!.getBoundingClientRect();
    expect(searchBox.width).toBeLessThanOrEqual(22 * 16 + 1);
  });

  it('opens the second line of chips only while a popover facet has a choice', async () => {
    const root = mountBar(1440, { city: 'tashkent' });
    await nextTick();
    const row = root.querySelector('[data-facet-row]')!.getBoundingClientRect();
    const chips = root.querySelector('[data-facet-chips]')!.getBoundingClientRect();
    expect(chips.top).toBeGreaterThanOrEqual(row.bottom - 1);
    const first = controls(root)[0]!.getBoundingClientRect().top;
    for (const control of controls(root)) {
      expect(Math.abs(control.getBoundingClientRect().top - first)).toBeLessThanOrEqual(4);
    }
  });
});

describe('FacetBar layout at 1100px', () => {
  beforeAll(async () => {
    await page.viewport(1100, 900);
  });

  it('scrolls the inline chips inside their own group instead of opening a row', async () => {
    const root = mountBar(1100);
    await nextTick();
    const group = root.querySelector<HTMLElement>('[data-facet-inline]')!;
    expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
    expect(getComputedStyle(group).overflowX).toBe('auto');
    const first = controls(root)[0]!.getBoundingClientRect().top;
    for (const control of controls(root)) {
      expect(Math.abs(control.getBoundingClientRect().top - first)).toBeLessThanOrEqual(4);
    }
    expect(root.querySelector('[data-facet-row]')!.getBoundingClientRect().height).toBeLessThan(70);
  });

  it('leaves room for a chip focus ring inside the scroll box', async () => {
    const root = mountBar(1100);
    await nextTick();
    const group = root.querySelector<HTMLElement>('[data-facet-inline]')!;
    const chip = group.querySelector<HTMLElement>('button')!;
    const box = group.getBoundingClientRect();
    const inner = chip.getBoundingClientRect();
    expect(inner.top - box.top).toBeGreaterThanOrEqual(4);
    expect(box.bottom - inner.bottom).toBeGreaterThanOrEqual(4);
    expect(inner.left - box.left).toBeGreaterThanOrEqual(4);
  });
});

describe('FacetBar layout on a phone', () => {
  beforeAll(async () => {
    await page.viewport(375, 800);
  });

  it('gives the search its own full-width line and wraps the rest under it', async () => {
    const root = mountBar('100%');
    await nextTick();
    const frame = root.getBoundingClientRect();
    const search = root.querySelector('[data-facet-search]')!.getBoundingClientRect();
    expect(search.width).toBeGreaterThanOrEqual(frame.width - 1);
    expect(search.top).toBeLessThanOrEqual(frame.top + 1);
    for (const control of controls(root).slice(1)) {
      expect(control.getBoundingClientRect().top).toBeGreaterThanOrEqual(search.bottom - 1);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });
});
