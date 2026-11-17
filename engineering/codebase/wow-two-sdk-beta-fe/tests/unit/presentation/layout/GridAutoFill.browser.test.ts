import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { Grid } from '@src/presentation/layout';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Counts the distinct column offsets the grid's items land on. */
function columnCount(grid: HTMLElement): number {
  return new Set([...grid.children].map((item) => Math.round(item.getBoundingClientRect().left))).size;
}

it.each([
  [1100, 4],
  [900, 3],
  [700, 2],
  [520, 1],
])('fits %i px into %i auto-fill columns of at least 16rem', async (width, columns) => {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: `width: ${width}px` }, [
          h(Grid, { minColumnWidth: '16rem', gap: '3' }, () =>
            Array.from({ length: 8 }, (_, i) => h('div', { 'data-item': i }, `Card ${i}`)),
          ),
        ]),
    },
    { attachTo: document.body },
  );
  const grid = wrapper.get('.grid').element as HTMLElement;
  expect(grid.style.getPropertyValue('--grid-min-column')).toBe('16rem');
  expect(columnCount(grid)).toBe(columns);
});

it('keeps the fixed column count when no minimum width is set', () => {
  wrapper = mount(Grid, {
    props: { columns: '3' },
    slots: { default: () => Array.from({ length: 6 }, (_, i) => h('div', `Card ${i}`)) },
    attrs: { style: 'width: 520px' },
    attachTo: document.body,
  });
  const grid = wrapper.element as HTMLElement;
  expect(grid.style.getPropertyValue('--grid-min-column')).toBe('');
  expect(columnCount(grid)).toBe(3);
});
