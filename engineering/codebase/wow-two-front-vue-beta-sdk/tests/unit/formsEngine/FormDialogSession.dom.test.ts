import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive, type PropType } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useFormDialogSession, type AppForm, type FormEngine } from '@src/formsEngine';
import { houseFormEngine } from '@src/formsEngine/adapters/house';
import { tanstackFormEngine } from '@src/formsEngine/adapters/tanstack';

interface Product {
  readonly name: string;
}
interface ProductForm {
  name: string;
}

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

const engines: ReadonlyArray<readonly [string, FormEngine]> = [
  ['house', houseFormEngine],
  ['tanstack', tanstackFormEngine],
];

describe.each(engines)('useFormDialogSession (%s)', (_name, engine) => {
  function harness(onOpen = vi.fn()) {
    let form!: AppForm<ProductForm>;
    // `open` is declared first, so Vue writes it before `product` in every update — the order a sync watcher trips on.
    const Dialog = defineComponent({
      props: { open: Boolean, product: { type: Object as PropType<Product | null>, default: null } },
      setup(props) {
        form = engine.useAppForm<ProductForm>({
          defaultValues: { name: '' },
          onSubmit: async () => ({ ok: true, value: undefined }) as never,
        });
        useFormDialogSession(form, {
          open: () => props.open,
          initialValues: () => ({ name: props.product?.name ?? '' }),
          onOpen,
        });
        return () => h('div');
      },
    });
    const state = reactive<{ open: boolean; product: Product | null }>({ open: false, product: { name: 'Vault' } });
    const wrapper = mount({ render: () => h(Dialog, { open: state.open, product: state.product }) });
    wrappers.push(wrapper);
    return { state, form: () => form, onOpen };
  }

  it('starts each session from the record the opening update selects', async () => {
    const { state, form, onOpen } = harness();
    state.open = true;
    await nextTick();
    expect(form().values.name).toBe('Vault');

    state.open = false;
    await nextTick();
    // "New" — the parent clears the record and opens in one update.
    state.product = null;
    state.open = true;
    await nextTick();
    expect(form().values.name).toBe('');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('keeps edits while the dialog stays open', async () => {
    const { state, form } = harness();
    state.open = true;
    await nextTick();
    form().setValue('name', 'Edited');
    state.product = { name: 'Refetched' };
    await nextTick();
    expect(form().values.name).toBe('Edited');
  });
});
