import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { FormattedRelative, LocaleProvider } from '@src/foundation/i18n';
import { RelativeTime } from '@src/presentation/display';

const RealRelativeTimeFormat = Intl.RelativeTimeFormat;

/* A runtime with no Uzbek patterns: the root "-4 h" / "+4 h". The probe caches per locale, hence the tag. */
function stubChromeUzbek(): void {
  vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(function (
    locale?: string | string[],
    options?: Intl.RelativeTimeFormatOptions,
  ) {
    if (typeof locale !== 'string' || !locale.startsWith('uz')) return new RealRelativeTimeFormat(locale, options);
    return {
      format: (value: number, unit: string) => `${value < 0 ? '-' : '+'}${Math.abs(value)} ${unit[0]}`,
    } as unknown as Intl.RelativeTimeFormat;
  } as never);
}

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

function inLocale(locale: string, child: () => ReturnType<typeof h>): VueWrapper {
  const wrapper = mount(LocaleProvider, { props: { locale }, slots: { default: child } });
  wrappers.push(wrapper);
  return wrapper;
}

const now = Date.UTC(2026, 9, 15, 12, 0, 0);

describe('relative time in Uzbek where the runtime has no Uzbek patterns', () => {
  it('renders FormattedRelative through the SDK wording', async () => {
    stubChromeUzbek();
    const wrapper = inLocale('uz-Latn-UZ-x-fmt', () => h(FormattedRelative, { value: -4, unit: 'hour' }));
    expect(wrapper.text()).toBe('4 soat oldin');
    await wrapper.setProps({ locale: 'uz-Cyrl-x-fmt' });
    expect(wrapper.text()).toBe('4 соат олдин');
    await wrapper.setProps({ locale: 'en-US' });
    expect(wrapper.text()).toBe('4 hours ago');
  });

  it('renders RelativeTime past, future and worded distances', () => {
    stubChromeUzbek();
    const render = (offsetMs: number, props: Record<string, unknown> = {}): string =>
      inLocale('uz-x-rel', () => h(RelativeTime, { value: now + offsetMs, now, hasTooltip: false, ...props })).text();
    expect(render(-4 * 3_600_000)).toBe('4 soat oldin');
    expect(render(4 * 3_600_000)).toBe('4 soatdan keyin');
    expect(render(-86_400_000)).toBe('kecha');
    expect(render(-86_400_000, { numeric: 'always' })).toBe('1 kun oldin');
    expect(render(0)).toBe('hozir');
    expect(render(-3 * 86_400_000, { unitDisplay: 'short' })).toBe('3 kun oldin');
  });
});
