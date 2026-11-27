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

  it.each(['horizontal', 'vertical'] as const)('gives every %s tab a 44 x 44px hit area', (orientation) => {
    mountControl(() => tabs(orientation));
    expect(tabButtons()).toHaveLength(TabLabels.length);
    for (const tab of tabButtons()) {
      const rect = tab.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
    }
  });

  it('gives every page button a 44 x 44px hit area on its own 32px box', () => {
    mountControl(pages);
    expect(pageButtons().length).toBeGreaterThan(5);
    for (const button of pageButtons()) {
      expect(Math.round(button.getBoundingClientRect().height)).toBe(32);
      const reach = reachOf(button);
      expect(reach.height).toBeGreaterThanOrEqual(43.5);
      expect(reach.width).toBeGreaterThanOrEqual(43.5);
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
