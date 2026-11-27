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
  PasswordInput,
  SearchInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
} from '@src/presentation/forms';
import { AppFrame } from '@src/presentation/layout';
import { Pagination } from '@src/presentation/nav/pagination';
import { SidebarMenu, SidebarMenuItem, SidebarMenuSection } from '@src/presentation/nav';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../support/CoarsePointer';
import { movedSideways, nextFrames, placementsIn, reachOf, type Reach } from '../../support/TouchReach';
import '@src/index.css';

/*
 * A coarse pointer grows a target's reach, never moves what it shows (responsive.md § Layout rules): every mark, icon
 * and run of text sits at the same x under a finger as under a mouse, and each target still takes a tap across 44 x
 * 44px. Each case mounts once, reads the placements under a fine pointer, switches the finger on and reads them again.
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

/** Mounts `render`, reads its placements under a fine and then a coarse pointer, and returns what moved. */
async function placeUnderBothPointers(render: () => VNode, settle?: () => Promise<void>): Promise<string[]> {
  wrapper = mount({ render }, { attachTo: document.body });
  await nextFrames();
  await settle?.();
  const root = document.body;
  const fine = placementsIn(root);
  expect(fine.length).toBeGreaterThan(0);
  await useCoarsePointer();
  expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  await nextFrames();
  return movedSideways(fine, placementsIn(root));
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

function expectReach(name: string, reach: Reach): void {
  expect(reach.width, `${name} takes a tap ${reach.width} x ${reach.height}px`).toBeGreaterThanOrEqual(Floor);
  expect(reach.height, `${name} takes a tap ${reach.width} x ${reach.height}px`).toBeGreaterThanOrEqual(Floor);
}

const frameIcon =
  (icon: Component): (() => VNode) =>
  () =>
    h(Icon, { icon, size: 20 });

/** The SCFD frame: a flex link around a 28px mark, labelled sections of icon links, a trail and a version. */
const appFrame = (): VNode =>
  h(
    AppFrame,
    {
      version: '0.4.2',
      isCollapsedByDefault: true,
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
    expect(await placeUnderBothPointers(appFrame, railSettled)).toEqual([]);

    const mark = query('[data-test="brand"] img').getBoundingClientRect();
    expect(Math.abs(mark.left + mark.width / 2 - 32)).toBeLessThanOrEqual(0.5);
    expectReach('the brand link', reachOf(query('[data-test="brand"]')));
    expectReach('the sidebar toggle', reachOf(query('[data-app-frame-toggle]')));
    const links = [...document.querySelectorAll<HTMLElement>('aside a[href]')];
    expect(links).toHaveLength(3);
    for (const link of links) expectReach(`the rail link ${link.getAttribute('href')}`, reachOf(link));
  });

  it("keeps the brand mark in a phone's bar at 390 x 844", async () => {
    await page.viewport(390, 844);
    expect(await placeUnderBothPointers(appFrame)).toEqual([]);
    expectReach('the brand link', reachOf(query('[data-test="brand"]')));
  });

  it('keeps the icons of sm and md square and circle buttons', async () => {
    await page.viewport(414, 896);
    const icon = (shape: 'square' | 'circle', size: 'sm' | 'md', glyph: Component): VNode =>
      h(Button, { shape, size, variant: 'ghost', 'aria-label': `${shape} ${size}` }, () => h(Icon, { icon: glyph }));
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex items-center gap-2 p-6' }, [
          icon('square', 'sm', Pencil),
          icon('square', 'md', Trash2),
          icon('circle', 'sm', Bell),
          icon('circle', 'md', Settings),
          h(Button, { size: 'sm' }, () => 'Save'),
        ]),
      ),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('button[aria-label]')) {
      expectReach(button.getAttribute('aria-label')!, reachOf(button));
    }
  });

  it('keeps the controls of a toast card', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { style: 'width: 360px; padding: 48px 8px' }, [
          h(Toast, {
            title: 'Harvest running',
            isPinned: false,
            onClose: () => undefined,
            onDelete: () => undefined,
            closeLabel: 'Dismiss',
            deleteLabel: 'Delete',
            pinLabel: 'Pin notification',
            unpinLabel: 'Unpin notification',
          }),
        ]),
      ),
    ).toEqual([]);
    for (const name of ['Pin notification', 'Delete', 'Dismiss']) {
      expectReach(name, reachOf(query(`button[aria-label="${name}"]`)));
    }
  });

  it('keeps the text and the trailing button of a search and a password field', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'flex w-72 flex-col gap-6 p-6' }, [
          h(SearchInput, { defaultValue: 'harvest', 'aria-label': 'Search posts' }),
          h(PasswordInput, { defaultValue: 'secret', 'aria-label': 'Password' }),
        ]),
      ),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('button')) {
      expectReach(button.getAttribute('aria-label') ?? 'a field button', reachOf(button));
    }
  });

  it('keeps the value, the clear button and the chevron of a select', async () => {
    await page.viewport(414, 896);
    expect(
      await placeUnderBothPointers(() =>
        h('div', { class: 'w-72 p-6' }, [
          h(SelectPicker as Component, { defaultValue: 'a', isClearable: true }, () => [
            h(SelectPickerTrigger, { 'aria-label': 'Sort' }, () => h(SelectPickerValue)),
            h(SelectPickerContent, null, () => [
              h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'Newest' }),
              h(SelectPickerItem, { itemKey: 'b', value: 'b', label: 'Oldest' }),
            ]),
          ]),
        ]),
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
      expectReach(`tab ${tab.textContent}`, reachOf(tab));
    }
  });

  /* A row wider than its container wraps under a coarse pointer by design (`Pagination`), so this one fits. */
  it('keeps the page numbers of a pagination row', async () => {
    await page.viewport(1024, 742);
    expect(
      await placeUnderBothPointers(() => h('div', { class: 'p-6' }, [h(Pagination, { total: 9, page: 5 })])),
    ).toEqual([]);
    for (const button of document.querySelectorAll<HTMLElement>('nav button')) {
      expectReach(`page button ${button.textContent?.trim() || button.getAttribute('aria-label')}`, reachOf(button));
    }
  });

  it('keeps the toolbar arrows and the dates of a month at 1280 x 800', async () => {
    await page.viewport(1280, 800);
    const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(`${text}[UTC]`);
    expect(
      await placeUnderBothPointers(() =>
        h(EventCalendarViewer, { events: [], date: at('2026-09-25T12:00Z'), view: 'month', timeZone: 'UTC' }),
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
