import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { FocusScope } from '@src/foundation/primitives/focusScope';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@src/presentation/nav/contextMenu';
import { Menu, MenuItem } from '@src/presentation/nav/menu';
import { Menubar, MenubarMenu, MenubarTrigger } from '@src/presentation/nav/menubar';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from '@src/presentation/nav/navigationMenu';
import { Pagination } from '@src/presentation/nav/pagination';
import { Tooltip } from '@src/presentation/overlays/tooltip';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  vi.useRealTimers();
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.useRealTimers();
});
function button(text: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.textContent = text;
  document.body.append(node);
  return node;
}
function contextMenu(disabled = ref(false)): VueWrapper {
  return track(
    mount(
      defineComponent({
        setup: () => () =>
          h(ContextMenu, {}, () => [
            h(ContextMenuTrigger, { isDisabled: disabled.value, 'data-trigger': '' }, () => 'Actions'),
            h(ContextMenuContent, {}, () => h(MenuItem, {}, () => 'Edit')),
          ]),
      }),
      { attachTo: document.body },
    ),
  );
}

describe('overlay focus ownership', () => {
  it('restores a supplied pre-gesture focus target at teardown', async () => {
    const target = button('original editor');
    const scope = track(
      mount(FocusScope, {
        props: { returnFocus: () => target },
        slots: { default: '<button>inside</button>' },
        attachTo: document.body,
      }),
    );
    await nextTick();
    (scope.get('button').element as HTMLElement).focus();
    scope.unmount();
    expect(document.activeElement).toBe(target);
  });
  it('does not restore when a newer scope owns focus', async () => {
    const target = button('original editor');
    const first = track(
      mount(FocusScope, {
        props: { returnFocus: () => target },
        slots: { default: '<button>old</button>' },
        attachTo: document.body,
      }),
    );
    const second = track(
      mount(FocusScope, {
        props: { isTrapped: true },
        slots: { default: '<button>new</button>' },
        attachTo: document.body,
      }),
    );
    await nextTick();
    (second.get('button').element as HTMLElement).focus();
    first.unmount();
    expect(document.activeElement).toBe(second.get('button').element);
  });
  it('opens context menus from keyboard and restores the trigger without a retry timer', async () => {
    const wrapper = contextMenu();
    const trigger = wrapper.get('[data-trigger]');
    (trigger.element as HTMLElement).focus();
    await trigger.trigger('keydown', { key: 'F10', shiftKey: true });
    await nextTick();
    expect(document.querySelector('[role=menu]')).not.toBeNull();
    const item = document.querySelector<HTMLButtonElement>('[role=menuitem]')!;
    item.focus();
    item.click();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 45));
    await nextTick();
    expect(document.activeElement).toBe(trigger.element);
  });
});

describe('menu keyboard and inactive controls', () => {
  it('typeahead walks live menu labels and skips disabled items', async () => {
    const anchor = button('open');
    const wrapper = track(
      mount(Menu, {
        props: { open: true, anchor },
        slots: {
          default: () => [
            h(MenuItem, {}, () => 'Alpha'),
            h(MenuItem, { isDisabled: true }, () => 'Beta'),
            h(MenuItem, {}, () => 'Bravo'),
          ],
        },
        attachTo: document.body,
      }),
    );
    await nextTick();
    const menu = document.querySelector('[role=menu]')!;
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }));
    expect(document.activeElement?.textContent).toBe('Bravo');
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });
  it('skips disabled menubar triggers in open-menu movement and hover', async () => {
    const wrapper = track(
      mount(Menubar, {
        props: { defaultValue: 'a' },
        slots: {
          default: () =>
            ['a', 'b', 'c'].map((value) =>
              h(MenubarMenu, { value }, () => h(MenubarTrigger, { disabled: value === 'b' }, () => value)),
            ),
        },
        attachTo: document.body,
      }),
    );
    const triggers = wrapper.findAll('button');
    await triggers[1]!.trigger('pointerenter');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await triggers[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(triggers[2]!.element);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c']);
  });
  it('uses RTL direction for open-menu movement', async () => {
    const wrapper = track(
      mount(Menubar, {
        props: { defaultValue: 'a' },
        attrs: { style: 'direction: rtl' },
        slots: {
          default: () =>
            ['a', 'b', 'c'].map((value) => h(MenubarMenu, { value }, () => h(MenubarTrigger, {}, () => value))),
        },
        attachTo: document.body,
      }),
    );
    await wrapper.findAll('button')[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c']);
  });
  it('opens navigation panels with ArrowDown and focuses their first link', async () => {
    const wrapper = track(
      mount(NavigationMenu, {
        slots: {
          default: () =>
            h(NavigationMenuList, {}, () =>
              h(NavigationMenuItem, { value: 'docs' }, () => [
                h(NavigationMenuTrigger, {}, () => 'Docs'),
                h(NavigationMenuContent, {}, () => h('a', { href: '#docs' }, 'Start')),
              ]),
            ),
        },
        attachTo: document.body,
      }),
    );
    await wrapper.get('button').trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    expect(document.activeElement?.textContent).toBe('Start');
  });
  it.each(['move', 'disabled'])('cancels pending touch context menu on %s', async (cause) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const disabled = ref(false);
    const wrapper = contextMenu(disabled);
    const trigger = wrapper.get('[data-trigger]');
    await trigger.trigger('pointerdown', {
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    if (cause === 'move') await trigger.trigger('pointermove', { pointerId: 1, clientX: 30, clientY: 0 });
    else {
      disabled.value = true;
      await nextTick();
    }
    await vi.advanceTimersByTimeAsync(700);
    await nextTick();
    expect(document.querySelector('[role=menu]')).toBeNull();
  });
});

describe('defensive display state', () => {
  it.each([
    { total: 20, page: 3, siblings: -4 },
    { total: NaN, page: Infinity, siblings: Infinity },
    { total: 1_000_000_000, page: 500_000_000, siblings: 1_000_000_000 },
  ])('keeps pagination finite and bounded for %j', (props) => {
    const wrapper = track(mount(Pagination, { props }));
    expect(wrapper.findAll('button').length).toBeLessThanOrEqual(107);
    expect(wrapper.text()).not.toMatch(/NaN|Infinity/);
    expect(wrapper.findAll('[aria-current=page]')).toHaveLength(1);
  });
  it('does not resurrect a disabled tooltip when its pending open delay expires', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = track(
      mount(Tooltip, {
        props: { content: 'Hint', openDelay: 100 },
        slots: { default: '<button>Help</button>' },
        attachTo: document.body,
      }),
    );
    await wrapper.get('button').trigger('pointerenter');
    await wrapper.setProps({ isDisabled: true });
    await vi.advanceTimersByTimeAsync(150);
    await wrapper.setProps({ isDisabled: false });
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    expect(wrapper.emitted('update:open')?.some((args) => args[0] === true)).not.toBe(true);
  });
});
