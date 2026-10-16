import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TablePhoneLayout,
  TableRow,
  type DataTableColumn,
} from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

const heading = ref('Name');

function mountTable(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(Table, props, () => [
          h(TableHead, null, () =>
            h(TableRow, null, () => [
              h(TableHeaderCell, null, () => heading.value),
              h(TableHeaderCell, null, () => h('span', null, [' Monthly ', h('b', null, 'spend')])),
              h(TableHeaderCell, null, () => 'Region'),
            ]),
          ),
          h(TableBody, null, () => [
            h(TableRow, null, () => [
              h(TableHeaderCell, { scope: 'row' }, () => 'Acme'),
              h(TableCell, null, () => '$120'),
              h(TableCell, { label: 'Area' }, () => 'EU'),
            ]),
            h(TableRow, null, () => h(TableCell, { colspan: 3 }, () => 'Notes')),
          ]),
          h(TableFooter, null, () =>
            h(TableRow, null, () => [
              h(TableCell, null, () => 'Total'),
              h(TableCell, null, () => '$120'),
              h(TableCell, { label: '' }, () => ''),
            ]),
          ),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return wrapper;
}

const cells = (wrapper: VueWrapper, selector: string): HTMLElement[] => [
  ...(wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(selector),
];

describe('Table stacking', () => {
  it('stacks below md by default and marks every part with the breakpoint', () => {
    const wrapper = mountTable();
    expect((wrapper.element as HTMLElement).dataset.stack).toBe('md');
    for (const selector of ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']) {
      const parts = cells(wrapper, selector);
      expect(parts.length).toBeGreaterThan(0);
      expect(parts.every((node) => node.dataset.stack === 'md')).toBe(true);
    }
  });

  it('restates the table roles while it stacks', () => {
    const wrapper = mountTable({ stackBreakpoint: 'lg' });
    const root = wrapper.element as HTMLElement;
    expect(root.querySelector('table')!.getAttribute('role')).toBe('table');
    expect(cells(wrapper, 'thead, tbody, tfoot').map((node) => node.getAttribute('role'))).toEqual([
      'rowgroup',
      'rowgroup',
      'rowgroup',
    ]);
    expect(cells(wrapper, 'tr').every((node) => node.getAttribute('role') === 'row')).toBe(true);
    expect(cells(wrapper, 'thead th').every((node) => node.getAttribute('role') === 'columnheader')).toBe(true);
    expect(root.querySelector('tbody th')!.getAttribute('role')).toBe('rowheader');
    expect(cells(wrapper, 'td').every((node) => node.getAttribute('role') === 'cell')).toBe(true);
    expect(cells(wrapper, '[data-stack]').every((node) => node.dataset.stack === 'lg')).toBe(true);
  });

  it('keeps the plain table and its sideways scroll when asked', () => {
    const wrapper = mountTable({ phoneLayout: TablePhoneLayout.Scroll });
    expect(cells(wrapper, '[data-stack]')).toHaveLength(0);
    expect(cells(wrapper, '[role]')).toHaveLength(0);
    expect((wrapper.element as HTMLElement).hasAttribute('data-stack')).toBe(false);
    expect((wrapper.element as HTMLElement).className).toContain('overflow-x-auto');
  });

  it('labels each cell from its column header, and leaves fixed and spanning cells alone', () => {
    const wrapper = mountTable();
    const [rowHeader, spend, region] = cells(wrapper, 'tbody tr:first-child > *');
    expect(rowHeader!.dataset.label).toBe('Name');
    expect(spend!.dataset.label).toBe('Monthly spend');
    expect(region!.dataset.label).toBe('Area');
    expect(cells(wrapper, 'td[colspan]')[0]!.hasAttribute('data-label')).toBe(false);
    const [total, sum, blank] = cells(wrapper, 'tfoot td');
    expect([total!.dataset.label, sum!.dataset.label]).toEqual(['Name', 'Monthly spend']);
    expect(blank!.hasAttribute('data-label')).toBe(false);
  });

  it('follows a header that changes', async () => {
    const wrapper = mountTable();
    heading.value = 'Company';
    await nextTick();
    await expect.poll(() => cells(wrapper, 'tbody th')[0]!.dataset.label).toBe('Company');
    heading.value = 'Name';
  });

  it('turns rows into cards and keeps the head for its controls', () => {
    const wrapper = mountTable();
    expect(cells(wrapper, 'tbody tr')[0]!.className).toContain('table-stacked:rounded-lg');
    expect(cells(wrapper, 'thead tr')[0]!.className).toContain('table-stacked:flex-wrap');
    expect(cells(wrapper, 'thead')[0]!.className).toContain('table-stacked:[&:not(:has(button');
    expect(cells(wrapper, 'td')[0]!.className).toContain('table-stacked:data-label:before:content-[attr(data-label)]');
  });
});

interface Invoice {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
}

const invoices: ReadonlyArray<Invoice> = [
  { id: 'a', customer: 'Acme', amount: 120 },
  { id: 'b', customer: 'Globex', amount: 80 },
];

const columns: ReadonlyArray<DataTableColumn<Invoice>> = [
  { key: 'customer', header: 'Customer', accessor: (row) => row.customer, isSortable: true },
  { key: 'amount', header: 'Amount', accessor: (row) => row.amount, align: 'right' },
];

describe('DataTable stacking', () => {
  function mountData(props: Record<string, unknown> = {}): VueWrapper {
    const wrapper = mount(DataTable as unknown as Component, {
      props: { columns, data: invoices, rowKey: (row: Invoice) => row.id, ...props },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  it('labels value cells from the column headers on the first render', () => {
    const wrapper = mountData({ selectionMode: 'multiple' });
    const first = cells(wrapper, 'tbody tr:first-child td');
    expect(first.map((cell) => cell.dataset.label ?? null)).toEqual([null, 'Customer', 'Amount']);
    expect(first[0]!.className).toContain('table-stacked:inline-flex');
    expect(first.every((cell) => cell.hasAttribute('data-fixed-label'))).toBe(true);
  });

  it('forwards the layout and breakpoint', () => {
    const wrapper = mountData({ phoneLayout: 'scroll' });
    expect(cells(wrapper, '[data-stack]')).toHaveLength(0);
    const stacked = mountData({ stackBreakpoint: 'sm' });
    expect(cells(stacked, 'td').every((cell) => cell.dataset.stack === 'sm')).toBe(true);
  });

  it('keeps sort state and selection on the stacked parts', async () => {
    const wrapper = mountData({ selectionMode: 'multiple', defaultSelection: ['b'] });
    const sortable = cells(wrapper, 'thead th').find((cell) => cell.textContent?.includes('Customer'))!;
    expect(sortable.getAttribute('aria-sort')).toBe('none');
    expect(sortable.getAttribute('role')).toBe('columnheader');
    sortable.querySelector('button')!.click();
    await nextTick();
    expect(sortable.getAttribute('aria-sort')).toBe('ascending');
    const selected = cells(wrapper, 'tbody tr').find((row) => row.getAttribute('aria-selected') === 'true')!;
    expect(selected.getAttribute('role')).toBe('row');
    expect(selected.textContent).toContain('Globex');
  });
});
