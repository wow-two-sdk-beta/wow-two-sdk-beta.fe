import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { Temporal } from 'temporal-polyfill';
import ColorPicker from '@src/presentation/forms/colorPicker/ColorPicker.vue';
import ColorSliderInput from '@src/presentation/forms/colorSliderInput/ColorSliderInput.vue';
import ColorArea from '@src/presentation/forms/colorArea/ColorArea.vue';
import DateInput from '@src/presentation/forms/dateInput/DateInput.vue';
import DateTimeInput from '@src/presentation/forms/dateTimeInput/DateTimeInput.vue';
import CalendarPicker from '@src/presentation/forms/calendarPicker/CalendarPicker.vue';
import TimeInput from '@src/presentation/forms/timeInput/TimeInput.vue';
import TimePicker from '@src/presentation/forms/timePicker/TimePicker.vue';
import TimeColumns from '@src/presentation/forms/TimeColumns.vue';
import ToggleInput from '@src/presentation/forms/toggleInput/ToggleInput.vue';
import SortableGroup from '@src/presentation/forms/sortableGroup/SortableGroup.vue';
import SortableGroupItem from '@src/presentation/forms/sortableGroup/SortableGroupItem.vue';
import SortableGroupHandle from '@src/presentation/forms/sortableGroup/SortableGroupHandle.vue';
import SelectPicker from '@src/presentation/forms/selectPicker/SelectPicker.vue';
import SelectPickerTrigger from '@src/presentation/forms/selectPicker/SelectPickerTrigger.vue';
import SelectPickerContent from '@src/presentation/forms/selectPicker/SelectPickerContent.vue';
import SelectPickerItem from '@src/presentation/forms/selectPicker/SelectPickerItem.vue';
import { useSelectContext } from '@src/presentation/forms/selectPicker/SelectPickerContext';
import ListboxPicker from '@src/presentation/forms/listboxPicker/ListboxPicker.vue';
import ListboxPickerItem from '@src/presentation/forms/listboxPicker/ListboxPickerItem.vue';
import { FormControlProvider } from '@src/foundation/primitives';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
const panel = { PopoverContent: { template: '<div><slot /></div>' } };
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

describe('color editing', () => {
  it('synchronizes externally changed alpha before the next hue edit', async () => {
    const wrapper = track(
      mount(ColorPicker, { props: { modelValue: '#ff000080', hasAlpha: true }, global: { stubs: panel } }),
    );
    await wrapper.setProps({ modelValue: '#ff000020' });
    const sliders = wrapper.findAllComponents(ColorSliderInput);
    expect(sliders.find((slider) => slider.props('channel') === 'alpha')?.props('modelValue')).toBe(32 / 255);
    sliders.find((slider) => slider.props('channel') === 'hue')?.vm.$emit('update:modelValue', 120);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['#00ff0020']);
  });
  it('exposes two independently operable color axes with valid slider metadata', async () => {
    const wrapper = track(mount(ColorArea, { props: { defaultSaturation: 0.5, defaultValue: 0.6 } }));
    const sliders = wrapper.findAll('[role=slider]');
    expect(sliders).toHaveLength(2);
    expect(sliders.map((slider) => slider.attributes('aria-valuenow'))).toEqual(['50', '60']);
    await sliders[0]!.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:saturation')?.at(-1)).toEqual([0]);
    expect(wrapper.emitted('update:value')).toBeUndefined();
    await sliders[1]!.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([1]);
  });
  it('does not emit NaN from an unmeasurable area', async () => {
    const wrapper = track(mount(ColorArea));
    await wrapper.get('[role=group]').trigger('pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    expect(wrapper.emitted('update:saturation')).toBeUndefined();
  });
});

