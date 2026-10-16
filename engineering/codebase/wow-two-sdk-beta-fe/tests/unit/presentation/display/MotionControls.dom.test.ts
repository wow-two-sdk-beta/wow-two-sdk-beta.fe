import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Carousel, MarqueeGroup, TypewriterText } from '@src/presentation/display';

const mounted: VueWrapper[] = [];
const advance = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

describe('persistent motion controls', () => {
  it('keeps marquee pause after the pointer leaves and makes the duplicate inert', async () => {
    const wrapper = mount(MarqueeGroup, { slots: { default: '<a href="#target">Item</a>' } });
    mounted.push(wrapper);
    await wrapper.get('button').trigger('click');
    await wrapper.trigger('mouseleave');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[aria-hidden="true"]').attributes()).toHaveProperty('inert');
    expect(wrapper.html()).toContain('animation-play-state: paused');
  });

  it('stops typewriter timers until the reader resumes', async () => {
    const wrapper = mount(TypewriterText, { props: { text: ['First', 'Second'], typeSpeed: 10 } });
    mounted.push(wrapper);
    await advance(30);
    await wrapper.get('button').trigger('click');
    const before = wrapper.get('[aria-hidden="true"]').text();
    await advance(100);
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe(before);
    expect(wrapper.get('.sr-only').text()).toBe('First Second');
    await wrapper.get('button').trigger('click');
    await advance(30);
    expect(wrapper.get('[aria-hidden="true"]').text()).not.toBe(before);
  });

  it('does not resume a user-paused carousel on pointer leave', async () => {
    const wrapper = mount(Carousel, { props: { slidesCount: 3, autoPlay: 20, canLoop: true } });
    mounted.push(wrapper);
    await nextTick();
    await advance(35);
    expect(wrapper.emitted('update:index')?.length).toBeGreaterThan(0);
    await wrapper.get('button').trigger('click');
    await wrapper.trigger('mouseenter');
    await wrapper.trigger('mouseleave');
    const count = wrapper.emitted('update:index')?.length;
    await advance(100);
    expect(wrapper.emitted('update:index')).toHaveLength(count!);
  });
});
