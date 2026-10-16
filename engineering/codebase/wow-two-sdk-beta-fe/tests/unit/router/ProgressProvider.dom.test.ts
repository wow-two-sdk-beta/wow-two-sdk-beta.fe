import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import ProgressProvider from '@src/router/ProgressProvider.vue';
import { createNavigationProgress, useNavigationProgress } from '@src/router/hooks/UseNavigationProgress';

it('follows state replacement while existing spans finish on their original state', async () => {
  const first = createNavigationProgress();
  const second = createNavigationProgress();
  const selected = shallowRef(first);
  let begin: () => () => void;
  const Probe = defineComponent({
    setup() {
      const progress = useNavigationProgress();
      begin = progress.begin;
      return () => h('output', String(progress.isBusy));
    },
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () => h(ProgressProvider, { state: selected.value }, () => h(Probe)),
    }),
  );
  try {
    const finishFirst = begin!();
    await nextTick();
    expect(wrapper.text()).toBe('true');
    selected.value = second;
    await nextTick();
    expect(wrapper.text()).toBe('false');
    const finishSecond = begin!();
    finishFirst();
    await nextTick();
    expect(first.isBusy).toBe(false);
    expect(second.isBusy).toBe(true);
    expect(wrapper.text()).toBe('true');
    finishSecond();
    await nextTick();
    expect(wrapper.text()).toBe('false');
  } finally {
    wrapper.unmount();
  }
});