describe('bounded temporal controls', () => {
  const min = Temporal.PlainDateTime.from('2026-09-25T10:32');
  const max = Temporal.PlainDateTime.from('2026-09-25T12:00');
  it('rejects typed dates and datetimes outside their advertised bounds', async () => {
    for (const [component, props, value] of [
      [DateInput, { min: min.toPlainDate() }, '2020-01-01'],
      [DateTimeInput, { min, max }, '2026-09-25 09:00'],
    ] as const) {
      const wrapper = track(mount(component as Component, { props }));
      await wrapper.get('input[type=text]').setValue(value);
      await wrapper.get('input[type=text]').trigger('blur');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect((wrapper.get('input[type=text]').element as HTMLInputElement).value).toBe('');
    }
  });
  it('clamps date picks to datetime boundaries and rejects invalid time changes', () => {
    const wrapper = track(mount(DateTimeInput, { props: { min, max }, global: { stubs: panel } }));
    wrapper.findComponent(CalendarPicker).vm.$emit('update:modelValue', min.toPlainDate());
    expect((wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Temporal.PlainDateTime).equals(min)).toBe(true);
    const count = wrapper.emitted('update:modelValue')?.length;
    wrapper.findComponent(TimeColumns).vm.$emit('update:modelValue', Temporal.PlainTime.from('09:00'));
    expect(wrapper.emitted('update:modelValue')).toHaveLength(count!);
  });
  it('preserves read-only behavior through open popup controls and form context', async () => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () => h(FormControlProvider, { isReadOnly: true }, () => h(DateTimeInput, { defaultValue: min })),
        }),
        { global: { stubs: panel } },
      ),
    );
    const input = wrapper.findComponent(DateTimeInput);
    expect(input.get('input[type=text]').attributes('readonly')).toBeDefined();
    expect(input.get('button').attributes('disabled')).toBeDefined();
    input.findComponent(TimeColumns).vm.$emit('update:modelValue', Temporal.PlainTime.from('11:00'));
    expect(input.emitted('update:modelValue')).toBeUndefined();
  });
  it.each([0, -1, 0.1, NaN, Infinity])('bounds minute generation for invalid step %s', (step) => {
    const wrapper = track(mount(TimeColumns, { props: { modelValue: null, minuteStep: step } }));
    expect(wrapper.findAll('[aria-label=Minutes] button')).toHaveLength(12);
  });
  it('offers boundary minutes, disables invalid hours, and navigates from two tab stops', async () => {
    const wrapper = track(
      mount(TimeColumns, {
        props: { modelValue: min.toPlainTime(), min: min.toPlainTime(), max: max.toPlainTime(), minuteStep: 5 },
      }),
    );
    const hours = wrapper.get('[aria-label=Hours]');
    expect(wrapper.findAll('button').every((button) => button.attributes('tabindex') === '-1')).toBe(true);
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(2);
    expect(wrapper.get('[aria-label=Minutes]').text()).toContain('32');
    expect(wrapper.findAll('[aria-label=Hours] button')[9]?.attributes('disabled')).toBeDefined();
    await hours.trigger('keydown', { key: 'ArrowDown' });
    expect(hours.attributes('aria-activedescendant')).toMatch(/-h-11$/);
    await hours.trigger('keydown', { key: 'Enter' });
    expect((wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Temporal.PlainTime).hour).toBe(11);
  });
  it('applies time bounds to both typed and popover-only controls', async () => {
    const props = { min: min.toPlainTime(), max: max.toPlainTime() };
    const input = track(mount(TimeInput, { props }));
    await input.get('input[type=text]').setValue('09:00');
    await input.get('input[type=text]').trigger('blur');
    expect(input.emitted('update:modelValue')).toBeUndefined();
    const picker = track(mount(TimePicker, { props, global: { stubs: panel } }));
    picker.findComponent(TimeColumns).vm.$emit('update:modelValue', Temporal.PlainTime.from('09:00'));
    expect(picker.emitted('update:modelValue')).toBeUndefined();
  });
});

