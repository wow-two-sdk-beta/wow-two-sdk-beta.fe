import { expect, it } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ColorModeProvider from '@src/foundation/primitives/colorModeProvider/ColorModeProvider.vue';
import { useColorMode } from '@src/foundation/primitives/colorModeProvider/ColorModeContext';

it('honors explicit server-rendered color mode without browser storage', async () => {
  const Probe = defineComponent({
    setup() {
      const mode = useColorMode();
      return () => h('span', mode.mode);
    },
  });
  const app = createSSRApp({ render: () => h(ColorModeProvider, { defaultMode: 'dark' }, () => h(Probe)) });
  expect(await renderToString(app)).toContain('<span>dark</span>');
});
