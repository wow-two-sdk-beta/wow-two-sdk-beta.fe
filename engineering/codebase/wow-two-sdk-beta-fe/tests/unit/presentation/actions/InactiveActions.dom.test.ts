import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router';
import Button from '@src/presentation/actions/button/Button.vue';
import { Primitive } from '@src/foundation/primitives/slot';

afterEach(() => {
  vi.useRealTimers();
});

describe('inactive activation ownership', () => {
  it.each(['isDisabled', 'isLoading', 'isSkeleton'] as const)('blocks child actions during %s', async (state) => {
    const child = vi.fn();
    const caller = vi.fn();
    const wrapper = mount(Button, {
      props: { asChild: true, [state]: true },
      attrs: { onClick: caller },
      slots: { default: () => h('a', { href: '#destination', onClick: child, tabindex: 0 }, 'Open') },
    });
    try {
      const link = wrapper.get('a');
      expect(link.attributes('aria-disabled')).toBe('true');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(child).not.toHaveBeenCalled();
      expect(caller).not.toHaveBeenCalled();
      if (state === 'isDisabled') expect(link.attributes('tabindex')).toBe('-1');
    } finally {
      wrapper.unmount();
    }
  });

  it('prevents RouterLink navigation before its own click handler', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {} },
        { path: '/target', component: {} },
      ],
    });
    await router.push('/');
    const wrapper = mount(Button, {
      props: { asChild: true, isLoading: true },
      global: { plugins: [router] },
      slots: { default: () => h(RouterLink, { to: '/target' }, () => 'Open') },
    });
    try {
      await wrapper.get('a').trigger('click');
      await nextTick();
      expect(router.currentRoute.value.path).toBe('/');
    } finally {
      wrapper.unmount();
    }
  });

  it('preserves enabled child-first cancellation', async () => {
    const caller = vi.fn();
    const child = vi.fn((event: Event) => event.preventDefault());
    const wrapper = mount(Button, {
      props: { asChild: true },
      attrs: { onClick: caller },
      slots: { default: () => h('a', { href: '#target', onClick: child }, 'Open') },
    });
    try {
      await wrapper.get('a').trigger('click');
      expect(child).toHaveBeenCalledTimes(1);
      expect(caller).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('blocks activation keys but keeps disabled roving-navigation keys available', async () => {
    const key = vi.fn();
    const wrapper = mount(Primitive, {
      props: { as: 'div' },
      attrs: { 'aria-disabled': true, onKeydown: key },
    });
    try {
      await wrapper.trigger('keydown', { key: 'Enter' });
      await wrapper.trigger('keydown', { key: ' ' });
      expect(key).not.toHaveBeenCalled();
      await wrapper.trigger('keydown', { key: 'ArrowDown' });
      expect(key).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('cancels an armed long press when disabled', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const press = vi.fn();
    const wrapper = mount(Button, { attrs: { onLongPress: press }, slots: { default: 'Hold' } });
    try {
      await wrapper.get('button').trigger('pointerdown', { button: 0 });
      expect(wrapper.emitted('press-start')).toHaveLength(1);
      await wrapper.setProps({ isDisabled: true });
      vi.advanceTimersByTime(1000);
      expect(press).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
      vi.useRealTimers();
    }
  });
  it('releases a pointer press on leave so a later gesture can start', async () => {
    const wrapper = mount(Button, { slots: { default: 'Press' } });
    try {
      await wrapper.get('button').trigger('pointerdown', { button: 0 });
      await wrapper.get('button').trigger('pointerleave');
      await wrapper.get('button').trigger('pointerdown', { button: 0 });
      await wrapper.get('button').trigger('pointerup');
      expect(wrapper.emitted('press-start')).toHaveLength(2);
      expect(wrapper.emitted('press-end')).toHaveLength(2);
    } finally {
      wrapper.unmount();
    }
  });
  it('ignores secondary pointer buttons and composing activation keys', async () => {
    const wrapper = mount(Button, { slots: { default: 'Press' } });
    try {
      await wrapper.get('button').trigger('pointerdown', { button: 2 });
      await wrapper.get('button').trigger('keydown', { key: 'Enter', isComposing: true });
      expect(wrapper.emitted('press-start')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });
});