describe('compound picker lifetime', () => {
  it('forwards native item attributes and handlers', async () => {
    let clicks = 0;
    const wrapper = track(
      mount(SelectPicker as Component, {
        slots: {
          default: () =>
            h(ListboxPicker, {}, () =>
              h(SelectPickerItem, { itemKey: 'a', label: 'A', 'data-marker': 'option', onClick: () => clicks++ }),
            ),
        },
      }),
    );
    await wrapper.get('[data-marker=option]').trigger('click');
    expect(clicks).toBe(1);
  });
  it('unregisters object keys and caches their distinct labels independently of serialization', async () => {
    const show = ref(true);
    const a = { id: 1 },
      b = { id: 2 };
    let context!: ReturnType<typeof useSelectContext>;
    const Probe = defineComponent({
      setup() {
        context = useSelectContext();
        return () => h('div');
      },
    });
    track(
      mount(
        defineComponent({
          setup: () => () =>
            h(SelectPicker as Component, {}, () => [
              h(Probe),
              h(ListboxPicker, {}, () =>
                show.value
                  ? [h(SelectPickerItem, { itemKey: a, label: 'A' }), h(SelectPickerItem, { itemKey: b, label: 'B' })]
                  : [],
              ),
            ]),
        }),
      ),
    );
    expect(context.items).toHaveLength(2);
    show.value = false;
    await nextTick();
    expect(context.items).toHaveLength(0);
    expect(context.getCachedLabel(a)).toBe('A');
    expect(context.getCachedLabel(b)).toBe('B');
  });
  it('blocks disabled, loading and read-only selection changes after opening', async () => {
    for (const inactive of ['isDisabled', 'isLoading', 'isReadOnly']) {
      const wrapper = track(
        mount(SelectPicker as Component, {
          props: { defaultOpen: true },
          slots: {
            default: () => [
              h(SelectPickerTrigger),
              h(SelectPickerContent, {}, () => h(SelectPickerItem, { itemKey: 'a', label: 'A' })),
            ],
          },
          global: { stubs: panel },
        }),
      );
      await wrapper.setProps({ [inactive]: true });
      await wrapper.get('[role=option]').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    }
  });
  it('reconciles active-descendant after items disappear or become disabled', async () => {
    const disabled = ref(false),
      show = ref(true);
    const wrapper = track(
      mount(
        defineComponent({
          setup: () => () =>
            h(ListboxPicker, {}, () => [
              show.value ? h(ListboxPickerItem, { value: 'a', isDisabled: disabled.value }, () => 'A') : null,
              h(ListboxPickerItem, { value: 'b' }, () => 'B'),
            ]),
        }),
      ),
    );
    await nextTick();
    const list = wrapper.get('[role=listbox]');
    const first = wrapper.findAll('[role=option]')[0]!.attributes('id');
    expect(list.attributes('aria-activedescendant')).toBe(first);
    disabled.value = true;
    await nextTick();
    await nextTick();
    expect(list.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role=option]')[1]!.attributes('id'));
    show.value = false;
    await nextTick();
    await nextTick();
    expect(wrapper.find('[id="' + list.attributes('aria-activedescendant') + '"]').exists()).toBe(true);
  });
});

it('keeps disabled mirrors out of native submission and respects external form association', () => {
  const wrapper = track(
    mount(
      {
        render: () =>
          h('main', [
            h('form', { id: 'external' }),
            h(SelectPicker as Component, { form: 'external', name: 'choice', modelValue: 'a' }, () =>
              h(SelectPickerTrigger),
            ),
            h(DateTimeInput, {
              form: 'external',
              name: 'date',
              disabled: true,
              modelValue: Temporal.PlainDateTime.from('2026-09-25T10:00'),
            }),
            h(ColorPicker, { form: 'external', name: 'color', isDisabled: true, modelValue: '#ff0000' }),
          ]),
      },
      { attachTo: document.body },
    ),
  );
  const data = new FormData(wrapper.get('form').element as HTMLFormElement);
  expect(data.get('choice')).toBe('a');
  expect(data.has('date')).toBe(false);
  expect(data.has('color')).toBe(false);
});

it('cancels abandoned sort drags and commits an accepted drop once', async () => {
  const wrapper = track(
    mount(SortableGroup, {
      slots: { default: () => [0, 1].map((index) => h(SortableGroupItem, { index }, () => h(SortableGroupHandle))) },
    }),
  );
  const rows = wrapper.findAll('[data-sortable-item]');
  await rows[0]!.get('button').trigger('pointerdown');
  await rows[0]!.trigger('dragstart');
  await rows[1]!.trigger('dragenter');
  await rows[0]!.trigger('dragend');
  expect(wrapper.emitted('reorder')).toBeUndefined();
  await rows[0]!.get('button').trigger('pointerdown');
  await rows[0]!.trigger('dragstart');
  await rows[1]!.trigger('drop');
  await rows[0]!.trigger('dragend');
  expect(wrapper.emitted('reorder')).toEqual([[0, 1]]);
});

it.each([{ isDisabled: true }, { isLoading: true }, { isReadOnly: true }])(
  'blocks inactive div-toggle keyboard activation %o',
  async (flags) => {
    const wrapper = track(mount(ToggleInput, { props: { as: 'div', ...flags }, slots: { default: () => 'Toggle' } }));
    await wrapper.get('[role=button]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  },
);
