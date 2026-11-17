import { afterEach, describe, expect, it, vi } from 'vitest';
import UndoBar from '@src/presentation/feedback/undoBar/UndoBar.vue';
import { attach, resetToasts, settle, useFakeClock } from './ToastHarness';

/* The undo bar's budget: keyboard focus on its action holds it, and a new duration restarts it. */

afterEach(resetToasts);

const undoBar = (duration = 100) => {
  useFakeClock();
  return attach(UndoBar, { props: { open: true, message: 'Removed', duration, onUndo: () => undefined } });
};
const wait = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
  await settle();
};

describe('undo bar lifetime', () => {
  it('preserves an undo opportunity while its action has keyboard focus, including mouse leave', async () => {
    const wrapper = undoBar();
    await settle();
    const panel = document.querySelector('[role="status"]')!;
    const button = panel.querySelector('button')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    panel.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(200);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await wait(110);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });

  it('restarts the undo budget when duration changes while open', async () => {
    const wrapper = undoBar(100);
    await settle();
    await wait(80);
    await wrapper.setProps({ duration: 200 });
    await wait(100);
    expect(wrapper.emitted('update:open')).toBeUndefined();
    await wait(110);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });
});
