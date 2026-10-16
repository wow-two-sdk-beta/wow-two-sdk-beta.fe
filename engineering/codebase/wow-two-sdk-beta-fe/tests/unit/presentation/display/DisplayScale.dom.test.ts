import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import DataTable from '@src/presentation/display/dataTable/DataTable.vue';
import Sparkline from '@src/presentation/display/sparkline/Sparkline.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('display data scale', () => {
  it('evaluates a table sort accessor once per row and preserves equal-key order', () => {
    const data = Array.from({ length: 128 }, (_, id) => ({ id, value: (id * 37) % 17 }));
    const accessor = vi.fn((row: unknown) => (row as { value: number }).value);
    const wrapper = mount(DataTable, {
      props: {
        data,
        columns: [{ key: 'value', header: 'Value', accessor, cell: (row: unknown) => (row as { id: number }).id }],
        defaultSortBy: { columnKey: 'value', direction: 'asc' },
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.findAll('tbody tr').map((row) => Number(row.text()))).toEqual(
      [...data].sort((a, b) => a.value - b.value).map((row) => row.id),
    );
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('plots a long line series without spreading it into function arguments', () => {
    const data = Array.from({ length: 150_000 }, (_, index) => index % 2);
    const wrapper = mount(Sparkline, { props: { data } });
    wrappers.push(wrapper);
    const path = wrapper.get('path').attributes('d');
    expect(path).toContain('M0,31');
    expect(path).toContain('L120,1');
    expect(path).not.toMatch(/NaN|Infinity/);
  });
});
