import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { RowsField, type RowsFieldColumn, type RowsFieldRow } from '@src/presentation/forms';

const columns: RowsFieldColumn[] = [
  { key: 'service', label: 'Service' },
  { key: 'path', label: 'Path' },
];

const rowsOf = (count: number): RowsFieldRow[] =>
  Array.from({ length: count }, (_, index) => ({ key: `r${index}`, index }));

function render(props: Record<string, unknown> = {}) {
  return mount(RowsField, {
    props: { label: 'Smoke checks', columns, rows: rowsOf(2), ...props },
    slots: {
      cell: ({ column, label }: { column: RowsFieldColumn; label: string }) =>
        h('input', { 'aria-label': label, 'data-key': column.key }),
    },
  });
}

describe('RowsField', () => {
  it('renders a legend, one heading per column and a cell per column in each row', () => {
    const wrapper = render();
    expect(wrapper.get('legend').text()).toBe('Smoke checks');
    expect(wrapper.findAll('[data-rows-headings] span').map((span) => span.text())).toEqual(['Service', 'Path', '']);
    expect(wrapper.findAll('[data-rows-row]')).toHaveLength(2);
    expect(wrapper.findAll('input').map((input) => input.attributes('aria-label'))).toEqual([
      'Service 1',
      'Path 1',
      'Service 2',
      'Path 2',
    ]);
  });

  it('labels each cell for phones, where the headings hide', () => {
    const wrapper = render();
    const cell = wrapper.get('[data-rows-cell]');
    expect(cell.get('span').text()).toBe('Service');
    expect(cell.get('span').classes()).toContain('sm:hidden');
    expect(wrapper.get('[data-rows-headings]').classes()).toEqual(expect.arrayContaining(['hidden', 'sm:grid']));
  });

  it('hides the headings while the list is empty', () => {
    expect(render({ rows: [] }).find('[data-rows-headings]').exists()).toBe(false);
  });

  it('emits add, and remove with the row index from a named control', async () => {
    const wrapper = render();
    const remove = wrapper.findAll('button').find((button) => button.attributes('aria-label') === 'Remove row 2')!;
    await remove.trigger('click');
    await wrapper.findAll('button').at(-1)!.trigger('click');
    expect(wrapper.emitted('remove')).toEqual([[1]]);
    expect(wrapper.emitted('add')).toEqual([[]]);
    expect(wrapper.findAll('button').at(-1)!.text()).toBe('Add row');
  });

  it('shows the list refusals as alerts', () => {
    const wrapper = render({ errors: ['Add at least one check.'] });
    expect(wrapper.get('[role=alert]').text()).toBe('Add at least one check.');
  });

  it('keeps a cell bound to its row through a removal', async () => {
    const Host = defineComponent({
      setup() {
        const rows = ref(rowsOf(3));
        const remove = (index: number) => {
          rows.value = rows.value.filter((row) => row.index !== index).map((row, at) => ({ ...row, index: at }));
        };
        return () =>
          h(
            RowsField,
            { label: 'Rows', columns: [columns[0]!], rows: rows.value, onRemove: remove },
            { cell: ({ row }: { row: RowsFieldRow }) => h('input', { 'data-row': row.key }) },
          );
      },
    });
    const wrapper = mount(Host);
    await wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label') === 'Remove row 1')!
      .trigger('click');
    expect(wrapper.findAll('input').map((input) => input.attributes('data-row'))).toEqual(['r1', 'r2']);
  });

  it('disables both controls and takes localized text', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(
            LocaleProvider,
            { messages: { 'RowsField.addLabel': 'Добавить', 'RowsField.removeLabel': 'Убрать {row}' } },
            () => h(RowsField, { label: 'x', columns, rows: rowsOf(1), isDisabled: true }, { cell: () => h('input') }),
          ),
      }),
    );
    const buttons = wrapper.findAll('button');
    expect(buttons.map((button) => button.attributes('disabled') !== undefined)).toEqual([true, true]);
    expect(buttons[0]!.attributes('aria-label')).toBe('Убрать 1');
    expect(buttons[1]!.text()).toBe('Добавить');
  });
});
