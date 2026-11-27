import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, type Component, type VNode } from 'vue';
import { page } from 'vitest/browser';
import { Temporal } from 'temporal-polyfill';
import { Bell, Pencil, Settings, Trash2 } from 'lucide-vue-next';
import { Icon } from '@src/foundation/icons';
import { Button } from '@src/presentation/actions';
import { NotificationCenterGroup } from '@src/presentation/display/notificationCenterGroup';
import { TabsGroup, TabsGroupList, TabsGroupTab } from '@src/presentation/display/tabsGroup';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import Toast from '@src/presentation/feedback/toast/Toast.vue';
import {
  ChipSelect,
  DateRangePicker,
  PasswordInput,
  SearchInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  ToggleGroup,
  ToggleGroupItem,
} from '@src/presentation/forms';
import { AppFrame } from '@src/presentation/layout';
import { Pagination } from '@src/presentation/nav/pagination';
import { SidebarMenu, SidebarMenuItem, SidebarMenuSection } from '@src/presentation/nav';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../support/CoarsePointer';
import CheckboxField from '@src/presentation/forms/checkboxField/CheckboxField.vue';
import SwitchField from '@src/presentation/forms/switchField/SwitchField.vue';
import TextInput from '@src/presentation/forms/textInput/TextInput.vue';
import {
  boxesChanged,
  boxesIn,
  movedSideways,
  nextFrames,
  placementsIn,
  reachOf,
  type Reach,
} from '../../support/TouchReach';
import '@src/index.css';

/*
 * A coarse pointer grows a target's reach, never moves what it shows (responsive.md § Layout rules): every element
 * keeps its box, and every mark, icon and run of text its x, under a finger as under a mouse, unless the component's
 * spec declares the change in its `## Touch` table; each target still takes a tap across 44 x 44px. Each case mounts
 * once, reads the boxes and placements under a fine pointer, switches the finger on and reads them again.
 */

let wrapper: VueWrapper | null = null;

afterEach(async () => {
  await useFinePointer();
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  localStorage.clear();
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** A 28px square mark, inlined so the test loads no file. */
const LogoMark =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" fill="teal"/></svg>';

/** The 44px floor, less the probe's 0.25px step at each edge. */
const Floor = 43.5;

const query = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

interface PlaceOptions {
  /** Waits for the mounted tree to rest before the fine-pointer read. */
  readonly settle?: () => Promise<void>;
  /** Selectors of the elements whose touch change the spec declares (`## Touch`): they and what they push may move
      vertically; text in them keeps its start. */
  readonly declared?: readonly string[];
  /** Selectors of the elements whose declared touch change also resizes them sideways (16px text, a 44px slot). */
  readonly resized?: readonly string[];
}

/** Names an element in a failure: its tag and its first classes. */
const nameOf = (element: Element): string =>
  `${element.tagName.toLowerCase()}.${(element.getAttribute('class') ?? '').split(/\s+/).slice(0, 4).join('.')}`;

/** Every element's computed overflow. No spec declares an overflow change, so none may differ between the pointers. */
function overflowsIn(root: Element): Map<Element, string> {
  return new Map(
    [root, ...root.querySelectorAll('*')].map((element) => {
      const style = getComputedStyle(element);
      return [element, `${style.overflowX} ${style.overflowY}`];
    }),
  );
}

function overflowsChanged(fine: Map<Element, string>, coarse: Map<Element, string>): string[] {
  return [...fine].flatMap(([element, before]) => {
    const after = coarse.get(element);
    return after === undefined || after === before ? [] : [`${nameOf(element)} overflow ${before} -> ${after}`];
  });
}

/** The rect of a target's touch hit area (`CoarseHitArea.Before`): its `::before`, centred on the box. */
function hitAreaOf(target: Element): DOMRect {
  const box = target.getBoundingClientRect();
  const style = getComputedStyle(target, '::before');
  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);
  return new DOMRect(box.left + (box.width - width) / 2, box.top + (box.height - height) / 2, width, height);
}

/** The width of the text an element holds, clipped or not. */
function textWidthOf(element: Element): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect().width;
}

/**
 * Mounts `render`, reads its boxes, placements and overflows under a fine and then a coarse pointer, and returns every
 * box that changed, every placement that moved beyond the declared touch changes, and every overflow that changed.
 */
