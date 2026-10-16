import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import Group from '@src/presentation/display/stepperGroup/StepperGroup.vue';
import Step from '@src/presentation/display/stepperGroup/StepperGroupStep.vue';
import List from '@src/presentation/display/stepperGroup/StepperGroupList.vue';
const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
describe('step registration', () => {
  it('updates a renamed step in place and releases exactly its own registration', async () => {
    const value = ref('first');
    const visible = ref(true);
    const wrapper = mount({
      setup: () => () =>
        h(
          Group,
          { modelValue: value.value },
          {
            default: () =>
              h(List, null, {
                default: () => [
                  visible.value && h(Step, { value: value.value }, () => 'First'),
                  h(Step, { value: 'second', description: 0 }, () => 'Second'),
                ],
              }),
          },
        ),
    });
    wrappers.push(wrapper);
    await nextTick();
    value.value = 'renamed';
    await nextTick();
    expect(wrapper.findAll('[role="tab"]')[0]!.attributes('data-status')).toBe('active');
    expect(wrapper.findAll('[role="tab"]')[0]!.text()).toContain('1');
    expect(wrapper.findAll('[role="tab"]')[1]!.text()).toContain('0');
    visible.value = false;
    await nextTick();
    expect(wrapper.get('[role="tab"]').text()).toContain('1');
  });
});
