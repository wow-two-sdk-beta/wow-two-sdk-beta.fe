import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { interpolate, provideLocale, resolveMessage, useLocale, type Messages } from '@src/foundation/i18n';

describe('message resolver ownership', () => {
  it('treats a direct translator as a value rather than a getter', () => {
    const translate = vi.fn((key: string) => `translated:${key}`);
    let locale!: ReturnType<typeof useLocale>;
    const wrapper = mount(
      defineComponent({
        setup() {
          locale = provideLocale('en-US', translate);
          return () => null;
        },
      }),
    );
    expect(translate).not.toHaveBeenCalled();
    expect(locale.t('hello')).toBe('translated:hello');
    expect(translate).toHaveBeenCalledExactlyOnceWith('hello', undefined);
    wrapper.unmount();
  });

  it('reads ref and computed translator replacements reactively', async () => {
    const messages = shallowRef<Messages>({ hello: 'first' });
    const Child = defineComponent({
      setup() {
        const locale = useLocale();
        return () => h('span', locale.t('hello'));
      },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          provideLocale(
            'en-US',
            computed(() => messages.value),
          );
          return () => h(Child);
        },
      }),
    );
    expect(wrapper.text()).toBe('first');
    messages.value = (key) => `second:${key}`;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('second:hello');
    wrapper.unmount();
  });

  it('resolves only own dictionary and interpolation keys', () => {
    expect(resolveMessage({}, 'constructor', {}, 'fallback')).toBe('fallback');
    expect(resolveMessage({}, '__proto__')).toBe('__proto__');
    expect(interpolate('{constructor} {name}', { name: 'Sam' })).toBe('{constructor} Sam');
    const messages = JSON.parse('{"__proto__":"safe"}') as Messages;
    expect(resolveMessage(messages, '__proto__')).toBe('safe');
  });
});
