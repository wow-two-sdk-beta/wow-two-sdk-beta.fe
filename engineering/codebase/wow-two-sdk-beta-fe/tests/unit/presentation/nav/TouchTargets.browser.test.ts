import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { page } from 'vitest/browser';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@src/presentation/nav/dropdownMenu';
import {
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@src/presentation/nav/menu';
import { SidebarMenu, SidebarMenuGroup, SidebarMenuItem } from '@src/presentation/nav/sidebarMenu';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import '@src/index.css';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** An open menu with one row of every kind that shares the menu row recipe. */
function mountMenu(): void {
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', { style: 'padding: 40px' }, [
          h(DropdownMenu, { open: true }, () => [
            h(DropdownMenuTrigger, null, () => 'Actions'),
            h(DropdownMenuContent, { class: 'w-72' }, () => [
              h(MenuItem, null, () => 'Sign out'),
              h(MenuCheckboxItem, { canCloseOnSelect: false }, () => 'Pinned'),
              h(MenuRadioGroup, { defaultValue: 'system' }, () => [
                h(MenuRadioItem, { value: 'system' }, () => 'System'),
                h(MenuRadioItem, { value: 'dark' }, () => 'Dark'),
              ]),
              h(MenuSub, null, () => [
                h(MenuSubTrigger, null, () => 'Share'),
                h(MenuSubContent, null, () => [h(MenuItem, null, () => 'Email')]),
              ]),
            ]),
          ]),
        ]),
    }),
    { attachTo: document.body },
  );
}

/* The rows, measured by layout (`offsetHeight`): the open menu zooms in, and a bounding box would carry the scale. */
async function menuRows(): Promise<HTMLElement[]> {
  await expect.poll(() => document.querySelectorAll('[role^=menuitem]').length).toBe(5);
  return [...document.querySelectorAll<HTMLElement>('[role^=menuitem]')];
}

function mountSidebar(): void {
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('nav', { style: 'width: 248px' }, [
          h(SidebarMenu, null, () => [
            h(SidebarMenuItem, { href: '#/one', isActive: true }, () => 'One'),
            h(SidebarMenuItem, { href: '#/two' }, () => 'Two'),
          ]),
        ]),
    }),
    { attachTo: document.body },
  );
}

const sidebarRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('nav a')];

/** A sidebar whose one group is open, so its toggle row and a nested destination both show. */
function mountSidebarWithGroup(): void {
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('nav', { style: 'width: 248px' }, [
          h(SidebarMenu, null, () => [
            h(SidebarMenuGroup, { label: 'Reports', defaultOpen: true }, () => [
              h(SidebarMenuItem, { href: '#/daily' }, () => 'Daily'),
            ]),
          ]),
        ]),
    }),
    { attachTo: document.body },
  );
}

const groupToggle = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('nav button[aria-expanded]')!;

describe('menu rows and sidebar rows under a fine pointer', () => {
  it('keeps a menu row at its own compact height', async () => {
    await page.viewport(1024, 768);
    mountMenu();
    for (const row of await menuRows()) expect(row.offsetHeight).toBe(32);
  });

  it('keeps a sidebar row at 36px', async () => {
    await page.viewport(1024, 768);
    mountSidebar();
    expect(sidebarRows()).toHaveLength(2);
    for (const row of sidebarRows()) expect(Math.round(row.getBoundingClientRect().height)).toBe(36);
  });

  it('keeps a sidebar group toggle at 36px', async () => {
    await page.viewport(1024, 768);
    mountSidebarWithGroup();
    expect(groupToggle().getAttribute('aria-expanded')).toBe('true');
    expect(Math.round(groupToggle().getBoundingClientRect().height)).toBe(36);
  });
});

describe.skipIf(!canEmulateCoarsePointer)('menu rows and sidebar rows under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
  });
  afterEach(async () => {
    await useFinePointer();
  });

  for (const size of [
    { width: 1024, height: 768 },
    { width: 375, height: 667 },
  ]) {
    it(`gives every menu row, radio and checkbox row included, 44px at ${size.width}px`, async () => {
      await page.viewport(size.width, size.height);
      mountMenu();
      const rows = await menuRows();
      expect(rows.map((row) => row.getAttribute('role'))).toEqual(
        expect.arrayContaining(['menuitem', 'menuitemradio', 'menuitemcheckbox']),
      );
      for (const row of rows) {
        expect(row.offsetHeight).toBeGreaterThanOrEqual(44);
        expect(row.offsetWidth).toBeGreaterThanOrEqual(44);
      }
    });

    it(`gives every sidebar row 44px at ${size.width}px`, async () => {
      await page.viewport(size.width, size.height);
      mountSidebar();
      expect(sidebarRows()).toHaveLength(2);
      for (const row of sidebarRows()) {
        expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(row.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
      }
    });

    it(`gives a sidebar group toggle and its nested row 44px at ${size.width}px`, async () => {
      await page.viewport(size.width, size.height);
      mountSidebarWithGroup();
      expect(sidebarRows()).toHaveLength(1);
      for (const row of [groupToggle(), ...sidebarRows()]) {
        expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(row.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
      }
    });
  }
});
