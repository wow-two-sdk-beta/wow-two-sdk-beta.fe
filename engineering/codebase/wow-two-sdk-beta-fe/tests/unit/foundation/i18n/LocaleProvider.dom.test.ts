import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import LocaleProvider from '@src/foundation/i18n/providers/LocaleProvider.vue';
import { useLocale } from '@src/foundation/i18n/providers/LocaleContext';

const Probe = defineComponent({
  setup() {
    const locale = useLocale();
    return () => h('output', `${locale.locale.value}:${locale.t('hello', { name: 'Sam' }, 'Hello {name}')}`);
  },
});

it('updates locale and messages while independent roots keep their values', async () => {
  const first = mount(LocaleProvider, {
    props: { locale: 'en-US', messages: { hello: 'Hello {name}' } },
    slots: { default: () => h(Probe) },
  });
  const second = mount(LocaleProvider, {
    props: { locale: 'de-DE', messages: { hello: 'Hallo {name}' } },
    slots: { default: () => h(Probe) },
  });
  try {
    await first.setProps({ locale: 'fr-FR', messages: { hello: 'Bonjour {name}' } });
    expect(first.text()).toBe('fr-FR:Bonjour Sam');
    expect(second.text()).toBe('de-DE:Hallo Sam');
  } finally {
    first.unmount();
    second.unmount();
  }
  const fallback = mount(Probe);
  expect(fallback.text()).toBe('en-US:Hello Sam');
  fallback.unmount();
});

it('hydrates the deterministic default even when browser preferences differ', async () => {
  const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const Root = defineComponent({ setup: () => () => h(LocaleProvider, {}, () => h(Probe)) });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createSSRApp(Root);
  try {
    host.innerHTML = await renderToString(createSSRApp(Root));
    expect(host.textContent).toBe('en-US:Hello Sam');
    app.mount(host);
    await nextTick();
    expect(host.textContent).toBe('en-US:Hello Sam');
    expect(warning).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    host.remove();
    language.mockRestore();
    warning.mockRestore();
    error.mockRestore();
  }
});
