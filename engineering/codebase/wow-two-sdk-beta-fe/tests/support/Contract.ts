import { h, nextTick, ref, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import { expect } from 'vitest';

/**
 * Round-trips `v-model` on a text-shaped control: writes through the DOM, asserts the parent's
 * ref received it, then asserts the control renders the value it was handed back.
 *
 * Both halves matter. A control that emits `update:modelValue` but ignores the prop coming back
 * looks correct in any test that only checks the emit, and then silently refuses every
 * programmatic reset a real form does.
 */
export async function assertTextVModel(
  name: string,
  component: Component,
  extraProps: Record<string, unknown> = {},
  selector = 'input',
): Promise<void> {
  const model = ref('');
  const wrapper = mount({
    name: `${name}VModelHarness`,
    render: () =>
      h(component, {
        ...extraProps,
        modelValue: model.value,
        'onUpdate:modelValue': (next: string) => {
          model.value = next;
        },
      }),
  });

  const field = wrapper.find(selector);
  expect(field.exists(), `${name} rendered no \`${selector}\` to model`).toBe(true);

  await field.setValue('round trip');
  expect(model.value, `${name} did not write through \`update:modelValue\``).toBe('round trip');

  await nextTick();
  expect(
    (field.element as HTMLInputElement | HTMLTextAreaElement).value,
    `${name} did not read the modelled value back`,
  ).toBe('round trip');

  wrapper.unmount();
}

/** Round-trips `v-model` on a boolean control — checkbox, switch, radio. */
export async function assertBooleanVModel(
  name: string,
  component: Component,
  extraProps: Record<string, unknown> = {},
  selector = 'input',
): Promise<void> {
  const model = ref(false);
  const wrapper = mount({
    name: `${name}VModelHarness`,
    render: () =>
      h(component, {
        ...extraProps,
        modelValue: model.value,
        'onUpdate:modelValue': (next: boolean) => {
          model.value = next;
        },
      }),
  });

  const field = wrapper.find(selector);
  expect(field.exists(), `${name} rendered no \`${selector}\` to model`).toBe(true);

  await field.setValue(true);
  expect(model.value, `${name} did not write through \`update:modelValue\``).toBe(true);

  await nextTick();
  expect((field.element as HTMLInputElement).checked, `${name} did not read the modelled value back`).toBe(true);

  wrapper.unmount();
}

/**
 * Asserts `aria-label` reaches the DOM.
 *
 * The port's rule: a hyphenated prop declared in `defineProps` is camelized by Vue, so a
 * declared `'aria-label'` arrives as `props.ariaLabel`, is stripped from `attrs`, and renders
 * nowhere — the component ends up with no accessible name at all. Components that relocate the
 * label onto an inner element have to read it off `attrs`; this is what proves they still do.
 */
export function assertAriaLabelReachesDom(
  name: string,
  component: Component,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => unknown>,
): void {
  const label = `smoke-${name}-label`;
  const wrapper = mount(component, { props: { ...props, 'aria-label': label }, slots });

  const labelled =
    wrapper.find(`[aria-label="${label}"]`).exists() || document.body.querySelector(`[aria-label="${label}"]`) !== null;

  expect(labelled, `${name} dropped its \`aria-label\` — no element carries it`).toBe(true);
  wrapper.unmount();
}
