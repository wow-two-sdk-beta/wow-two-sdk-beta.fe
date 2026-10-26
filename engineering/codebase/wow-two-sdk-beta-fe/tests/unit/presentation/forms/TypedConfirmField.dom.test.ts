import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { TypedConfirmField, useTypedConfirmation } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function render(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}): VueWrapper {
  return track(
    mount(TypedConfirmField, { props: { expected: 'prod-local', ...props }, attrs, attachTo: document.body }),
  );
}

function input(wrapper: VueWrapper): HTMLInputElement {
  return wrapper.get<HTMLInputElement>('input').element;
}

function labelOf(element: HTMLInputElement): HTMLLabelElement | null {
  return document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
}

describe('TypedConfirmField', () => {
  it('labels the input with the expected text shown as code, required and free of autocorrection', () => {
    const wrapper = render();
    const field = input(wrapper);
    const label = labelOf(field)!;
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toMatch(/^Type prod-local to confirm/);
    expect(label.querySelector('code')?.textContent).toBe('prod-local');
    expect(field.required).toBe(true);
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('autocapitalize')).toBe('none');
    expect(field.getAttribute('autocorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
  });

  it('reports each typed change and matches only the exact text', async () => {
    const wrapper = render();
    await wrapper.get('input').setValue('Prod-local');
    expect(wrapper.emitted('update:modelValue')).toEqual([['Prod-local']]);
    expect((wrapper.vm as unknown as { isConfirmed: boolean }).isConfirmed).toBe(false);
    await wrapper.get('input').setValue('prod-local ');
    expect((wrapper.vm as unknown as { isConfirmed: boolean }).isConfirmed).toBe(false);
    await wrapper.get('input').setValue('prod-local');
    expect((wrapper.vm as unknown as { isConfirmed: boolean }).isConfirmed).toBe(true);
    expect(wrapper.find('[data-confirmed]').exists()).toBe(true);
    expect(document.querySelector('[role=status]')?.textContent).toBe('The text matches.');
  });

  it('waits for the reader to leave the input before showing the mismatch, and clears it on a match', async () => {
    const wrapper = render();
    await wrapper.get('input').setValue('prod');
    expect(input(wrapper).getAttribute('aria-invalid')).toBeNull();
    await wrapper.get('input').trigger('blur');
    const field = input(wrapper);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const errorId = field.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toContain('Type prod-local exactly as shown.');
    await wrapper.get('input').setValue('prod-local');
    expect(input(wrapper).getAttribute('aria-invalid')).toBeNull();
  });

  it('shows no mismatch for an emptied input, and lets an error prop replace it', async () => {
    const wrapper = render({ helper: 'Prod on the local server.' });
    await wrapper.get('input').setValue('');
    await wrapper.get('input').trigger('blur');
    expect(input(wrapper).getAttribute('aria-invalid')).toBeNull();
    expect(wrapper.text()).toContain('Prod on the local server.');
    await wrapper.setProps({ error: 'The target is locked.' });
    expect(input(wrapper).getAttribute('aria-invalid')).toBe('true');
    expect(wrapper.text()).toContain('The target is locked.');
    expect(wrapper.text()).not.toContain('Prod on the local server.');
  });

  it('follows a controlled value and never matches an empty expected text', async () => {
    const wrapper = render({ modelValue: 'prod-local' });
    expect(input(wrapper).value).toBe('prod-local');
    expect((wrapper.vm as unknown as { isConfirmed: boolean }).isConfirmed).toBe(true);
    await wrapper.setProps({ modelValue: 'x' });
    expect(input(wrapper).value).toBe('x');
    const empty = render({ expected: '', modelValue: '' });
    expect((empty.vm as unknown as { isConfirmed: boolean }).isConfirmed).toBe(false);
  });

  it('clears its own text when the expected text changes', async () => {
    const wrapper = render();
    await wrapper.get('input').setValue('prod-local');
    await wrapper.setProps({ expected: 'prod-eu' });
    expect(input(wrapper).value).toBe('');
  });

  it('puts class on the field root, other attributes on the input, and disables it on request', async () => {
    const wrapper = render({ isDisabled: true }, { class: 'mt-4', name: 'confirm', 'data-testid': 'typed' });
    expect(wrapper.find('div.mt-4').exists()).toBe(true);
    expect(input(wrapper).name).toBe('confirm');
    expect(input(wrapper).dataset.testid).toBe('typed');
    expect(input(wrapper).disabled).toBe(true);
  });

  it('takes a rich label and localized defaults', () => {
    const localized = track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: { 'TypedConfirmField.label': '{expected} eingeben' } }, () =>
              h(TypedConfirmField, { expected: 'prod-eu' }),
            ),
        }),
        { attachTo: document.body },
      ),
    );
    expect(localized.get('label').text().replace(/\s+/g, ' ').trim()).toMatch(/^prod-eu eingeben/);
    const slotted = track(
      mount(TypedConfirmField, {
        props: { expected: 'prod-eu' },
        slots: { label: () => 'Type the server name' },
        attachTo: document.body,
      }),
    );
    expect(slotted.get('label').text()).toContain('Type the server name');
  });
});

describe('useTypedConfirmation', () => {
  it('confirms on the exact text, drops it when the target changes and sends nothing when not needed', async () => {
    const target = ref('prod-local');
    const needed = ref(true);
    let controls!: ReturnType<typeof useTypedConfirmation>;
    track(
      mount(
        defineComponent({
          setup() {
            controls = useTypedConfirmation(target, { isNeeded: needed });
            return () => h(TypedConfirmField, { expected: target.value, modelValue: controls.typed.value });
          },
        }),
      ),
    );
    expect(controls.isConfirmed.value).toBe(false);
    controls.typed.value = 'prod-local';
    expect(controls.isConfirmed.value).toBe(true);
    expect(controls.confirm.value).toBe('prod-local');
    target.value = 'prod-eu';
    await nextTick();
    expect(controls.typed.value).toBe('');
    expect(controls.isConfirmed.value).toBe(false);
    needed.value = false;
    expect(controls.isConfirmed.value).toBe(true);
    expect(controls.confirm.value).toBeUndefined();
    controls.typed.value = 'x';
    controls.reset();
    expect(controls.typed.value).toBe('');
  });

  it('binds to the field through v-model', async () => {
    let controls!: ReturnType<typeof useTypedConfirmation>;
    const wrapper = track(
      mount(
        defineComponent({
          setup() {
            controls = useTypedConfirmation(() => 'prod-local');
            return () =>
              h(TypedConfirmField, {
                expected: 'prod-local',
                modelValue: controls.typed.value,
                'onUpdate:modelValue': (value: string) => (controls.typed.value = value),
              });
          },
        }),
        { attachTo: document.body },
      ),
    );
    await wrapper.get('input').setValue('prod-local');
    expect(controls.isConfirmed.value).toBe(true);
  });
});
