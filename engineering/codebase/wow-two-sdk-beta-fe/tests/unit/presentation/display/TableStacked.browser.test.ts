import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { page, userEvent } from 'vitest/browser';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type DataTableColumn,
} from '@src/presentation/display';
import '@src/index.css';

interface Invoice {
  readonly id: string;
  readonly customer: string;
  readonly region: string;
  readonly amount: number;
}

const invoices: ReadonlyArray<Invoice> = Array.from({ length: 12 }, (_, index) => ({
  id: `i${index}`,
  customer: ['Globex', 'Acme', 'Initech', 'Umbrella'][index % 4]!,
  region: index % 2 ? 'North America' : 'Europe',
  amount: 100 + index,
}));

const columns: ReadonlyArray<DataTableColumn<Invoice>> = [
  { key: 'customer', header: 'Customer', accessor: (row) => row.customer, isSortable: true },
  { key: 'region', header: 'Region', accessor: (row) => row.region },
  { key: 'amount', header: 'Amount', accessor: (row) => row.amount, align: 'right' },
];

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

function mountRaw(props: Record<string, unknown> = {}): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h(Table, props, () => [
          h(TableHead, null, () =>
            h(TableRow, null, () =>
              ['Name', 'Region', 'Owner', 'Created', 'Amount'].map((name) => h(TableHeaderCell, null, () => name)),
            ),
          ),
          h(TableBody, null, () =>
            invoices
              .slice(0, 3)
              .map((invoice) =>
                h(TableRow, { key: invoice.id }, () => [
                  h(TableCell, null, () => invoice.customer),
                  h(TableCell, null, () => invoice.region),
                  h(TableCell, null, () => 'operations@example.com'),
                  h(TableCell, null, () => '2026-10-15'),
                  h(TableCell, null, () => `$${invoice.amount}`),
                ]),
              ),
          ),
        ]),
    },
    { attachTo: document.body },
  );
  return wrapper.element as HTMLElement;
}

function mountData(props: Record<string, unknown> = {}): HTMLElement {
  wrapper = mount(DataTable as unknown as Component, {
    props: { columns, data: invoices, rowKey: (row: Invoice) => row.id, ...props },
    attachTo: document.body,
  });
  return wrapper.element as HTMLElement;
}

const rows = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('tbody > tr')];

/** Where a cell's own text starts — past its label column when the label renders. */
function textLeft(cell: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(cell);
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
  return Math.round(Math.min(...rects.map((rect) => rect.left)));
}

describe('below the stack breakpoint', () => {
  beforeAll(async () => {
    await page.viewport(375, 812);
  });

  it('turns each row into a card of labelled values with no sideways scroll', async () => {
    const root = mountRaw();
    await nextTick();
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const [first, second] = rows(root);
    expect(getComputedStyle(first!).display).toBe('block');
    expect(Math.round(second!.getBoundingClientRect().top)).toBeGreaterThan(
      Math.round(first!.getBoundingClientRect().bottom),
    );
    const cell = first!.querySelectorAll<HTMLElement>('td')[1]!;
    expect(cell.dataset.label).toBe('Region');
    expect(getComputedStyle(cell, '::before').content).not.toMatch(/^(none|normal)$/);
    const box = cell.getBoundingClientRect();
    expect(textLeft(cell)).toBeGreaterThan(Math.round(box.left + box.width * 0.35));
    expect(Math.round(cell.getBoundingClientRect().width)).toBe(Math.round(first!.getBoundingClientRect().width) - 2);
  });

  it('keeps the header in the accessibility tree while hiding a head with no controls', async () => {
    const root = mountRaw();
    await nextTick();
    const head = root.querySelector<HTMLElement>('thead')!;
    expect(Math.round(head.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
    expect(head.querySelectorAll('th')).toHaveLength(5);
    expect(root.querySelector('table')!.getAttribute('role')).toBe('table');
  });

  it('keeps sorting and select-all in a bar above the cards', async () => {
    const root = mountData({ selectionMode: 'multiple' });
    await nextTick();
    const sort = root.querySelector<HTMLElement>('thead button')!;
    expect(sort.getBoundingClientRect().height).toBeGreaterThan(0);
    const selectAll = root.querySelector<HTMLInputElement>('thead input[type=checkbox]')!;
    expect(selectAll.getBoundingClientRect().width).toBeGreaterThan(0);
    await userEvent.click(sort);
    await expect.poll(() => sort.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
    expect(rows(root)[0]!.textContent).toContain('Acme');
    const checkbox = rows(root)[0]!.querySelector<HTMLInputElement>('input[type=checkbox]')!;
    /* A DOM click: Firefox names stacked rows with their cell labels, so a generated row locator never resolves. */
    checkbox.click();
    await expect.poll(() => rows(root)[0]!.getAttribute('aria-selected')).toBe('true');
    /* The control cell heads the card without a label of its own. */
    expect(checkbox.closest('td')!.hasAttribute('data-label')).toBe(false);
  });

  it('pins the control bar while the cards scroll under it', async () => {
    const root = mountData({ hasStickyHeader: true, containerClassName: 'max-h-80 overflow-y-auto' });
    await nextTick();
    const head = root.querySelector<HTMLElement>('thead')!;
    root.scrollTop = 400;
    await expect.poll(() => Math.round(root.scrollTop)).toBe(400);
    expect(Math.abs(head.getBoundingClientRect().top - root.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
  });

  it('keeps the table and scrolls it sideways when asked', async () => {
    const root = mountRaw({ phoneLayout: 'scroll' });
    await nextTick();
    expect(getComputedStyle(root.querySelector('table')!).display).toBe('table');
    expect(getComputedStyle(rows(root)[0]!).display).toBe('table-row');
    expect(root.scrollWidth).toBeGreaterThan(root.clientWidth);
  });
});

describe('from the stack breakpoint up', () => {
  beforeAll(async () => {
    await page.viewport(1024, 768);
  });

  it('renders the plain table with its header row', async () => {
    const root = mountData();
    await nextTick();
    expect(getComputedStyle(root.querySelector('table')!).display).toBe('table');
    expect(getComputedStyle(rows(root)[0]!).display).toBe('table-row');
    const cell = rows(root)[0]!.querySelector<HTMLElement>('td')!;
    expect(getComputedStyle(cell).display).toBe('table-cell');
    expect(getComputedStyle(cell, '::before').content).toMatch(/^(none|normal)$/);
    expect(root.querySelector<HTMLElement>('thead')!.getBoundingClientRect().height).toBeGreaterThan(20);
  });
});
