import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { userEvent } from 'vitest/browser';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@src/presentation/nav/dropdownMenu';
import { MenuCheckboxItem, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger } from '@src/presentation/nav/menu';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function row(text: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role^=menuitem]')].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No menu row labelled ${text}`);
  return found;
}

function surfaces(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role=menu]')];
}

function mountDropdown(): { open: ReturnType<typeof ref<boolean>>; picked: string[] } {
  const open = ref(false);
  const picked: string[] = [];
  wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', { style: 'padding: 40px' }, [
          h(DropdownMenu, { open: open.value, 'onUpdate:open': (next: boolean) => (open.value = next) }, () => [
            h(DropdownMenuTrigger, null, () => 'Actions'),
            h(DropdownMenuContent, { class: 'w-48' }, () => [
              h(MenuItem, { onSelect: () => picked.push('New') }, () => 'New'),
              h(MenuSub, null, () => [
                h(MenuSubTrigger, null, () => 'Share'),
                h(MenuSubContent, { class: 'w-40' }, () => [
                  h(MenuItem, { onSelect: () => picked.push('Email') }, () => 'Email'),
                  h(MenuItem, { onSelect: () => picked.push('Link') }, () => 'Link'),
                ]),
              ]),
              h(MenuCheckboxItem, { canCloseOnSelect: false }, () => 'Pinned'),
            ]),
          ]),
        ]),
    }),
    { attachTo: document.body },
  );
  return { open, picked };
}

it('walks into a submenu beside its trigger with the keyboard and back out', async () => {
  const { open } = mountDropdown();
  const trigger = document.querySelector<HTMLElement>('[aria-haspopup=menu]')!;
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => surfaces().length).toBe(1);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('New');
  await userEvent.keyboard('{ArrowDown}{ArrowRight}');
  await expect.poll(() => surfaces().length).toBe(2);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Email');
  const shareBox = row('Share').getBoundingClientRect();
  const submenuBox = surfaces()[1]!.getBoundingClientRect();
  expect(submenuBox.left).toBeGreaterThanOrEqual(shareBox.right - 8);
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => surfaces().length).toBe(1);
  expect(document.activeElement).toBe(row('Share'));
  expect(open.value).toBe(true);
});

it('opens a submenu on mouse rest and closes the whole tree for a submenu pick', async () => {
  const { open, picked } = mountDropdown();
  await userEvent.click(document.querySelector<HTMLElement>('[aria-haspopup=menu]')!);
  await expect.poll(() => surfaces().length).toBe(1);
  await userEvent.hover(row('Share'));
  await expect.poll(() => surfaces().length).toBe(2);
  expect(document.activeElement).toBe(row('Share'));
  await userEvent.hover(row('Link'));
  await expect.poll(() => document.activeElement).toBe(row('Link'));
  await userEvent.click(row('Link'));
  await nextTick();
  expect(picked).toEqual(['Link']);
  expect(open.value).toBe(false);
});

it('keeps the menu open while an opted-out checkbox row toggles', async () => {
  const { open } = mountDropdown();
  await userEvent.click(document.querySelector<HTMLElement>('[aria-haspopup=menu]')!);
  await expect.poll(() => surfaces().length).toBe(1);
  await userEvent.click(row('Pinned'));
  expect(row('Pinned').getAttribute('aria-checked')).toBe('true');
  expect(open.value).toBe(true);
});
