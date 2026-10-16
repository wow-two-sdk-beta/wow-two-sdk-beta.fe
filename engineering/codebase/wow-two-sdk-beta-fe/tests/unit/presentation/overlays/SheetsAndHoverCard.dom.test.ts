import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetCancel,
  BottomSheet,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=dialog]');
}

function key(target: Element, name: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
}

describe('ActionSheet', () => {
  function mountSheet(onDelete = vi.fn(), attrs: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(ActionSheet, {
      props: { defaultOpen: true, title: 'Photo', description: 'Choose what to do' },
      attrs,
      slots: {
        default: () => [
          h(ActionSheetAction, null, () => 'Share'),
          h(ActionSheetAction, { isDestructive: true, onSelect: onDelete }, () => 'Delete'),
          h(ActionSheetCancel),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function row(text: string): HTMLButtonElement {
    return [...document.querySelectorAll<HTMLButtonElement>('[role=dialog] button')].find(
      (node) => node.textContent?.trim() === text,
    )!;
  }

  it('names the sheet by its title and closes after a picked action', async () => {
    const onDelete = vi.fn();
    const wrapper = mountSheet(onDelete);
    await settle();
    const title = document.getElementById(dialog()!.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toContain('Photo');
    expect(row('Delete').className).toContain('text-destructive');
    row('Delete').click();
    await settle();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('cancels without picking and carries its own label to the dialog', async () => {
    const onDelete = vi.fn();
    const wrapper = mountSheet(onDelete, { 'aria-label': 'Photo actions', 'data-testid': 'sheet' });
    await settle();
    expect(dialog()!.getAttribute('aria-label')).toBe('Photo actions');
    expect(dialog()!.dataset.testid).toBe('sheet');
    row('Cancel').click();
    await settle();
    expect(onDelete).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});

describe('BottomSheet', () => {
  function mountSheet(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(BottomSheet, {
      props: { defaultOpen: true, snapPoints: ['30vh', '60vh', '90vh'], ...props },
      slots: { default: () => h('p', 'Filters') },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function handle(): HTMLElement {
    return document.querySelector<HTMLElement>('[role=separator]')!;
  }

  it('gives its handle a name and a spoken height, and steps the snap with the arrows', async () => {
    mountSheet();
    await settle();
    expect(handle().getAttribute('aria-label')).toBe('Resize sheet');
    expect(handle().getAttribute('aria-valuetext')).toBe('Height 1 of 3');
    key(handle(), 'ArrowUp');
    key(handle(), 'ArrowUp');
    key(handle(), 'ArrowUp');
    await settle();
    expect(handle().getAttribute('aria-valuenow')).toBe('2');
    expect(handle().getAttribute('aria-valuetext')).toBe('Height 3 of 3');
    expect(dialog()!.style.height).toBe('90vh');
  });

  it('dismisses from the lowest snap with ArrowDown, unless dragging to dismiss is off', async () => {
    const wrapper = mountSheet();
    await settle();
    key(handle(), 'ArrowDown');
    await settle();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);

    const pinned = mountSheet({ canDragToDismiss: false });
    await settle();
    key(document.querySelectorAll<HTMLElement>('[role=separator]')[1]!, 'ArrowDown');
    await settle();
    expect(pinned.emitted('update:open')).toBeUndefined();
  });

  it('closes on Escape only while Escape dismissal is on', async () => {
    const wrapper = mountSheet({ canDismissOnEscape: false });
    await settle();
    key(handle(), 'Escape');
    await settle();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    await wrapper.setProps({ canDismissOnEscape: true });
    key(handle(), 'Escape');
    await settle();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('still honours the deprecated dismissal names, the prefixed name winning when both are set', async () => {
    const legacy = mountSheet({ dismissOnEscape: false, dragToDismiss: false });
    await settle();
    key(handle(), 'Escape');
    key(handle(), 'ArrowDown');
    await settle();
    expect(legacy.emitted('update:open')).toBeUndefined();

    const both = mountSheet({ canDismissOnEscape: true, dismissOnEscape: false });
    await settle();
    key(document.querySelectorAll<HTMLElement>('[role=separator]')[1]!, 'Escape');
    await settle();
    expect(both.emitted('update:open')).toEqual([[false]]);
  });
});

describe('HoverCard', () => {
  function mountCard(): VueWrapper {
    const wrapper = mount(HoverCard, {
      props: { openDelay: 300, closeDelay: 200 },
      slots: {
        default: () => [
          h(HoverCardTrigger, () => h('a', { href: '#ada' }, '@ada')),
          h(HoverCardContent, () => 'Ada Lovelace — first programmer'),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function pointer(type: string, pointerType = 'mouse'): PointerEvent {
    return new PointerEvent(type, { bubbles: true, pointerType });
  }

  function card(): string {
    return document.body.textContent ?? '';
  }

  it('opens after the open delay and waits out the close delay', async () => {
    vi.useFakeTimers();
    const wrapper = mountCard();
    const trigger = wrapper.get('a').element;
    trigger.dispatchEvent(pointer('pointerenter'));
    await vi.advanceTimersByTimeAsync(299);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(card()).toContain('first programmer');

    // Coming back inside the close delay keeps the card up: it never reports a close.
    trigger.dispatchEvent(pointer('pointerleave'));
    await vi.advanceTimersByTimeAsync(150);
    trigger.dispatchEvent(pointer('pointerenter'));
    await vi.advanceTimersByTimeAsync(400);
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    trigger.dispatchEvent(pointer('pointerleave'));
    await vi.advanceTimersByTimeAsync(200);
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
  });

  it('dismisses on Escape without moving the pointer', async () => {
    vi.useFakeTimers();
    const wrapper = mountCard();
    wrapper.get('a').element.dispatchEvent(pointer('pointerenter'));
    await vi.advanceTimersByTimeAsync(300);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });

  it('ignores touch, which has no hover to end it', async () => {
    vi.useFakeTimers();
    const wrapper = mountCard();
    wrapper.get('a').element.dispatchEvent(pointer('pointerenter', 'touch'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });
});
