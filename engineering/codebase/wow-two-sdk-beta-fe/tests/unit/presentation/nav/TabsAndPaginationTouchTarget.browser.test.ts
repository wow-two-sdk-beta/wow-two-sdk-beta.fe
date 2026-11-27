import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, type VNode } from 'vue';
import { page } from 'vitest/browser';
import { TabsGroup, TabsGroupList, TabsGroupTab } from '@src/presentation/display/tabsGroup';
import { Pagination } from '@src/presentation/nav/pagination';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import { reachOf } from '../../../support/TouchReach';
import '@src/index.css';

/**
 * Touch targets of the tab strip and the page row: a finger needs a 44 x 44px hit area on a phone or tablet, and the
 * fine-pointer look stays as it was.
 */

let wrapper: VueWrapper | null = null;

beforeAll(async () => {
  await page.viewport(320, 640);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

const Frame = 288;

function mountControl(render: () => VNode): void {
  wrapper = mount(
    { render: () => h('div', { 'data-frame': '', style: `width: ${Frame}px; padding: 8px` }, render()) },
    { attachTo: document.body },
  );
}

const TabLabels = ['Overview', 'Posts 18', 'Processed 0', 'Pipelines', 'Activity', 'Settings'];

/** The console's tab strip, scrolling inside its own frame as a phone holds it. */
const tabs = (orientation: 'horizontal' | 'vertical' = 'horizontal'): VNode =>
  h(TabsGroup, { defaultValue: 'overview', orientation }, () =>
    h(TabsGroupList, { 'aria-label': 'Sections', class: 'max-w-full overflow-x-auto' }, () =>
      TabLabels.map((label) =>
        h(TabsGroupTab, { value: label.toLowerCase(), class: 'shrink-0 whitespace-nowrap' }, () => label),
      ),
    ),
  );

const pages = (): VNode => h(Pagination, { total: 20, page: 10 });

const tabButtons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role=tab]')];
const pageButtons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('nav button')];

describe('tabs and pagination under a fine pointer', () => {
  it('keeps a tab at 38px', () => {
    mountControl(() => tabs());
    expect(tabButtons()).toHaveLength(TabLabels.length);
    for (const tab of tabButtons()) expect(Math.round(tab.getBoundingClientRect().height)).toBe(38);
  });

  it('keeps a page button at 32px', () => {
    mountControl(pages);
    expect(pageButtons().length).toBeGreaterThan(5);
    for (const button of pageButtons()) expect(Math.round(button.getBoundingClientRect().height)).toBe(32);
  });
});

describe.skipIf(!canEmulateCoarsePointer)('tabs and pagination under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it('gives a tab in a row that does not scroll a 44px tall hit area', () => {
    mountControl(() =>
      h(TabsGroup, { defaultValue: 'overview' }, () =>
        h(TabsGroupList, { 'aria-label': 'Sections' }, () =>
          ['Overview', 'Posts'].map((label) => h(TabsGroupTab, { value: label.toLowerCase() }, () => label)),
        ),
      ),
    );
    for (const tab of tabButtons()) {
      expect(Math.round(tab.getBoundingClientRect().height)).toBe(38);
      expect(reachOf(tab).height).toBeGreaterThanOrEqual(43.5);
    }
  });

  /* Dense (TabsGroupList spec): the list's gap cap keeps each hit area off its neighbour along the strip, and a list
     that scrolls clips it across to the tab's own 38px, since padding the scroll box out would move its border. */
  it.each(['horizontal', 'vertical'] as const)(
    'gives every %s tab in a scrolling list a dense hit area',
    (orientation) => {
      mountControl(() => tabs(orientation));
      expect(tabButtons()).toHaveLength(TabLabels.length);
      for (const tab of tabButtons()) {
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const box = tab.getBoundingClientRect();
        const reach = reachOf(tab);
        expect(reach.height).toBeGreaterThanOrEqual(24);
        expect(reach.height).toBeLessThanOrEqual(box.height + 1);
        expect(reach.width).toBeGreaterThanOrEqual(43.5);
        expect(reach.width).toBeLessThanOrEqual(Math.max(44, box.width) + 1);
      }
    },
  );

  /* The row's 4px gap caps the hit area along it, so neighbours tile edge to edge and never share a tap. */
  it('gives every page button a 44px tall hit area on its own 32px box, as wide as its box and gap', () => {
    mountControl(pages);
    expect(pageButtons().length).toBeGreaterThan(5);
    for (const button of pageButtons()) {
      const box = button.getBoundingClientRect();
      expect(Math.round(box.height)).toBe(32);
      const reach = reachOf(button);
      expect(reach.height).toBeGreaterThanOrEqual(43.5);
      expect(reach.width).toBeGreaterThanOrEqual(24);
      expect(Math.abs(reach.width - Math.min(44, box.width + 4))).toBeLessThanOrEqual(1);
    }
  });

  it('keeps a page row too long for its frame inside it by wrapping it', () => {
    mountControl(pages);
    const frame = document.querySelector<HTMLElement>('[data-frame]')!.getBoundingClientRect();
    for (const button of pageButtons()) {
      const rect = button.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(frame.left);
      expect(rect.right).toBeLessThanOrEqual(frame.right);
    }
  });
});
