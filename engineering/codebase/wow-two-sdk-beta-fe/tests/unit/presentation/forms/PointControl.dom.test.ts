import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import PointControl from '@src/presentation/forms/pointControl/PointControl.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('PointControl', () => {
  it('supports keyboard movement, clamping and gesture events', async () => {
    const wrapper = mount(PointControl, {
      props: { ariaLabel: 'Texture anchor', defaultValue: { x: 0.95, y: 0.5 }, step: 0.1 },
    });
    wrappers.push(wrapper);
    const slider = wrapper.get('[role="slider"]');
    await slider.trigger('keydown', { key: 'ArrowRight' });
    await slider.trigger('keyup', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ x: 1, y: 0.5 }]);
    expect(wrapper.emitted('interaction-start')).toHaveLength(1);
    expect(wrapper.emitted('interaction-end')).toHaveLength(1);
    await slider.trigger('keydown', { key: 'Home' });
    expect(slider.attributes('aria-valuetext')).toBe('x 0%, y 0%');
  });

  it('maps captured pointer coordinates into model updates', async () => {
    const wrapper = mount(PointControl, {
      props: { ariaLabel: 'Texture anchor', defaultValue: { x: 0.5, y: 0.5 } },
    });
    wrappers.push(wrapper);
    const element = wrapper.get('[role="slider"]').element as HTMLDivElement;
    let captured = false;
    element.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120, x: 10, y: 20, toJSON() {} }) as DOMRect;
    element.setPointerCapture = () => {
      captured = true;
    };
    element.hasPointerCapture = () => captured;
    element.releasePointerCapture = () => {
      captured = false;
    };
    await wrapper.get('[role="slider"]').trigger('pointerdown', { pointerId: 1, clientX: 60, clientY: 95 });
    await wrapper.get('[role="slider"]').trigger('pointerup', { pointerId: 1, clientX: 210, clientY: 20 });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ x: 1, y: 0 }]);
    expect(wrapper.emitted('interaction-start')).toHaveLength(1);
    expect(wrapper.emitted('interaction-end')).toHaveLength(1);
  });

  it('removes disabled controls from tab order and suppresses input', async () => {
    const wrapper = mount(PointControl, {
      props: { ariaLabel: 'Texture anchor', disabled: true },
    });
    wrappers.push(wrapper);
    const slider = wrapper.get('[role="slider"]');
    expect(slider.attributes('tabindex')).toBe('-1');
    expect(slider.attributes('aria-disabled')).toBe('true');
    await slider.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
