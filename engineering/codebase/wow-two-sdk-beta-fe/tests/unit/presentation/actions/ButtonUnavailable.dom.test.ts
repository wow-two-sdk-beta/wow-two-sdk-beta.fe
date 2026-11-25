import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import Button from '@src/presentation/actions/button/Button.vue';
import { ButtonGroup } from '@src/presentation/actions';

const Reason = 'No link to the original';
const Name = 'Open the original';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function render(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}, slot?: () => unknown) {
  const wrapper = mount(Button, {
    props: { isUnavailable: true, unavailableLabel: Reason, shape: 'circle', variant: 'glass', ...props },
    attrs: { 'aria-label': Name, ...attrs },
    slots: { default: slot ?? (() => h('svg', { class: 'arrow' })) },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

/** The text of every element `aria-describedby` names, joined the way the accessible description reads them. */
function description(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

function click(element: Element): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

function key(element: Element, type: 'keydown' | 'keyup', name: string): KeyboardEvent {
  const event = new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

describe('unavailable button', () => {
  it('stays in the tab order with aria-disabled', () => {
    const button = render().get('button');
    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.attributes('tabindex')).toBeUndefined();
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(button.attributes('data-state')).toBe('unavailable');
    (button.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(button.element);
  });

  it('emits no press and runs no click handler on click, Enter or Space', () => {
    const onClick = vi.fn();
    const onPressStart = vi.fn();
    const onPressEnd = vi.fn();
    const button = render({}, { onClick, onPressStart, onPressEnd }).get('button').element;

    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, button: 0 }));
    expect(click(button).defaultPrevented).toBe(true);
    for (const name of ['Enter', ' ']) {
      expect(key(button, 'keydown', name).defaultPrevented).toBe(true);
      expect(key(button, 'keyup', name).defaultPrevented).toBe(true);
    }

    expect(onClick).not.toHaveBeenCalled();
    expect(onPressStart).not.toHaveBeenCalled();
    expect(onPressEnd).not.toHaveBeenCalled();
  });

  it('describes itself with the label without hovering, keeping its name and the caller ids', () => {
    const button = render({}, { 'aria-describedby': 'card-hint' }).get('button');
    const hint = document.createElement('p');
    hint.id = 'card-hint';
    hint.textContent = 'Card hint';
    document.body.append(hint);

    expect(button.attributes('aria-label')).toBe(Name);
    expect(description(button.element)).toBe(`Card hint ${Reason}`);
    const copy = document.getElementById(button.attributes('aria-describedby')!.split(' ')[1]!)!;
    expect(copy.hidden).toBe(true);
    expect(button.element.contains(copy)).toBe(true);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('shows the label through Tooltip on hover and describes it once while open', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const button = render().get('button');

    await button.trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(700);
    const tooltip = document.querySelector('[role=tooltip]');
    expect(tooltip?.textContent).toBe(Reason);
    expect(button.attributes('aria-describedby')).toBe(tooltip?.id);
    expect(description(button.element)).toBe(Reason);

    await button.trigger('pointerleave');
    await vi.advanceTimersByTimeAsync(201);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    expect(description(button.element)).toBe(Reason);
  });

  it('becomes an ordinary button again, without its tooltip, once available', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const onClick = vi.fn();
    const wrapper = render({}, { onClick });
    const element = wrapper.get('button').element;
    await wrapper.setProps({ isUnavailable: false });

    const button = wrapper.get('button');
    expect(button.element).toBe(element);
    expect(button.attributes('aria-disabled')).toBeUndefined();
    expect(button.attributes('data-state')).toBeUndefined();
    expect(button.attributes('aria-describedby')).toBeUndefined();
    expect(button.classes()).not.toContain('border-dashed');
    expect(click(button.element).defaultPrevented).toBe(false);
    expect(onClick).toHaveBeenCalledTimes(1);

    await button.trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('draws the dashed, dimmed box everywhere and the slash on the icon shapes only', async () => {
    const wrapper = render();
    const classes = () => wrapper.get('button').classes();
    expect(classes()).toEqual(expect.arrayContaining(['border-dashed', 'opacity-60', 'border-current/40']));
    expect(classes()).toContain('after:rotate-45');
    expect(classes()).not.toContain('border-white/10');

    await wrapper.setProps({ shape: 'square', variant: 'glass-surface', tone: 'primary' });
    expect(classes()).toContain('after:rotate-45');
    expect(classes()).toContain('border-current/40');
    expect(classes()).not.toContain('border-primary/50');

    await wrapper.setProps({ shape: 'default' });
    expect(classes()).toContain('border-dashed');
    expect(classes().some((name) => name.startsWith('after:'))).toBe(false);
  });

  it("yields its positioning to the caller's class", () => {
    const button = render({}, { class: 'absolute top-3 right-3' }).get('button');
    expect(button.classes()).toContain('absolute');
    expect(button.classes()).not.toContain('relative');
  });

  it('lets disabled, loading and skeleton win', async () => {
    const wrapper = render({ isDisabled: true });
    const button = () => wrapper.get('button');
    expect(button().attributes('data-state')).toBe('disabled');
    expect(button().attributes('tabindex')).toBe('-1');
    expect(button().attributes('aria-describedby')).toBeUndefined();
    expect(button().classes()).not.toContain('border-dashed');

    await wrapper.setProps({ isDisabled: undefined, isLoading: true });
    expect(button().attributes('data-state')).toBe('loading');
    expect(button().attributes('aria-describedby')).toBeUndefined();

    await wrapper.setProps({ isLoading: undefined, isSkeleton: true });
    expect(button().attributes('data-state')).toBe('skeleton');
  });

  it('keeps an unavailable link from navigating, rendered through as', () => {
    const link = render({}, { as: 'a', href: '/original' }).get('a');
    expect(link.attributes('aria-disabled')).toBe('true');
    expect(click(link.element).defaultPrevented).toBe(true);
    const middle = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 });
    link.element.dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(true);
    expect(key(link.element, 'keydown', 'Enter').defaultPrevented).toBe(true);
    expect(description(link.element)).toBe(Reason);
  });

  it('keeps a slotted link from navigating and composes the reason inside it', () => {
    const child = vi.fn();
    const wrapper = render({ asChild: true }, {}, () =>
      h('a', { href: '/original', target: '_blank', onClick: child }, [h('svg', { class: 'arrow' })]),
    );
    const link = wrapper.get('a');
    expect(link.attributes('aria-disabled')).toBe('true');
    expect(link.attributes('tabindex')).toBeUndefined();
    expect(click(link.element).defaultPrevented).toBe(true);
    expect(child).not.toHaveBeenCalled();
    expect(description(link.element)).toBe(Reason);
    expect(link.element.querySelector('[hidden]')?.textContent).toBe(Reason);
    expect(link.find('svg.arrow').exists()).toBe(true);
  });

  it("keeps the last button of a ButtonGroup its group's last child", () => {
    const wrapper = mount(ButtonGroup, {
      slots: {
        default: () => [
          h(Button, { variant: 'outline' }, () => 'Left'),
          h(Button, { variant: 'outline', isUnavailable: true, unavailableLabel: Reason }, () => 'Right'),
        ],
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    const buttons = wrapper.findAll('button');
    expect(buttons[1]!.element.parentElement!.lastElementChild).toBe(buttons[1]!.element);
  });
});
