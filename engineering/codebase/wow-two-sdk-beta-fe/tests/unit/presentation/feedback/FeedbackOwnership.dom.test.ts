import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import UndoBar from '@src/presentation/feedback/undoBar/UndoBar.vue';
import ToastHost, { toastHost } from '@src/presentation/feedback/toastHost/ToastHost.vue';
const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  toastHost.dismissAll();

  document.body.innerHTML = '';
});
const tick = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await nextTick();
};
const focusin = (el: Element) => el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
const focusout = (el: Element, relatedTarget: EventTarget | null = null) =>
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
const undo = (duration = 100) => {
  const wrapper = mount(UndoBar, {
    props: { open: true, message: 'Removed', duration, onUndo: () => undefined },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
};

describe('feedback lifetime ownership', () => {
  it('preserves an undo opportunity while its action has keyboard focus, including mouse leave', async () => {
    const wrapper = undo();
    await nextTick();
    const panel = document.querySelector('[role="status"]')!;
    const button = panel.querySelector('button')!;
    focusin(button);
    panel.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    await tick(200);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    focusout(button);
    await nextTick();
    await tick(110);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });
  it('restarts the undo budget when duration changes while open', async () => {
    const wrapper = undo(100);
    await nextTick();
    await tick(80);
    await wrapper.setProps({ duration: 200 });
    await tick(100);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    await tick(110);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });
  it('pauses toast expiry for descendant focus and resumes only after focus leaves the stack', async () => {
    const wrapper = mount(ToastHost, { props: { defaultDuration: 100 }, attachTo: document.body });
    wrappers.push(wrapper);
    const dismissed = vi.fn();
    toastHost.toast({ title: 'Saved', onDismiss: dismissed });
    await nextTick();
    await nextTick();
    const stack = document.querySelector('[aria-label="Notifications"]')!;
    const button = stack.querySelector('button')!;
    focusin(button);
    stack.dispatchEvent(new MouseEvent('mouseleave'));
    await nextTick();
    await tick(200);
    expect(dismissed).not.toHaveBeenCalled();
    focusout(button);
    await nextTick();
    await tick(110);
    expect(dismissed).toHaveBeenCalledOnce();
  });
  it('returns the complete toast settlement chain so formatter errors are observable', async () => {
    const failure = new Error('format failed');
    const result = toastHost.promise(Promise.resolve(4), {
      loading: 'Loading',
      success: () => {
        throw failure;
      },
      error: 'Failed',
    });
    await expect(result).rejects.toBe(failure);
    const reason = new Error('network');
    await expect(
      toastHost.promise(Promise.reject(reason), { loading: 'Loading', success: 'Saved', error: 'Failed' }),
    ).rejects.toBe(reason);
  });
  it('notifies subscribers of removal even when a dismiss callback throws', () => {
    const values: number[] = [];
    const unsubscribe = toastHost.subscribe((items) => values.push(items.length));
    const id = toastHost.toast({
      onDismiss: () => {
        throw new Error('callback');
      },
    });
    expect(() => toastHost.dismiss(id)).toThrow('callback');
    expect(values.at(-1)).toBe(0);
    unsubscribe();
  });
});
