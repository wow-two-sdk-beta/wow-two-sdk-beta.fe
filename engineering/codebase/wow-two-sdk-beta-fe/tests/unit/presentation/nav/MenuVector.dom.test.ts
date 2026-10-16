import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type VNode } from 'vue';
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@src/presentation/nav/menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@src/presentation/nav/dropdownMenu';
import { Menubar, MenubarContent, MenubarMenu, MenubarTrigger } from '@src/presentation/nav/menubar';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat every row as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Settles Portal's post-mount teleport, Presence and FocusScope's mount focus, then waits for the clock to
 * advance. Vue's event invoker skips any event stamped in the millisecond its listener was attached, so a key
 * dispatched in the same millisecond a submenu mounted would never reach the new surface.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

function anchorButton(): HTMLButtonElement {
  const node = document.createElement('button');
  node.textContent = 'Open';
  document.body.append(node);
  return node;
}

/** Mounts an open root menu around `rows`; `events` records every root `update:open`. */
function mountMenu(rows: () => VNode[]): { wrapper: VueWrapper; events: boolean[] } {
  const anchor = anchorButton();
  const open = ref(true);
  const events: boolean[] = [];
  const wrapper = track(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            Menu,
            {
              open: open.value,
              anchor,
              'onUpdate:open': (next: boolean) => {
                events.push(next);
                open.value = next;
              },
            },
            rows,
          ),
      }),
      { attachTo: document.body },
    ),
  );
  return { wrapper, events };
}

function menus(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role=menu]')];
}

