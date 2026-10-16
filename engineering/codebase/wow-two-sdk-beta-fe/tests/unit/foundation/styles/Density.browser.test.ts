import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import '@src/index.css';
import { Density } from '@src/foundation/styles';
import { Button } from '@src/presentation/actions';
import { TextInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function heights(density: Density | undefined): { button: number; input: number; fontSize: string } {
  const wrapper = mount(
    {
      render: () =>
        h('div', { 'data-density': density }, [h(Button, null, () => 'Save'), h(TextInput, { 'aria-label': 'Name' })]),
    },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  const button = wrapper.get('button').element as HTMLElement;
  const input = wrapper.get('input').element as HTMLElement;
  return {
    button: button.getBoundingClientRect().height,
    input: input.getBoundingClientRect().height,
    fontSize: getComputedStyle(button).fontSize,
  };
}

describe('data-density', () => {
  it('scales control heights around the default, leaving type alone', () => {
    const base = heights(undefined);
    const compact = heights(Density.Compact);
    const comfortable = heights(Density.Comfortable);
    const spacious = heights(Density.Spacious);
    expect(comfortable).toEqual(base);
    expect(compact.button).toBeCloseTo(base.button * 0.875, 0);
    expect(spacious.button).toBeCloseTo(base.button * 1.125, 0);
    expect(compact.input).toBeLessThan(base.input);
    expect(spacious.input).toBeGreaterThan(base.input);
    expect(new Set([compact.fontSize, base.fontSize, spacious.fontSize]).size).toBe(1);
  });

  it('lets a region return to the default inside a denser parent', () => {
    const wrapper = mount(
      {
        render: () =>
          h('div', { 'data-density': Density.Compact }, [
            h('div', { 'data-density': Density.Comfortable }, [h(Button, null, () => 'Inner')]),
          ]),
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const inner = wrapper.get('button').element.getBoundingClientRect().height;
    expect(inner).toBeCloseTo(heights(undefined).button, 0);
  });
});
