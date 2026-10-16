import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { SpeedDialGroup, SpeedDialGroupTrigger, SpeedDialGroupAction } from '@src/presentation/actions/speedDialGroup';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});
function dial(): VueWrapper {
  return track(
    mount(SpeedDialGroup, {
      props: { defaultOpen: true },
      slots: {
        default: () => [
          h(SpeedDialGroupTrigger),
          h(SpeedDialGroupAction, { 'aria-label': 'First' }),
          h(SpeedDialGroupAction, { 'aria-label': 'Unavailable', disabled: true }),
          h(SpeedDialGroupAction, { 'aria-label': 'Aria inactive', 'aria-disabled': 'true' }),
          h(SpeedDialGroupAction, { 'aria-label': 'Last' }),
        ],
      },
      attachTo: document.body,
    }),
  );
}

describe('SpeedDialGroup interaction ownership', () => {
  it('skips native and ARIA disabled actions in both arrow directions', async () => {
    const wrapper = dial();
    const actions = wrapper.findAll('[role=menuitem]');
    (actions[0]!.element as HTMLElement).focus();
    await actions[0]!.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(actions[3]!.element);
    await actions[3]!.trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(actions[0]!.element);
  });
  it('does not reclaim focus from a new target after closing', async () => {
    const wrapper = dial();
    const first = wrapper.get('[aria-label=First]');
    (first.element as HTMLElement).focus();
    await first.trigger('click');
    const next = document.createElement('button');
    document.body.append(next);
    next.focus();
    await new Promise((resolve) => setTimeout(resolve, 45));
    expect(document.activeElement).toBe(next);
  });
  it('restores focus after a controlled close and ignores exit-animation clicks', async () => {
    const open = ref(true);
    const selected = vi.fn();
    const clicked = vi.fn();
    const wrapper = track(
      mount(
        defineComponent({
          render: () =>
            h(
              SpeedDialGroup,
              {
                open: open.value,
                'onUpdate:open': (value) => {
                  open.value = value;
                },
              },
              () => [
                h(SpeedDialGroupTrigger),
                h(SpeedDialGroupAction, { 'aria-label': 'Action', onSelect: selected, onClick: clicked }),
              ],
            ),
        }),
        { attachTo: document.body },
      ),
    );
    const action = wrapper.get('[role=menuitem]');
    (action.element as HTMLElement).focus();
    open.value = false;
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get('[aria-haspopup=menu]').element);
    await action.trigger('click');
    expect(selected).not.toHaveBeenCalled();
    expect(clicked).not.toHaveBeenCalled();
  });
  it('leaves caller-cancelled and composing arrows untouched', async () => {
    const wrapper = dial();
    const action = wrapper.get('[role=menuitem]');
    (action.element as HTMLElement).focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    event.preventDefault();
    action.element.dispatchEvent(event);
    expect(document.activeElement).toBe(action.element);
    await action.trigger('keydown', { key: 'ArrowDown', isComposing: true });
    expect(document.activeElement).toBe(action.element);
  });
});
