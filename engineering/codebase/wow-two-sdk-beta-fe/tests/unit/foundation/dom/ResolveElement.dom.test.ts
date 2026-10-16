import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref, type Component } from 'vue';
import { resolveElement } from '@src/foundation/dom';
import { Button } from '@src/presentation/actions';
import { Popover, PopoverContent, PopoverTrigger } from '@src/presentation/overlays';

/*
 * A template that opens with a comment renders a fragment in a development build (production strips comments), so
 * `$el` is the fragment's empty start anchor. Anything that reads a trigger's element — anchoring, focus return,
 * roving focus — must step past it.
 */

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function render(component: Component, props: Record<string, unknown> = {}, slots = {}): VueWrapper {
  const wrapper = mount(component, { props, slots, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

describe('element resolution past fragment roots', () => {
  it('finds the element a comment-led component renders, and nothing from a bare text root', () => {
    const button = render(Button, {}, { default: () => 'Save' });
    expect(resolveElement(button.vm)?.tagName).toBe('BUTTON');
    const text = document.createTextNode('plain');
    document.body.append(text, document.createElement('div'));
    expect(resolveElement(text)).toBeNull();
    expect(resolveElement(null)).toBeNull();
  });

  it('anchors an as-child popover trigger on the SDK button it wraps', async () => {
    const trigger = ref<{ el: HTMLElement | null } | null>(null);
    render({
      render: () =>
        h(Popover, null, () => [
          h(PopoverTrigger, { asChild: true, ref: trigger }, () => h(Button, null, () => 'Open')),
          h(PopoverContent, () => 'Panel'),
        ]),
    });
    await settle();
    expect(trigger.value?.el?.tagName).toBe('BUTTON');
    expect(trigger.value?.el?.textContent).toContain('Open');
  });
});
