import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { page, userEvent } from 'vitest/browser';
import { FacetBar, type FacetDefinition, type FacetSelection } from '@src/presentation/forms';
import { nativeTab } from '../../../BrowserKeyboard';
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

/** The first-row controls: pill, search, Filters, sort and add. */
function firstRow(root: HTMLElement): HTMLElement[] {
  return [
    root.querySelector<HTMLElement>('[data-facet-match] > *')!,
    root.querySelector<HTMLElement>('input[type=search]')!,
    filtersButton(root),
    root.querySelector<HTMLElement>('[data-sort]')!,
    root.querySelector<HTMLElement>('[data-add]')!,
  ];
}

describe('FacetBar layout at 1440px', () => {
  beforeAll(async () => {
    await page.viewport(1440, 900);
  });

  it('keeps the pill, search, Filters and trailing controls on the first row, chips below it', async () => {
    const root = mountBar(1440);
    await nextTick();
    const row = firstRow(root);
    const middle = (control: Element) => {
      const rect = control.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    for (const control of row) {
      expect(Math.abs(middle(control) - middle(row[1]!))).toBeLessThanOrEqual(4);
    }
    const group = root.querySelector<HTMLElement>('[data-facet-inline]')!;
    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
    expect(getComputedStyle(group).overflowX).not.toBe('auto');
    const chips = [...group.querySelectorAll<HTMLElement>('button')];
    expect(chips).toHaveLength(8);
    const bottom = Math.max(...row.map((control) => control.getBoundingClientRect().bottom));
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      expect(rect.top).toBeGreaterThanOrEqual(bottom - 1);
      expect(rect.right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
    }
    expect(root.querySelector('[data-facet-chips]')).toBeNull();
  });

  it('orders the first row pill, search, then Filters, sort and add at the end', async () => {
    const root = mountBar(1440);
    await nextTick();
    const left = (element: Element) => element.getBoundingClientRect().left;
    const sequence = firstRow(root);
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
    const group = root.querySelector('[data-facet-inline]')!.getBoundingClientRect();
    const chips = root.querySelector('[data-facet-chips]')!.getBoundingClientRect();
    expect(chips.top).toBeGreaterThanOrEqual(group.bottom - 1);
  });
});

describe('FacetBar layout at 900px', () => {
  beforeAll(async () => {
    await page.viewport(900, 900);
  });

  it('wraps the inline chips onto more rows and never scrolls them sideways', async () => {
    const root = mountBar(560);
    await nextTick();
    const group = root.querySelector<HTMLElement>('[data-facet-inline]')!;
    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
    const tops = new Set(
      [...group.querySelectorAll<HTMLElement>('button')].map((chip) => Math.round(chip.getBoundingClientRect().top)),
    );
    expect(tops.size).toBeGreaterThan(1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
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

/** An inline `single` facet with a hinted, an empty and a plain chip, in a frame low enough for a card above it. */
function mountHinted(width: number | string, selection?: FacetSelection): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h(
          'div',
          { 'data-frame': '', style: { width: typeof width === 'number' ? `${width}px` : width, marginTop: '320px' } },
          [
            h(FacetBar, {
              facets: [
                {
                  key: 'kind',
                  label: 'Format',
                  kind: 'single',
                  placement: 'inline',
                  options: [
                    {
                      value: 'conference',
                      label: 'Conference',
                      count: 22,
                      hint: { description: 'Talks and panels over one or more days, with a programme and speakers.' },
                    },
                    { value: 'fair', label: 'Fair', count: 0, hint: { description: 'Stalls where makers sell.' } },
                    { value: 'expo', label: 'Exhibition', count: 18 },
                  ],
                },
              ] satisfies FacetDefinition[],
              modelValue: selection,
              hintOpenDelay: 0,
            }),
          ],
        ),
    },
    { attachTo: document.body },
  );
  return document.querySelector<HTMLElement>('[data-frame]')!;
}

function chip(root: HTMLElement, name: string): HTMLElement {
  return root.querySelector<HTMLElement>(`[data-facet-inline] button[aria-label^="${name}"]`)!;
}

function hintBody(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=tooltip]');
}

describe('FacetBar empty chips and hint cards', () => {
  beforeAll(async () => {
    await page.viewport(1440, 900);
  });

  it('draws an empty chip muted at reduced opacity, and a chosen one in its chosen style', async () => {
    const root = mountHinted(900);
    await nextTick();
    expect(Number(getComputedStyle(chip(root, 'Fair')).opacity)).toBeCloseTo(0.6, 2);
    expect(Number(getComputedStyle(chip(root, 'Conference')).opacity)).toBe(1);
    expect(Number(getComputedStyle(chip(root, 'Exhibition')).opacity)).toBe(1);
    // Forced colors replace every text color, so the token check belongs to the normal palette.
    if (!window.matchMedia('(forced-colors: active)').matches) {
      const probe = document.createElement('span');
      probe.className = 'text-muted-foreground';
      document.body.append(probe);
      expect(getComputedStyle(chip(root, 'Fair')).color).toBe(getComputedStyle(probe).color);
      probe.remove();
    }
    // Pressable: a click chooses it, and its chosen state is full strength.
    await userEvent.click(chip(root, 'Fair'));
    expect(chip(root, 'Fair').getAttribute('aria-pressed')).toBe('true');
    expect(chip(root, 'Fair').hasAttribute('data-empty')).toBe(false);
    expect(Number(getComputedStyle(chip(root, 'Fair')).opacity)).toBe(1);
  });

  it('opens a 16rem card beside the hovered chip without covering it, and the click still toggles', async () => {
    const root = mountHinted(900);
    await nextTick();
    const target = chip(root, 'Conference');
    await userEvent.hover(target);
    await expect.poll(() => hintBody() !== null).toBe(true);
    const card = hintBody()!.querySelector<HTMLElement>('[data-facet-hint]')!;
    expect(card.getBoundingClientRect().width).toBeCloseTo(256, 0);
    expect(card.textContent).toContain('Conference');
    expect(card.textContent).toContain('22 events');

    const body = hintBody()!.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    expect(body.bottom <= rect.top || body.top >= rect.bottom).toBe(true);
    if (!window.matchMedia('(forced-colors: active)').matches) {
      const probe = document.createElement('div');
      probe.className = 'bg-popover';
      document.body.append(probe);
      expect(getComputedStyle(hintBody()!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
      probe.remove();
    }

    await userEvent.click(target);
    expect(target.getAttribute('aria-pressed')).toBe('true');
  });

  it("opens a chip's card when keyboard focus reaches it, and Escape closes it", async () => {
    const root = mountHinted(900);
    await nextTick();
    for (let step = 0; step < 6 && document.activeElement !== chip(root, 'Conference'); step += 1) await nativeTab();
    expect(document.activeElement).toBe(chip(root, 'Conference'));
    await expect.poll(() => hintBody() !== null).toBe(true);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => hintBody()).toBeNull();
  });

  it('keeps the card inside a phone screen and leaves a tap on another chip working', async () => {
    await page.viewport(375, 800);
    const root = mountHinted('100%');
    await nextTick();
    await userEvent.hover(chip(root, 'Conference'));
    await expect.poll(() => hintBody() !== null).toBe(true);
    const body = hintBody()!.getBoundingClientRect();
    expect(body.left).toBeGreaterThanOrEqual(0);
    expect(body.right).toBeLessThanOrEqual(375);
    await userEvent.click(chip(root, 'Exhibition'));
    expect(chip(root, 'Exhibition').getAttribute('aria-pressed')).toBe('true');
  });
});
