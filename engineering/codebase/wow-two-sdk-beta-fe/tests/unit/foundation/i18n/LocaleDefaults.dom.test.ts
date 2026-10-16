import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { provideLocale, useLocaleDefaults, type Messages } from '@src/foundation/i18n';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('localized default props', () => {
  it('tracks changing provider messages and only fills undefined caller text', async () => {
    const source = reactive<{ label?: string; count: number; render?: string | (() => string) }>({ count: 3 });
    const messages = shallowRef<Messages>({ 'Control.label': 'Translated' });
    let view!: ReturnType<typeof useLocaleDefaults<typeof source, { label: string; render: string }>>;
    const Child = defineComponent({
      setup() {
        const props = useLocaleDefaults(source, 'Control', { label: 'Fallback', render: 'Render' });
        view = props;
        expectTypeOf(props.label).toEqualTypeOf<string>();
        expectTypeOf(props.render).toEqualTypeOf<string | (() => string)>();
        return () => h('span', props.label);
      },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          provideLocale('en-US', messages);
          return () => h(Child);
        },
      }),
    );
    wrappers.push(wrapper);
    expect(wrapper.text()).toBe('Translated');
    messages.value = { 'Control.label': 'Changed' };
    await nextTick();
    expect(wrapper.text()).toBe('Changed');
    source.label = '';
    await nextTick();
    expect(wrapper.text()).toBe('');
    const render = () => 'Caller';
    source.render = render;
    expect(view.render).toBe(render);
    expect(view.count).toBe(3);
    expect(() => Reflect.set(view, 'label', 'mutation')).not.toThrow();
    expect(Reflect.set(view, 'label', 'mutation')).toBe(false);
    expect(source.label).toBe('');
    source.label = undefined;
    await nextTick();
    expect(wrapper.text()).toBe('Changed');
  });

  it('supports frozen inputs and enumerates missing fallback props safely', () => {
    let props!: { readonly label: string };
    const wrapper = mount(
      defineComponent({
        setup() {
          props = useLocaleDefaults(Object.freeze({ label: undefined as string | undefined }), 'Control', {
            label: 'Fallback',
          });
          return () => h('span', props.label);
        },
      }),
    );
    wrappers.push(wrapper);
    expect(wrapper.text()).toBe('Fallback');
    expect(Object.keys(props)).toEqual(['label']);
    expect({ ...props }).toEqual({ label: 'Fallback' });
  });
});