async function placeUnderBothPointers(render: () => VNode, options: PlaceOptions = {}): Promise<string[]> {
  wrapper = mount({ render }, { attachTo: document.body });
  await nextFrames();
  await options.settle?.();
  const root = document.body;
  const fine = placementsIn(root);
  const fineBoxes = boxesIn(root);
  const fineOverflows = overflowsIn(root);
  expect(fine.length).toBeGreaterThan(0);
  await useCoarsePointer();
  expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  await nextFrames();
  const declared = options.declared ?? [];
  return [
    ...boxesChanged(fineBoxes, boxesIn(root), declared, options.resized),
    ...movedSideways(fine, placementsIn(root), 0.5, declared),
    ...overflowsChanged(fineOverflows, overflowsIn(root)),
  ];
}

/* The frame eases its sidebar between widths over 200ms; a loaded runner can stretch that well past a second. */
const Settled = { timeout: 8000 };

/** Waits until the frame's rail and brand cell rest at the rail's 64px. */
async function railSettled(): Promise<void> {
  const width = (selector: string): number => Math.round(query(selector).getBoundingClientRect().width);
  await expect.poll(() => width('aside'), Settled).toBe(64);
  await expect.poll(() => width('[data-app-frame-brand]'), Settled).toBe(64);
  await new Promise((resolve) => setTimeout(resolve, 400));
}

function expectReach(name: string, reach: Reach, heightFloor = Floor, widthFloor = Floor): void {
  expect(reach.width, `${name} takes a tap ${reach.width} x ${reach.height}px`).toBeGreaterThanOrEqual(widthFloor);
  expect(reach.height, `${name} takes a tap ${reach.width} x ${reach.height}px`).toBeGreaterThanOrEqual(heightFloor);
}

/** A sidebar row's declared dense reach: 44px wide, its own 36px tall (`SidebarMenu.spec.md` § Touch). */
const DenseRowHeight = 35.5;

/**
 * A dense row's reach along it (`TabsGroupList`, `Pagination` spec § Touch): the gap cap keeps each hit area off its
 * neighbour, so it is the box plus the gap, at least WCAG 2.5.8's 24px.
 */
const DenseReach = 24;

const frameIcon =
  (icon: Component): (() => VNode) =>
  () =>
    h(Icon, { icon, size: 20 });

/** The SCFD frame: a flex link around a 28px mark, labelled sections of icon links, a trail and a version. */
const appFrame = (isCollapsedByDefault = true): VNode =>
  h(
    AppFrame,
    {
      version: '0.4.2',
      isCollapsedByDefault,
      crumbs: [{ label: 'Operations', href: '/ops' }, { label: 'Run 42' }],
    },
    {
      brand: () =>
        h('a', { href: '/', class: 'flex shrink-0 items-center', 'aria-label': 'SCFD home', 'data-test': 'brand' }, [
          h('img', { src: LogoMark, alt: '', width: 28, height: 28, class: 'size-7 rounded-md' }),
        ]),
      nav: ({ isRail }: { isRail: boolean }) =>
        h(SidebarMenu, { isCollapsed: isRail }, () => [
          h(SidebarMenuSection, { label: 'Work' }, () => [
            h(SidebarMenuItem, { href: '#/home', isActive: true }, { default: () => 'Home', icon: frameIcon(Bell) }),
            h(SidebarMenuItem, { href: '#/edit' }, { default: () => 'Edit', icon: frameIcon(Pencil) }),
          ]),
          h(SidebarMenuSection, { label: 'Admin' }, () => [
            h(SidebarMenuItem, { href: '#/settings' }, { default: () => 'Settings', icon: frameIcon(Settings) }),
          ]),
        ]),
      default: () => 'Page',
    },
  );

