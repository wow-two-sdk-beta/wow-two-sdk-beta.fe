import { expect, it } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { DeviceClass, TailwindBreakpoints, provideDeviceTargets, useDeviceClass } from '@src/foundation/device';

it('reads desktop on a server with no window, document or matchMedia', async () => {
  const Probe = defineComponent({
    setup() {
      const state = useDeviceClass();
      return () => h('span', `${state.detected.value}/${state.effective.value}`);
    },
  });
  const Root = defineComponent({
    setup() {
      provideDeviceTargets([DeviceClass.Phone], TailwindBreakpoints);
      return () => h(Probe);
    },
  });
  expect(typeof window).toBe('undefined');
  expect(await renderToString(createSSRApp(Root))).toBe('<span>desktop/phone</span>');
});