function row(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('[role^=menuitem]')].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No menu row labelled ${text}`);
  return found;
}

function key(target: HTMLElement, name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function pointer(target: HTMLElement, type: string, pointerType = 'mouse'): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: type !== 'pointerleave', pointerType }));
}

/** A root menu with a plain row, a submenu with two rows, and a trailing plain row. */
function submenuRows(onSelect: (label: string) => void = () => undefined): () => VNode[] {
  return () => [
    h(MenuItem, { onSelect: () => onSelect('New') }, () => 'New'),
    h(MenuSub, null, () => [
      h(MenuSubTrigger, null, () => 'Share'),
      h(MenuSubContent, null, () => [
        h(MenuItem, { onSelect: () => onSelect('Email') }, () => 'Email'),
        h(MenuItem, { onSelect: () => onSelect('Link') }, () => 'Link'),
      ]),
    ]),
    h(MenuItem, { onSelect: () => onSelect('Delete') }, () => 'Delete'),
  ];
}

describe('checkable menu rows', () => {
  it('toggles an uncontrolled checkbox row, announces its state and closes the menu by default', async () => {
    const changes: boolean[] = [];
    const { events } = mountMenu(() => [
      h(MenuCheckboxItem, { 'onUpdate:modelValue': (next: boolean) => changes.push(next) }, () => 'Show grid'),
    ]);
    await settle();
    const checkbox = row('Show grid');
    expect(checkbox.getAttribute('role')).toBe('menuitemcheckbox');
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    checkbox.click();
    await nextTick();
    expect(changes).toEqual([true]);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    expect(events).toEqual([false]);
  });

  it('keeps the menu open when a checkbox row opts out and moves a mixed row to checked', async () => {
    const changes: boolean[] = [];
    const { events } = mountMenu(() => [
      h(
        MenuCheckboxItem,
        {
          modelValue: false,
          isIndeterminate: true,
          canCloseOnSelect: false,
          'onUpdate:modelValue': (next: boolean) => changes.push(next),
        },
        () => 'Select all',
      ),
    ]);
    await settle();
    const checkbox = row('Select all');
    expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
    checkbox.focus();
    key(checkbox, ' ');
    await nextTick();
    expect(changes).toEqual([true]);
    expect(events).toEqual([]);
  });

  it('ignores a disabled checkbox row', async () => {
    const changes: boolean[] = [];
    mountMenu(() => [
      h(
        MenuCheckboxItem,
        { isDisabled: true, 'onUpdate:modelValue': (next: boolean) => changes.push(next) },
        () => 'Locked',
      ),
    ]);
    await settle();
    row('Locked').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(changes).toEqual([]);
  });

  it('selects one radio row, reports the value and honours a disabled group', async () => {
    const picks: Array<string | null> = [];
    const disabled = ref(false);
    mountMenu(() => [
      h(
        MenuRadioGroup,
        {
          defaultValue: 'name',
          label: 'Sort by',
          isDisabled: disabled.value,
          'onUpdate:modelValue': (value: string | null) => picks.push(value),
        },
        () => [
          h(MenuRadioItem, { value: 'name', canCloseOnSelect: false }, () => 'Name'),
          h(MenuRadioItem, { value: 'date', canCloseOnSelect: false }, () => 'Date'),
        ],
      ),
    ]);
    await settle();
    expect(document.querySelector('[role=group]')?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(row('Name').getAttribute('aria-checked')).toBe('true');
    row('Date').focus();
    key(row('Date'), 'Enter');
    await nextTick();
    expect(picks).toEqual(['date']);
    expect(row('Date').getAttribute('aria-checked')).toBe('true');
    expect(row('Name').getAttribute('aria-checked')).toBe('false');
    disabled.value = true;
    await nextTick();
    row('Name').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picks).toEqual(['date']);
    expect(row('Name').disabled).toBe(true);
  });

  it('walks plain, checkbox, radio and submenu rows as one arrow-key sequence', async () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'Plain'),
      h(MenuCheckboxItem, null, () => 'Check'),
      h(MenuRadioGroup, { defaultValue: 'a' }, () => h(MenuRadioItem, { value: 'a' }, () => 'Radio')),
      h(MenuSub, null, () => [h(MenuSubTrigger, null, () => 'More'), h(MenuSubContent, null, () => [])]),
    ]);
    await settle();
    row('Plain').focus();
    for (const label of ['Check', 'Radio', 'More', 'Plain']) {
      key(document.activeElement as HTMLElement, 'ArrowDown');
      expect(document.activeElement?.textContent?.trim()).toBe(label);
    }
  });
});

describe('submenus', () => {
  it('opens from the inline-end arrow, focuses its first row and returns focus on the inline-start arrow', async () => {
    mountMenu(submenuRows());
    await settle();
    const trigger = row('Share');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.focus();
    key(trigger, 'ArrowRight');
    await settle();
    expect(menus()).toHaveLength(2);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const surface = menus()[1]!;
    expect(trigger.getAttribute('aria-controls')).toBe(surface.id);
    expect(surface.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(document.activeElement).toBe(row('Email'));
    key(row('Email'), 'ArrowLeft');
    await settle();
    expect(menus()).toHaveLength(1);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes only the submenu on Escape and keeps the root menu open', async () => {
    const { events } = mountMenu(submenuRows());
    await settle();
    const trigger = row('Share');
    trigger.focus();
    key(trigger, 'Enter');
    await settle();
    key(row('Email'), 'Escape');
    await settle();
    expect(menus()).toHaveLength(1);
    expect(events).toEqual([]);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the whole tree when a submenu row is selected', async () => {
    const selected: string[] = [];
    const { events } = mountMenu(submenuRows((label) => selected.push(label)));
    await settle();
    row('Share').focus();
    key(row('Share'), 'ArrowRight');
    await settle();
    row('Link').click();
    await nextTick();
    expect(selected).toEqual(['Link']);
    expect(events).toEqual([false]);
  });

  it('closes the whole tree on Tab from a submenu', async () => {
    const { events } = mountMenu(submenuRows());
    await settle();
    row('Share').focus();
    key(row('Share'), 'ArrowRight');
    await settle();
    const tab = key(row('Email'), 'Tab');
    expect(tab.defaultPrevented).toBe(true);
    expect(events).toEqual([false]);
  });

  it('closes only the submenu for a press on the root surface and the whole tree for a press outside', async () => {
    const { events } = mountMenu(submenuRows());
    await settle();
    row('Share').focus();
    key(row('Share'), 'ArrowRight');
    await settle();
    row('New').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(menus()).toHaveLength(1);
    expect(events).toEqual([]);
    key(row('Share'), 'ArrowRight');
    await settle();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(events).toEqual([false]);
  });

  it('moves into an already open submenu from the trigger and closes it when the arrow walk leaves', async () => {
    mountMenu(submenuRows());
    await settle();
    const trigger = row('Share');
    trigger.click();
    await settle();
    expect(menus()).toHaveLength(2);
    // A pointer open leaves focus where it was; the inline-end arrow moves into the submenu.
    trigger.focus();
    key(trigger, 'ArrowRight');
    expect(document.activeElement).toBe(row('Email'));
    trigger.focus();
    key(trigger, 'ArrowDown');
    await settle();
    expect(document.activeElement).toBe(row('Delete'));
    expect(menus()).toHaveLength(1);
  });

  it('opens on mouse rest without taking focus, holds while the pointer reaches it and closes for a sibling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mountMenu(submenuRows());
    await settle();
    const trigger = row('Share');
    pointer(trigger, 'pointermove');
    expect(document.activeElement).toBe(trigger);
    await vi.advanceTimersByTimeAsync(120);
    await settle();
    expect(menus()).toHaveLength(2);
    expect(document.activeElement).toBe(trigger);
    // Crossing a sibling on the way to the submenu arms a close that reaching the submenu cancels.
    pointer(row('Delete'), 'pointermove');
    menus()[1]!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(menus()).toHaveLength(2);
    pointer(row('Delete'), 'pointermove');
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(menus()).toHaveLength(1);
  });

  it('ignores touch movement for highlight and hover opening', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mountMenu(submenuRows());
    await settle();
    pointer(row('Share'), 'pointermove', 'touch');
    await vi.advanceTimersByTimeAsync(200);
    await settle();
    expect(menus()).toHaveLength(1);
    expect(document.activeElement).not.toBe(row('Share'));
  });

  it('keeps one sibling submenu open at a time', async () => {
    mountMenu(() => [
      h(MenuSub, null, () => [
        h(MenuSubTrigger, null, () => 'First'),
        h(MenuSubContent, null, () => h(MenuItem, null, () => 'One')),
      ]),
      h(MenuSub, null, () => [
        h(MenuSubTrigger, null, () => 'Second'),
        h(MenuSubContent, null, () => h(MenuItem, null, () => 'Two')),
      ]),
    ]);
    await settle();
    row('First').click();
    await settle();
    row('Second').click();
    await settle();
    expect(menus()).toHaveLength(2);
    expect(() => row('One')).toThrow();
    expect(row('Two')).toBeTruthy();
  });

  it('cannot open from a disabled trigger and closes when its trigger becomes disabled', async () => {
    const disabled = ref(false);
    mountMenu(() => [
      h(MenuSub, null, () => [
        h(MenuSubTrigger, { isDisabled: disabled.value }, () => 'More'),
        h(MenuSubContent, null, () => h(MenuItem, null, () => 'Inner')),
      ]),
    ]);
    await settle();
    row('More').click();
    await settle();
    expect(menus()).toHaveLength(2);
    disabled.value = true;
    await settle();
    expect(menus()).toHaveLength(1);
    row('More').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(menus()).toHaveLength(1);
  });

  it('mirrors the open and close arrows in right-to-left layouts', async () => {
    mountMenu(() => [
      h(MenuSub, null, () => [
        h(MenuSubTrigger, { style: 'direction: rtl' }, () => 'More'),
        h(MenuSubContent, { style: 'direction: rtl' }, () => h(MenuItem, null, () => 'Inner')),
      ]),
    ]);
    await settle();
    const trigger = row('More');
    trigger.focus();
    key(trigger, 'ArrowRight');
    await settle();
    expect(menus()).toHaveLength(1);
    key(trigger, 'ArrowLeft');
    await settle();
    expect(menus()).toHaveLength(2);
    key(row('Inner'), 'ArrowRight');
    await settle();
    expect(menus()).toHaveLength(1);
    expect(document.activeElement).toBe(trigger);
  });

  it('reports a controlled submenu open request without opening it', async () => {
    const requests: boolean[] = [];
    mountMenu(() => [
      h(MenuSub, { open: false, 'onUpdate:open': (next: boolean) => requests.push(next) }, () => [
        h(MenuSubTrigger, null, () => 'More'),
        h(MenuSubContent, null, () => h(MenuItem, null, () => 'Inner')),
      ]),
    ]);
    await settle();
    row('More').click();
    await settle();
    expect(requests).toEqual([true]);
    expect(menus()).toHaveLength(1);
  });
});

describe('menu wrappers', () => {
  it('opens a dropdown submenu and focuses the last row of any kind on an ArrowUp open', async () => {
    const wrapper = track(
      mount(
        defineComponent({
          setup: () => () =>
            h(DropdownMenu, null, () => [
              h(DropdownMenuTrigger, null, () => 'Actions'),
              h(DropdownMenuContent, null, () => [
                h(MenuItem, null, () => 'Rename'),
                h(MenuCheckboxItem, null, () => 'Pinned'),
              ]),
            ]),
        }),
        { attachTo: document.body },
      ),
    );
    const trigger = wrapper.get('button');
    (trigger.element as HTMLElement).focus();
    await trigger.trigger('keydown', { key: 'ArrowUp' });
    await settle();
    expect(document.activeElement).toBe(row('Pinned'));
  });

  it('drops the dropdown surface when a close lands before any exit animation can run', async () => {
    const open = ref(false);
    track(
      mount(
        defineComponent({
          setup: () => () =>
            h(DropdownMenu, { open: open.value, 'onUpdate:open': (next: boolean) => (open.value = next) }, () => [
              h(DropdownMenuTrigger, null, () => 'Actions'),
              h(DropdownMenuContent, null, () => h(MenuItem, null, () => 'Rename')),
            ]),
        }),
        { attachTo: document.body },
      ),
    );
    open.value = true;
    await nextTick();
    await nextTick();
    open.value = false;
    // Presence removes an exit that never animates after two frames; the whole surface must follow it.
    await new Promise((resolve) => setTimeout(resolve, 80));
    await nextTick();
    expect(menus()).toHaveLength(0);
  });

  it('lets a menubar submenu trigger own the inline-end arrow instead of moving across the bar', async () => {
    const wrapper = track(
      mount(Menubar, {
        props: { defaultValue: 'file' },
        slots: {
          default: () => [
            h(MenubarMenu, { value: 'file' }, () => [
              h(MenubarTrigger, null, () => 'File'),
              h(MenubarContent, null, () =>
                h(MenuSub, null, () => [
                  h(MenuSubTrigger, null, () => 'Recent'),
                  h(MenuSubContent, null, () => h(MenuItem, null, () => 'notes.md')),
                ]),
              ),
            ]),
            h(MenubarMenu, { value: 'edit' }, () => h(MenubarTrigger, null, () => 'Edit')),
          ],
        },
        attachTo: document.body,
      }),
    );
    await settle();
    const trigger = row('Recent');
    trigger.focus();
    key(trigger, 'ArrowRight');
    await settle();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(document.activeElement).toBe(row('notes.md'));
  });
});
