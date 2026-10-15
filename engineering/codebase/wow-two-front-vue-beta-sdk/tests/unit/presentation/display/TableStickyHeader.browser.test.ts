import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@src/presentation/display';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

async function mountTable(hasStickyHeader: boolean): Promise<{ head: HTMLElement; scroller: HTMLElement }> {
  wrapper = mount(
    {
      render: () =>
        h(Table, { hasStickyHeader, containerClassName: 'max-h-40 overflow-y-auto' }, () => [
          h(TableHead, null, () => h(TableRow, null, () => h(TableHeaderCell, null, () => 'Name'))),
          h(TableBody, null, () =>
            Array.from({ length: 30 }, (_, index) =>
              h(TableRow, { key: index }, () => h(TableCell, null, () => `Row ${index}`)),
            ),
          ),
        ]),
    },
    { attachTo: document.body },
  );
  await nextTick();
  const head = document.querySelector<HTMLElement>('thead')!;
  return { head, scroller: head.closest('table')!.parentElement! };
}

it('pins an opaque header while the body scrolls', async () => {
  const { head, scroller } = await mountTable(true);
  scroller.scrollTop = 200;
  await expect.poll(() => scroller.scrollTop).toBe(200);
  expect(Math.round(head.getBoundingClientRect().top)).toBe(Math.round(scroller.getBoundingClientRect().top + 1));
  const opaque = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'bg-muted' }));
  expect(getComputedStyle(head).backgroundColor).toBe(getComputedStyle(opaque).backgroundColor);
});

it('lets the header scroll away without the option', async () => {
  const { head, scroller } = await mountTable(false);
  scroller.scrollTop = 200;
  await expect.poll(() => scroller.scrollTop).toBe(200);
  expect(head.getBoundingClientRect().bottom).toBeLessThan(scroller.getBoundingClientRect().top);
});