describe.skipIf(!canEmulateCoarsePointer)('a coarse pointer moves nothing the reader sees', () => {
  it('keeps the brand mark, the rail icons and the trail of an AppFrame rail at 1024 x 742', async () => {
    await page.viewport(1024, 742);
    expect(await placeUnderBothPointers(() => appFrame(), { settle: railSettled })).toEqual([]);

    const mark = query('[data-test="brand"] img').getBoundingClientRect();
    expect(Math.abs(mark.left + mark.width / 2 - 32)).toBeLessThanOrEqual(0.5);
    expectReach('the brand link', reachOf(query('[data-test="brand"]')));
    expectReach('the sidebar toggle', reachOf(query('[data-app-frame-toggle]')));
    const links = [...document.querySelectorAll<HTMLElement>('aside a[href]')];
    expect(links).toHaveLength(3);
    for (const link of links) {
      expectReach(`the rail link ${link.getAttribute('href')}`, reachOf(link), DenseRowHeight);
    }
    const region = getComputedStyle(query('[data-scroll-region]'));
    expect(region.overflowY).toBe('scroll');
    expect(region.overscrollBehaviorY).toBe('contain');
    expect(getComputedStyle(document.documentElement).overscrollBehaviorY).toBe('none');
    expect(getComputedStyle(query('[data-app-frame-toggle]')).touchAction).toBe('manipulation');
  });

  it('keeps the 36px rows of an expanded AppFrame sidebar at 1440 x 900', async () => {
    await page.viewport(1440, 900);
    const expanded = async (): Promise<void> => {
      await expect.poll(() => Math.round(query('aside').getBoundingClientRect().width), Settled).toBeGreaterThan(64);
      await new Promise((resolve) => setTimeout(resolve, 400));
    };
    expect(await placeUnderBothPointers(() => appFrame(false), { settle: expanded })).toEqual([]);
    for (const link of document.querySelectorAll<HTMLElement>('aside a[href]')) {
      expect(Math.round(link.getBoundingClientRect().height)).toBe(36);
      expectReach(`the sidebar link ${link.getAttribute('href')}`, reachOf(link), DenseRowHeight);
    }
  });

  it('grows the rows of a sidebar menu in a drawer to 44px, as declared', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(
        () =>
          h('div', { class: 'w-72 p-3', 'data-sidebar-drawer': '' }, [
            h(SidebarMenu, null, () => [
              h(SidebarMenuItem, { href: '#/a' }, { default: () => 'Home', icon: frameIcon(Bell) }),
              h(SidebarMenuItem, { href: '#/b' }, { default: () => 'Edit', icon: frameIcon(Pencil) }),
            ]),
          ]),
        { declared: ['[data-sidebar-drawer] a'] },
      ),
    ).toEqual([]);
    for (const link of document.querySelectorAll<HTMLElement>('a[href]')) {
      expect(Math.round(link.getBoundingClientRect().height)).toBe(44);
      expectReach(`the drawer link ${link.getAttribute('href')}`, reachOf(link));
    }
  });

  it("keeps the brand mark in a phone's bar at 390 x 844", async () => {
    await page.viewport(390, 844);
    expect(await placeUnderBothPointers(() => appFrame())).toEqual([]);
    expectReach('the brand link', reachOf(query('[data-test="brand"]')));
  });

  it('keeps the icons of xs, sm and md square and circle buttons', async () => {
    await page.viewport(414, 896);
    const icon = (shape: 'square' | 'circle', size: 'xs' | 'sm' | 'md', glyph: Component): VNode =>
      h(Button, { shape, size, variant: 'ghost', 'aria-label': `${shape} ${size}` }, () => h(Icon, { icon: glyph }));
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex items-center gap-2 p-6' }, [
          icon('square', 'xs', Pencil),
          icon('square', 'sm', Pencil),
          icon('square', 'md', Trash2),
          icon('circle', 'sm', Bell),
          icon('circle', 'md', Settings),
          h(Button, { size: 'sm' }, () => 'Save'),
          h(Button, { size: 'xs' }, () => 'Undo'),
        ]),
      ),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('button')) {
      expectReach(button.getAttribute('aria-label') ?? button.textContent!.trim(), reachOf(button));
      expect(getComputedStyle(button).touchAction).toBe('manipulation');
    }
  });

  it('keeps buttons and sidebar rows unclipped and clips a long label in its own span', async () => {
    await page.viewport(414, 896);
    const label = 'Export every harvested record to the archive';
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex w-48 flex-col items-start gap-6 p-6' }, [
          ...(['xs', 'sm', 'md', 'lg'] as const).map((size) => h(Button, { size, class: 'w-32' }, () => label)),
          h(SidebarMenu, { class: 'w-32' }, () => [
            h(SidebarMenuItem, { href: '#/export' }, { default: () => label, icon: frameIcon(Bell) }),
          ]),
        ]),
      ),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('button')) {
      expect(getComputedStyle(button).overflow).toBe('visible');
      const span = button.firstElementChild!;
      expect(getComputedStyle(span).overflow).toBe('clip');
      expect(textWidthOf(span)).toBeGreaterThan(span.getBoundingClientRect().width);
      expect(span.getBoundingClientRect().right).toBeLessThanOrEqual(button.getBoundingClientRect().right);
      expectReach(`the ${button.className.match(/h-\[calc\((\S+?)\*/)?.[1] ?? ''} button`, reachOf(button));
    }
    const row = query('a[href="#/export"]');
    expect(getComputedStyle(row).overflow).toBe('visible');
    const rowLabel = query('[data-sidebar-menu-label]');
    expect(getComputedStyle(rowLabel).overflow).toBe('hidden');
    expect(textWidthOf(rowLabel)).toBeGreaterThan(rowLabel.getBoundingClientRect().width);
  });

  it('caps the hit areas of toggle-group items so neighbours never overlap', async () => {
    await page.viewport(414, 896);
    const group = (variant: 'default' | 'segmented' | 'pill', isAttached = false): VNode =>
      h(
        ToggleGroup as Component,
        { variant, isAttached, 'aria-label': `${variant}${isAttached ? ' attached' : ''}` },
        () => ['a', 'b', 'c', 'd'].map((value) => h(ToggleGroupItem, { value, label: value.toUpperCase() })),
      );
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex w-80 flex-col items-start gap-8 p-6' }, [
          group('pill'),
          group('default'),
          group('default', true),
          group('segmented'),
        ]),
      ),
    ).toEqual([]);
    const groups = [...document.querySelectorAll<HTMLElement>('[aria-label]:has(> button)')];
    expect(groups).toHaveLength(4);
    for (const root of groups) {
      const items = [...root.querySelectorAll<HTMLElement>(':scope > button')];
      expect(items).toHaveLength(4);
      const hits = items.map(hitAreaOf);
      hits.forEach((hit, index) => {
        const name = `${root.getAttribute('aria-label')} item ${index + 1}`;
        const box = items[index]!.getBoundingClientRect();
        expect(hit.width, `${name} hit width`).toBeGreaterThanOrEqual(box.width - 2.5);
        expect(hit.height, `${name} hit height`).toBeGreaterThanOrEqual(Floor);
        const next = hits[index + 1];
        if (next !== undefined) expect(hit.right, `${name} overlaps the next`).toBeLessThanOrEqual(next.left + 0.25);
      });
    }
  });

  it('grows a chip select and a date range picker to 44px with 16px text, as declared', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(
        () =>
          h('div', { class: 'flex w-72 flex-col gap-6 p-6' }, [
            h(ChipSelect as Component, {
              label: 'Status',
              options: [
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
              ],
            }),
            h(DateRangePicker as Component, { 'aria-label': 'Period' }),
            h('p', null, 'After the fields'),
          ]),
        { declared: ['[aria-haspopup]'], resized: ['[aria-haspopup] span'] },
      ),
    ).toEqual([]);
    const triggers = [...document.querySelectorAll<HTMLElement>('[aria-haspopup]')];
    expect(triggers).toHaveLength(2);
    for (const trigger of triggers) {
      expect(Math.round(trigger.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      expect(getComputedStyle(trigger).fontSize).toBe('16px');
    }
  });

  it('keeps the rows of checkbox and switch fields and reaches 44px through their labels', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex w-72 flex-col gap-6 p-6' }, [
          h(CheckboxField, { label: 'Email me' }),
          h(SwitchField, { label: 'Dark mode' }),
        ]),
      ),
    ).toEqual([]);
    for (const label of document.querySelectorAll<HTMLElement>('label')) {
      expectReach(`the field ${label.textContent?.trim()}`, reachOf(label));
    }
  });

  it('grows a text field to 44px with 16px text, as declared', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(
        () =>
          h('div', { class: 'flex w-72 flex-col gap-6 p-6' }, [
            h(TextInput, { defaultValue: 'harvest', 'aria-label': 'Name' }),
            h('p', null, 'After the field'),
          ]),
        { declared: ['input'] },
      ),
    ).toEqual([]);
    const input = query<HTMLInputElement>('input');
    expect(Math.round(input.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(getComputedStyle(input).fontSize).toBe('16px');
  });

  it('keeps the controls of a toast card', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { style: 'width: 360px; padding: 48px 8px' }, [
          h(
            Toast,
            {
              title: 'Harvest running',
              isPinned: false,
              onClose: () => undefined,
              onDelete: () => undefined,
              closeLabel: 'Dismiss',
              deleteLabel: 'Delete',
              pinLabel: 'Pin notification',
              unpinLabel: 'Unpin notification',
            },
            { details: () => 'Run 42 details' },
          ),
        ]),
      ),
    ).toEqual([]);
    for (const name of ['Pin notification', 'Delete', 'Dismiss']) {
      expectReach(name, reachOf(query(`button[aria-label="${name}"]`)));
    }
    expectReach('the details toggle', reachOf(query('button[aria-expanded]')));
  });

  it('keeps the text and the trailing button of a search and a password field', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(
        () =>
          h('div', { class: 'flex w-72 flex-col gap-6 p-6' }, [
            h(SearchInput, { defaultValue: 'harvest', 'aria-label': 'Search posts' }),
            h(PasswordInput, { defaultValue: 'secret', 'aria-label': 'Password' }),
          ]),
        { declared: [':has(> input)'] },
      ),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('button')) {
      expectReach(button.getAttribute('aria-label') ?? 'a field button', reachOf(button));
    }
  });

  it('keeps the value, the clear button and the chevron of a select', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(
        () =>
          h('div', { class: 'w-72 p-6' }, [
            h(SelectPicker as Component, { defaultValue: 'a', isClearable: true }, () => [
              h(SelectPickerTrigger, { 'aria-label': 'Sort' }, () => h(SelectPickerValue)),
              h(SelectPickerContent, null, () => [
                h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'Newest' }),
                h(SelectPickerItem, { itemKey: 'b', value: 'b', label: 'Oldest' }),
              ]),
            ]),
          ]),
        { declared: ['[aria-haspopup]'], resized: ['[aria-haspopup] span'] },
      ),
    ).toEqual([]);
    expectReach('the clear button', reachOf(query('button:not([aria-haspopup])')));
  });

  it('keeps the labels of one-character tabs', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'p-6' }, [
          h(TabsGroup, { defaultValue: '1' }, () =>
            h(TabsGroupList, { 'aria-label': 'Steps' }, () =>
              ['1', '2', '3'].map((step) => h(TabsGroupTab, { value: step }, () => step)),
            ),
          ),
        ]),
      ),
    ).toEqual([]);
    for (const tab of document.querySelectorAll<HTMLElement>('[role=tab]')) {
      expectReach(`tab ${tab.textContent}`, reachOf(tab), Floor, DenseReach);
    }
  });

  /* A row wider than its container wraps under a coarse pointer by design (`Pagination`), so this one fits. */
  it('keeps the page numbers of a pagination row', async () => {
    await page.viewport(1024, 742);
    expect(
      await placeUnderBothPointers(() => h('div', { class: 'p-6' }, [h(Pagination, { total: 9, page: 5 })])),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('nav button')) {
      const name = `page button ${button.textContent?.trim() || button.getAttribute('aria-label')}`;
      expectReach(name, reachOf(button), Floor, DenseReach);
    }
  });

  it('keeps the toolbar arrows and the dates of a month at 1280 x 800', async () => {
    await page.viewport(1280, 800);
    const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(`${text}[UTC]`);
    expect(
      await placeUnderBothPointers(
        () => h(EventCalendarViewer, { events: [], date: at('2026-09-25T12:00Z'), view: 'month', timeZone: 'UTC' }),
        { declared: ['button.tabular-nums'] },
      ),
    ).toEqual([]);
    for (const name of ['Previous', 'Next']) expectReach(name, reachOf(query(`button[aria-label="${name}"]`)));
    const date = [...document.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === '16')!;
    expectReach('the date 16', reachOf(date));
  });

  it('keeps the close button of a notification panel', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'w-80 p-6' }, [h(NotificationCenterGroup, { onClose: () => undefined })]),
      ),
    ).toEqual([]);
    expectReach('the close button', reachOf(query('button[aria-label="Close notifications"]')));
  });
});
