import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { Check } from 'lucide-vue-next';
import { Icon } from '@src/foundation/icons';
import { iconsCases } from './IconsCases';
import { assertMounts } from '../../../support/Smoke';

describe('foundation/icons — mounts', () => {
  for (const testCase of iconsCases) {
    it(`${testCase.name} mounts`, async () => {
      await assertMounts(testCase);
    });
  }
});

it('updates decorative semantics when a fallthrough accessible label changes', async () => {
  const label = ref<string>();
  const wrapper = mount(defineComponent({ setup: () => () => h(Icon, { icon: Check, 'aria-label': label.value }) }));
  try {
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true');
    label.value = 'Completed';
    await nextTick();
    expect(wrapper.get('svg').attributes('aria-hidden')).toBeUndefined();
    expect(wrapper.get('svg').attributes('role')).toBe('img');
    label.value = undefined;
    await nextTick();
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true');
  } finally {
    wrapper.unmount();
  }
});
